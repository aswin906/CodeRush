import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const retailers = await db.retailer.findMany({
      orderBy: { name: 'asc' }
    });
    return res.json(retailers);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch retailers' });
  }
});

export default router;
