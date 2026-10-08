import { Router } from 'express';
import { db } from '../db.js';
import { TelemetryIngestSchema } from '../validators/schemas.js';
import { processTelemetryIngestion } from '../services/simulatorService.js';

const router = Router();

// POST Telemetry Ingestion Endpoint: /api/shipments/:id/telemetry
router.post('/shipments/:id/telemetry', async (req, res) => {
  try {
    const parsed = TelemetryIngestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation error', details: parsed.error.format() });
    }

    const shipmentId = req.params.id;
    const result = await processTelemetryIngestion(shipmentId, parsed.data);

    return res.status(201).json(result);
  } catch (error: any) {
    console.error('Telemetry ingestion error:', error);
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to ingest telemetry' });
  }
});

// GET Telemetry history for a shipment
router.get('/shipments/:id/telemetry', async (req, res) => {
  try {
    const records = await db.telemetryRecord.findMany({
      where: { shipmentId: req.params.id },
      orderBy: { timestamp: 'asc' }
    });
    return res.json(records);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch telemetry records' });
  }
});

export default router;
