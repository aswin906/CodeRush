import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const produceTypes = await db.produceType.findMany({
      orderBy: { name: 'asc' }
    });
    return res.json(produceTypes);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch produce types' });
  }
});

export default router;
