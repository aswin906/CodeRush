import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string || '50', 10);
    const shipmentId = req.query.shipmentId as string | undefined;

    const auditLogs = await db.auditLog.findMany({
      where: shipmentId ? { shipmentId } : undefined,
      include: { shipment: true },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
    return res.json(auditLogs);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
