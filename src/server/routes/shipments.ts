import { Router } from 'express';
import { db } from '../db.js';
import { CreateShipmentSchema, ToggleSimulatorSchema } from '../validators/schemas.js';
import { createAuditLog } from '../services/auditService.js';

const router = Router();

// GET all shipments
router.get('/', async (_req, res) => {
  try {
    const shipments = await db.shipment.findMany({
      include: {
        produceType: true,
        telemetryRecords: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        discountOffers: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(shipments);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch shipments' });
  }
});

// GET shipment by ID
router.get('/:id', async (req, res) => {
  try {
    const shipment = await db.shipment.findUnique({
      where: { id: req.params.id },
      include: {
        produceType: true,
        telemetryRecords: {
          orderBy: { timestamp: 'asc' }
        },
        discountOffers: {
          include: { retailer: true },
          orderBy: { createdAt: 'desc' }
        },
        auditLogs: {
          orderBy: { timestamp: 'desc' }
        }
      }
    });
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    return res.json(shipment);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch shipment details' });
  }
});

// POST create shipment
router.post('/', async (req, res) => {
  try {
    const parsed = CreateShipmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const produce = await db.produceType.findUnique({
      where: { id: parsed.data.produceTypeId }
    });

    if (!produce) {
      return res.status(404).json({ error: 'Produce type not found' });
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const trackingNumber = `AGRO-${randomSuffix}-${produce.id.substring(0, 3).toUpperCase()}`;

    const stockQty = parsed.data.initialQuantityKg ?? parsed.data.quantityKg;

    const newShipment = await db.shipment.create({
      data: {
        trackingNumber,
        produceTypeId: produce.id,
        origin: parsed.data.origin,
        destination: parsed.data.destination,
        quantityKg: parsed.data.quantityKg,
        initialQuantityKg: stockQty,
        availableQuantityKg: stockQty,
        initialPricePerKg: parsed.data.initialPricePerKg,
        status: 'OPTIMAL',
        scenario: parsed.data.scenario,
        initialShelfLifeHours: produce.shelfLifeRef,
        remainingShelfLifeHours: produce.shelfLifeRef,
        consumedFraction: 0.0,
        simulating: parsed.data.simulating,
        simIntervalSeconds: parsed.data.simIntervalSeconds
      },
      include: { produceType: true }
    });

    // Create initial baseline telemetry point
    const initialTemp = produce.tempRef + (Math.random() * 0.4 - 0.2);
    const initialRh = (produce.rhMin + produce.rhMax) / 2.0;

    await db.telemetryRecord.create({
      data: {
        shipmentId: newShipment.id,
        timestamp: new Date(),
        temperature: parseFloat(initialTemp.toFixed(1)),
        humidity: parseFloat(initialRh.toFixed(1)),
        transitTimeHours: 0.0,
        consumedFractionStep: 0.0,
        cumulativeConsumedFraction: 0.0,
        remainingShelfLifeHours: produce.shelfLifeRef
      }
    });

    await createAuditLog(
      'SHIPMENT_CREATED',
      `New shipment ${newShipment.trackingNumber} (${produce.name}) registered`,
      {
        trackingNumber: newShipment.trackingNumber,
        produceType: produce.name,
        origin: newShipment.origin,
        destination: newShipment.destination,
        quantityKg: newShipment.quantityKg,
        scenario: newShipment.scenario
      },
      newShipment.id
    );

    return res.status(201).json(newShipment);
  } catch (error) {
    console.error('Create shipment error:', error);
    return res.status(500).json({ error: 'Failed to create shipment' });
  }
});

// PATCH update simulator parameters for a shipment
router.patch('/:id/simulator', async (req, res) => {
  try {
    const parsed = ToggleSimulatorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const shipment = await db.shipment.findUnique({
      where: { id: req.params.id }
    });

    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }

    const updated = await db.shipment.update({
      where: { id: req.params.id },
      data: {
        simulating: parsed.data.simulating,
        ...(parsed.data.scenario ? { scenario: parsed.data.scenario } : {}),
        ...(parsed.data.simIntervalSeconds ? { simIntervalSeconds: parsed.data.simIntervalSeconds } : {})
      },
      include: { produceType: true }
    });

    await createAuditLog(
      'SIMULATOR_TOGGLED',
      `Simulator ${parsed.data.simulating ? 'activated' : 'paused'} for ${shipment.trackingNumber}`,
      {
        simulating: parsed.data.simulating,
        scenario: updated.scenario,
        simIntervalSeconds: updated.simIntervalSeconds
      },
      shipment.id
    );

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update simulator state' });
  }
});

export default router;
