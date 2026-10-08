import { Router } from 'express';
import { db } from '../db.js';
import { RespondOfferSchema, PurchaseOfferSchema } from '../validators/schemas.js';
import { createAuditLog } from '../services/auditService.js';
import { makePurchase, reversePurchase, PurchaseError } from '../services/purchaseService.js';

const router = Router();

// GET all discount offers
router.get('/', async (_req, res) => {
  try {
    const offers = await db.discountOffer.findMany({
      include: {
        shipment: {
          include: { produceType: true }
        },
        retailer: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(offers);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch discount offers' });
  }
});

/**
 * POST /api/discounts/:id/purchase
 *
 * Transactional purchase: locks shipment, checks stock, creates Purchase,
 * marks offer ACCEPTED, supersedes competing offers, decrements stock.
 * Idempotent — repeating with same offerId returns the existing purchase.
 */
router.post('/:id/purchase', async (req, res) => {
  try {
    const parsed = PurchaseOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const result = await makePurchase({
      offerId: req.params.id,
      quantityKg: parsed.data.quantityKg,
      notes: parsed.data.notes
    });

    return res.status(result.idempotent ? 200 : 201).json(result);
  } catch (err: any) {
    if (err instanceof PurchaseError) {
      const statusMap: Record<string, number> = {
        OFFER_NOT_FOUND: 404,
        SHIPMENT_NOT_FOUND: 404,
        PURCHASE_NOT_FOUND: 404,
        OFFER_NOT_PENDING: 409,
        INSUFFICIENT_STOCK: 409,
        OFFER_EXPIRED: 409,
        INVALID_QUANTITY: 400,
        ALREADY_REVERSED: 409
      };
      const status = statusMap[err.code] ?? 500;
      return res.status(status).json({ error: err.message, code: err.code, ...(err.data ?? {}) });
    }
    console.error('Purchase error:', err);
    return res.status(500).json({ error: 'Failed to process purchase' });
  }
});

/**
 * POST /api/discounts/:id/respond
 *
 * Legacy endpoint: DECLINE only. ACCEPT should use /purchase instead.
 * Kept for backward compatibility.
 */
router.post('/:id/respond', async (req, res) => {
  try {
    const parsed = RespondOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const newStatus = parsed.data.status;

    // ── ACCEPT via legacy route: delegate to purchase with full available qty ─
    if (newStatus === 'ACCEPTED') {
      // Load the offer to get its quantity cap
      const offerForQty = await db.discountOffer.findUnique({
        where: { id: req.params.id },
        include: { shipment: true }
      });
      if (!offerForQty) {
        return res.status(404).json({ error: 'Discount offer not found' });
      }
      const quantityKg = (offerForQty.shipment as any).availableQuantityKg ?? offerForQty.offerQuantityKg;
      try {
        const result = await makePurchase({
          offerId: req.params.id,
          quantityKg: Number(quantityKg) || 1,
          notes: parsed.data.responseNotes
        });
        return res.json({ ...result.purchase, _meta: { idempotent: result.idempotent } });
      } catch (err: any) {
        if (err instanceof PurchaseError) {
          const statusMap: Record<string, number> = {
            OFFER_NOT_FOUND: 404, SHIPMENT_NOT_FOUND: 404, OFFER_NOT_PENDING: 409,
            INSUFFICIENT_STOCK: 409, OFFER_EXPIRED: 409, INVALID_QUANTITY: 400
          };
          return res.status(statusMap[err.code] ?? 500).json({ error: err.message, code: err.code, ...(err.data ?? {}) });
        }
        throw err;
      }
    }

    // ── DECLINE path ────────────────────────────────────────────────────────
    const offer = await db.discountOffer.findUnique({
      where: { id: req.params.id },
      include: { shipment: true, retailer: true }
    });

    if (!offer) {
      return res.status(404).json({ error: 'Discount offer not found' });
    }

    if (offer.status !== 'PENDING') {
      return res.status(409).json({ error: `Offer is already ${offer.status}` });
    }

    const respondedAt = new Date();
    const updatedOffer = await db.discountOffer.update({
      where: { id: offer.id },
      data: {
        status: 'DECLINED',
        responseNotes: parsed.data.responseNotes ?? null,
        respondedAt
      },
      include: {
        shipment: { include: { produceType: true } },
        retailer: true
      }
    });

    await createAuditLog(
      'RETAILER_RESPONSE',
      `Retailer ${offer.retailer.name} DECLINED ${offer.discountPercent}% discount offer for ${offer.shipment.trackingNumber}`,
      {
        offerId: offer.id,
        retailerId: offer.retailer.id,
        retailerName: offer.retailer.name,
        trackingNumber: offer.shipment.trackingNumber,
        status: 'DECLINED',
        discountedPricePerKg: offer.discountedPricePerKg,
        responseNotes: parsed.data.responseNotes
      },
      offer.shipmentId
    );

    return res.json(updatedOffer);
  } catch (error) {
    console.error('Respond offer error:', error);
    return res.status(500).json({ error: 'Failed to record retailer response' });
  }
});

export default router;
