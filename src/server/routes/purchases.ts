import { Router } from 'express';
import { db } from '../db.js';
import { reversePurchase, PurchaseError } from '../services/purchaseService.js';

const router = Router();

// GET all purchases
router.get('/', async (req, res) => {
  try {
    const { shipmentId, retailerId } = req.query;
    const purchases = await db.purchase.findMany({
      where: {
        ...(shipmentId ? { shipmentId: String(shipmentId) } : {}),
        ...(retailerId ? { retailerId: String(retailerId) } : {})
      },
      include: {
        offer: true,
        shipment: { include: { produceType: true } },
        retailer: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(purchases);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// POST /api/purchases/:id/reverse
router.post('/:id/reverse', async (req, res) => {
  try {
    const reversed = await reversePurchase(req.params.id, req.body?.reason);
    return res.json(reversed);
  } catch (err: any) {
    if (err instanceof PurchaseError) {
      const statusMap: Record<string, number> = {
        PURCHASE_NOT_FOUND: 404,
        ALREADY_REVERSED: 409
      };
      return res.status(statusMap[err.code] ?? 500).json({ error: err.message, code: err.code });
    }
    console.error('Reverse purchase error:', err);
    return res.status(500).json({ error: 'Failed to reverse purchase' });
  }
});

export default router;
