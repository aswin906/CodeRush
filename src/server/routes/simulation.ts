import { Router } from 'express';
import { tickShipmentSimulation, tickAllSimulations } from '../services/simulatorService.js';

const router = Router();

// POST trigger manual tick step
router.post('/tick', async (req, res) => {
  try {
    const { shipmentId } = req.body;
    if (shipmentId) {
      const result = await tickShipmentSimulation(shipmentId, true);
      return res.json({ message: 'Simulation tick executed for shipment', result });
    } else {
      const results = await tickAllSimulations();
      return res.json({ message: `Simulation tick executed for ${results.length} active shipments`, results });
    }
  } catch (error) {
    console.error('Simulation tick error:', error);
    return res.status(500).json({ error: 'Failed to execute simulation tick' });
  }
});

export default router;
