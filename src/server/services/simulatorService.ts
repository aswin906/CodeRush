import { db } from '../db.js';
import { computeDegradation } from './degradationEngine.js';
import { createAuditLog } from './auditService.js';
import { evaluateAndCreateOffers, expireStaleOffers } from './offerLifecycleService.js';

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
      }
    }
  });

  if (!shipment) {
    throw new Error(`Shipment with ID ${shipmentId} not found`);
  }

  const { produceType, telemetryRecords } = shipment;
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

  // 4. Evaluate Dynamic Liquidation Discount Engine (includes expiry + dedup + concurrency guard)
  const offerResult = await evaluateAndCreateOffers(
    shipmentId,
    updatedShipment.remainingShelfLifeHours,
    updatedShipment.consumedFraction
  );

  return {
    telemetry: newTelemetry,
    shipment: updatedShipment,
    degradationResult,
    createdOffersCount: offerResult.createdCount,
    offerResult
  };
}

function seededRandom(seedStr: string, step: number): number {
  let hash = 0;
  const combined = `${seedStr}:${step}`;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

export function generateSyntheticTelemetry(
  scenario: string,
  tempRef: number,
  rhMin: number,
  rhMax: number,
  currentRecordsCount: number,
  simSeed: string = 'agro-seed-1'
) {
  const rhOptimal = (rhMin + rhMax) / 2.0;
  let temperature = tempRef;
  let humidity = rhOptimal;

  const randNoise1 = seededRandom(simSeed, currentRecordsCount * 2) * 0.4 - 0.2;
  const randNoise2 = seededRandom(simSeed, currentRecordsCount * 2 + 1) * 1.5 - 0.75;

  switch (scenario) {
    case 'gradual_warmup': {
      // Temperature rises steadily over time
      const tempIncrease = Math.min(20, currentRecordsCount * 0.8);
      temperature = tempRef + tempIncrease + randNoise1;
      humidity = Math.max(60, rhOptimal - (currentRecordsCount * 0.5));
      break;
    }
    case 'sudden_excursion': {
      // Sudden cooling unit failure after initial 2 records
      if (currentRecordsCount >= 2) {
        temperature = tempRef + 16.0 + (seededRandom(simSeed, currentRecordsCount * 3) * 2.0 - 1.0);
        humidity = Math.max(55, rhOptimal - 20.0);
      } else {
        temperature = tempRef + randNoise1;
      }
      break;
    }
    case 'door_open_spike': {
      // Periodic temperature spikes every 3 steps
      if (currentRecordsCount % 3 === 0 && currentRecordsCount > 0) {
        temperature = tempRef + 9.5 + seededRandom(simSeed, currentRecordsCount * 4);
        humidity = rhOptimal - 10.0;
      } else {
        temperature = tempRef + randNoise1;
      }
      break;
    }
    case 'stable':
    default: {
      temperature = tempRef + randNoise1;
      humidity = rhOptimal + randNoise2;
      break;
    }
  }

  return {
    temperature: parseFloat(temperature.toFixed(1)),
    humidity: parseFloat(humidity.toFixed(1))
  };
}

export async function tickShipmentSimulation(shipmentId: string, force = false) {
  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    include: {
      produceType: true,
      telemetryRecords: true
    }
  });

  if (!shipment) {
    return null;
  }

  // Bypass simulating toggle check if manually forced by user tick action
  if (!force && !shipment.simulating) {
    return null;
  }

  const synthetic = generateSyntheticTelemetry(
    shipment.scenario,
    shipment.produceType.tempRef,
    shipment.produceType.rhMin,
    shipment.produceType.rhMax,
    shipment.telemetryRecords.length,
    shipment.simSeed || shipment.trackingNumber
  );

  return await processTelemetryIngestion(shipmentId, {
    temperature: synthetic.temperature,
    humidity: synthetic.humidity,
    timestamp: new Date()
  });
}

export async function tickAllSimulations(force = true) {
  const activeShipments = await db.shipment.findMany({
    where: {
      status: { notIn: ['EXPIRED'] }
    }
  });

  const results = [];
  for (const s of activeShipments) {
    try {
      const res = await tickShipmentSimulation(s.id, force);
      if (res) results.push(res);
    } catch (err) {
      console.error(`Simulation tick failed for shipment ${s.id}:`, err);
    }
  }
  return results;
}

/**
 * Runs expiry pass across ALL active LIQUIDATING shipments.
 * Called by the cron route before ticking simulations.
 */
export async function expireAllStaleOffers(): Promise<number> {
  const liquidatingShipments = await db.shipment.findMany({
    where: { status: 'LIQUIDATING' }
  });

  let total = 0;
  for (const s of liquidatingShipments) {
    try {
      total += await expireStaleOffers(s.id);
    } catch (err) {
      console.error(`Expiry pass failed for shipment ${s.id}:`, err);
    }
  }
  return total;
}
