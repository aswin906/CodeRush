import { db } from '../db.js';
import { computeDegradation } from './degradationEngine.js';
import { calculateDiscountTier } from './discountEngine.js';
import { createAuditLog } from './auditService.js';

export interface IngestTelemetryPayload {
  temperature: number;
  humidity: number;
  timestamp?: string | Date;
  transitTimeHours?: number;
}

export async function processTelemetryIngestion(shipmentId: string, payload: IngestTelemetryPayload) {
  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      produceType: true,
      telemetryRecords: {
        orderBy: { timestamp: 'desc' },
        take: 1
      },
      discountOffers: true
    }
  });

  if (!shipment) {
    throw new Error(`Shipment with ID ${shipmentId} not found`);
  }

  const { produceType, telemetryRecords, discountOffers } = shipment;
  const lastRecord = telemetryRecords[0];

  const now = payload.timestamp ? new Date(payload.timestamp) : new Date();
  
  // Calculate elapsed time step in hours
  let dtHours = 1.0; // Default step size 1 hour if first record
  let elapsedTransitTime = 1.0;

  if (lastRecord) {
    const timeDiffMs = now.getTime() - new Date(lastRecord.timestamp).getTime();
    dtHours = Math.max(0.05, timeDiffMs / (1000 * 3600)); // Minimum 3 mins
    elapsedTransitTime = (payload.transitTimeHours !== undefined) 
      ? payload.transitTimeHours 
      : lastRecord.transitTimeHours + dtHours;
  } else if (payload.transitTimeHours !== undefined) {
    elapsedTransitTime = payload.transitTimeHours;
  }

  // Run degradation model calculation
  const degradationResult = computeDegradation({
    temperature: payload.temperature,
    humidity: payload.humidity,
    dtHours,
    currentConsumedFraction: shipment.consumedFraction,
    produceParams: {
      tempRef: produceType.tempRef,
      shelfLifeRef: produceType.shelfLifeRef,
      q10: produceType.q10,
      rhMin: produceType.rhMin,
      rhMax: produceType.rhMax,
      rhPenaltyCoeff: produceType.rhPenaltyCoeff
    }
  });

  // Determine updated status
  let updatedStatus: 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'EXPIRED' | 'LIQUIDATING' | 'LIQUIDATED' = degradationResult.status;
  if (shipment.status === 'LIQUIDATED') {
    updatedStatus = 'LIQUIDATED';
  } else if (shipment.status === 'LIQUIDATING' && degradationResult.status !== 'EXPIRED') {
    updatedStatus = 'LIQUIDATING';
  }

  // 1. Save Telemetry Record
  const newTelemetry = await db.telemetryRecord.create({
    data: {
      shipmentId,
      timestamp: now,
      temperature: payload.temperature,
      humidity: payload.humidity,
      transitTimeHours: parseFloat(elapsedTransitTime.toFixed(2)),
      consumedFractionStep: parseFloat(degradationResult.stepFraction.toFixed(5)),
      cumulativeConsumedFraction: parseFloat(degradationResult.cumulativeConsumedFraction.toFixed(5)),
      remainingShelfLifeHours: parseFloat(degradationResult.remainingShelfLifeHours.toFixed(2))
    }
  });

  // 2. Update Shipment
  const updatedShipment = await db.shipment.update({
    where: { id: shipmentId },
    data: {
      remainingShelfLifeHours: parseFloat(degradationResult.remainingShelfLifeHours.toFixed(2)),
      consumedFraction: parseFloat(degradationResult.cumulativeConsumedFraction.toFixed(5)),
      status: updatedStatus
    },
    include: { produceType: true }
  });

  // 3. Write Audit Log for Model Recalculation
  await createAuditLog(
    'MODEL_RECALCULATED',
    `Telemetry ingested for ${shipment.trackingNumber}: T=${payload.temperature}°C, RH=${payload.humidity}%. Remaining: ${updatedShipment.remainingShelfLifeHours.toFixed(1)}h`,
    {
      temperature: payload.temperature,
      humidity: payload.humidity,
      dtHours: parseFloat(dtHours.toFixed(3)),
      stepFraction: degradationResult.stepFraction,
      cumulativeConsumedFraction: degradationResult.cumulativeConsumedFraction,
      remainingShelfLifeHours: updatedShipment.remainingShelfLifeHours,
      status: updatedStatus
    },
    shipmentId
  );

  // 4. Evaluate Dynamic Liquidation Discount Engine
  const discountEval = calculateDiscountTier({
    remainingShelfLifeHours: updatedShipment.remainingShelfLifeHours,
    initialShelfLifeHours: shipment.initialShelfLifeHours,
    consumedFraction: updatedShipment.consumedFraction,
    originalPricePerKg: shipment.initialPricePerKg
  });

  let createdOffersCount = 0;

  if (discountEval.triggered && shipment.status !== 'LIQUIDATED') {
    // Find matching retailers who prefer this produce type or all general retailers
    const retailers = await db.retailer.findMany();
    const eligibleRetailers = retailers.filter(r => 
      r.preferredProduceTypes.includes(produceType.id) || r.preferredProduceTypes === ''
    );

    const targetRetailers = eligibleRetailers.length > 0 ? eligibleRetailers : retailers;

    // Check if offer already created at this discount tier
    const existingOfferAtTier = discountOffers.find(o => o.discountPercent === discountEval.discountPercent);

    if (!existingOfferAtTier) {
      for (const retailer of targetRetailers) {
        await db.discountOffer.create({
          data: {
            shipmentId,
            retailerId: retailer.id,
            discountPercent: discountEval.discountPercent,
            originalPricePerKg: shipment.initialPricePerKg,
            discountedPricePerKg: discountEval.discountedPricePerKg,
            remainingShelfLifeHoursAtOffer: updatedShipment.remainingShelfLifeHours,
            status: 'PENDING'
          }
        });
        createdOffersCount++;
      }

      // Update shipment status to LIQUIDATING
      await db.shipment.update({
        where: { id: shipmentId },
        data: { status: 'LIQUIDATING' }
      });

      await createAuditLog(
        'DISCOUNT_TRIGGERED',
        `Automated ${discountEval.discountPercent}% Liquidation Offer generated for ${shipment.trackingNumber}`,
        {
          discountPercent: discountEval.discountPercent,
          tierName: discountEval.tierName,
          originalPrice: shipment.initialPricePerKg,
          discountedPrice: discountEval.discountedPricePerKg,
          remainingShelfLifeHours: updatedShipment.remainingShelfLifeHours,
          notifiedRetailerIds: targetRetailers.map(r => r.name)
        },
        shipmentId
      );
    }
  }

  return {
    telemetry: newTelemetry,
    shipment: updatedShipment,
    degradationResult,
    discountTier: discountEval,
    createdOffersCount
  };
}

