import { Router } from 'express';
import { db } from '../db.js';
import { RespondOfferSchema } from '../validators/schemas.js';
import { createAuditLog } from '../services/auditService.js';

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
router.post('/:id/respond', async (req, res) => {
  try {
    const parsed = RespondOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
    }

    const offer = await db.discountOffer.findUnique({
      where: { id: req.params.id },
      include: {
        shipment: true,
        retailer: true
      }
    });

    if (!offer) {
      return res.status(404).json({ error: 'Discount offer not found' });
    }

    if (offer.status !== 'PENDING') {
      return res.status(400).json({ error: `Offer is already ${offer.status}` });
    }

    const newStatus = parsed.data.status;
    const respondedAt = new Date();

    const updatedOffer = await db.discountOffer.update({
      where: { id: offer.id },
      data: {
        status: newStatus,
        responseNotes: parsed.data.responseNotes || null,
        respondedAt
      },
      include: {
        shipment: { include: { produceType: true } },
        retailer: true
      }
    });

    // If accepted, update shipment status to LIQUIDATED
    if (newStatus === 'ACCEPTED') {
      await db.shipment.update({
        where: { id: offer.shipmentId },
        data: { status: 'LIQUIDATED' }
      });

      // Mark other pending offers for this shipment as EXPIRED
      await db.discountOffer.updateMany({
        where: {
          shipmentId: offer.shipmentId,
          id: { not: offer.id },
          status: 'PENDING'
        },
        data: { status: 'EXPIRED' }
      });
    }

    await createAuditLog(
      'RETAILER_RESPONSE',
      `Retailer ${offer.retailer.name} ${newStatus} ${offer.discountPercent}% discount offer for ${offer.shipment.trackingNumber}`,
      {
        offerId: offer.id,
        retailerId: offer.retailer.id,
        retailerName: offer.retailer.name,
        trackingNumber: offer.shipment.trackingNumber,
        status: newStatus,
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
