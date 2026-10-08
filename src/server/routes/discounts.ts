import { Router } from 'express';
import { db } from '../db.js';
import { RespondOfferSchema } from '../validators/schemas.js';
import { createAuditLog } from '../services/auditService.js';
import { acceptOffer } from '../services/offerLifecycleService.js';

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

// POST respond to a discount offer (ACCEPT or DECLINE)
// Accepting is idempotent — calling accept on an already-accepted offer is safe.
router.post('/:id/respond', async (req, res) => {
  try {
    const parsed = RespondOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const newStatus = parsed.data.status;

    // ── ACCEPT path (delegated to lifecycle service) ────────────────────────
    if (newStatus === 'ACCEPTED') {
      try {
        const result = await acceptOffer(req.params.id, parsed.data.responseNotes);
        return res.json({
          ...result.offer,
          _meta: {
            alreadyAccepted: result.alreadyAccepted,
            supersededCount: result.supersededCount
          }
        });
      } catch (err: any) {
        if (err.message?.includes('not found')) {
          return res.status(404).json({ error: err.message });
        }
        if (err.message?.includes('Cannot accept')) {
          return res.status(409).json({ error: err.message });
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