export function generateSyntheticTelemetry(
  scenario: string,
  tempRef: number,
  rhMin: number,
  rhMax: number,
  currentRecordsCount: number
) {
  const rhOptimal = (rhMin + rhMax) / 2.0;
  let temperature = tempRef;
  let humidity = rhOptimal;

  switch (scenario) {
    case 'gradual_warmup': {
      // Temperature rises steadily over time
      const tempIncrease = Math.min(20, currentRecordsCount * 0.8);
      temperature = tempRef + tempIncrease + (Math.random() * 0.4 - 0.2);
      humidity = Math.max(60, rhOptimal - (currentRecordsCount * 0.5));
      break;
    }
    case 'sudden_excursion': {
      // Sudden cooling unit failure after initial 2 records
      if (currentRecordsCount >= 2) {
        temperature = tempRef + 16.0 + (Math.random() * 2.0 - 1.0);
        humidity = Math.max(55, rhOptimal - 20.0);
      } else {
        temperature = tempRef + (Math.random() * 0.6 - 0.3);
      }
      break;
    }
    case 'door_open_spike': {
      // Periodic temperature spikes every 3 steps
      if (currentRecordsCount % 3 === 0 && currentRecordsCount > 0) {
        temperature = tempRef + 9.5 + (Math.random() * 1.0);
        humidity = rhOptimal - 10.0;
      } else {
        temperature = tempRef + (Math.random() * 0.4 - 0.2);
      }
      break;
    }
    case 'stable':
    default: {
      temperature = tempRef + (Math.random() * 0.4 - 0.2);
      humidity = rhOptimal + (Math.random() * 1.5 - 0.75);
      break;
    }
  }

  return {
    temperature: parseFloat(temperature.toFixed(1)),
    humidity: parseFloat(humidity.toFixed(1))
  };
}

export async function tickShipmentSimulation(shipmentId: string) {
  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      produceType: true,
      telemetryRecords: true
    }
  });

  if (!shipment || !shipment.simulating) {
    return null;
  }

  const synthetic = generateSyntheticTelemetry(
    shipment.scenario,
    shipment.produceType.tempRef,
    shipment.produceType.rhMin,
    shipment.produceType.rhMax,
    shipment.telemetryRecords.length
  );

  return await processTelemetryIngestion(shipmentId, {
    temperature: synthetic.temperature,
    humidity: synthetic.humidity,
    timestamp: new Date()
  });
}

export async function tickAllSimulations() {
  const activeShipments = await db.shipment.findMany({
    where: {
      simulating: true,
      status: { notIn: ['EXPIRED', 'LIQUIDATED'] }
    }
  });

  const results = [];
  for (const s of activeShipments) {
    try {
      const res = await tickShipmentSimulation(s.id);
      if (res) results.push(res);
    } catch (err) {
      console.error(`Simulation tick failed for shipment ${s.id}:`, err);
    }
  }
  return results;
}
