/**
 * purchaseService.ts
 *
 * Transactional purchase flow:
 *  1. Locks the shipment row (SELECT ... FOR UPDATE) to prevent concurrent over-purchase.
 *  2. Validates offer status and stock availability.
 *  3. Decrements availableQuantityKg, inserts Purchase, marks offer ACCEPTED,
 *     supersedes competing PENDING offers, writes audit entries.
 *  4. Makes the endpoint idempotent — same offerId returns the existing purchase.
 *  5. Reversals restore stock and write an audit entry.
 */

import { db } from '../db.js';
import { createAuditLog } from './auditService.js';

export interface MakePurchaseInput {
  offerId: string;
  quantityKg: number;
  notes?: string;
}

export interface MakePurchaseResult {
  purchase: any;
  idempotent: boolean;       // true when the purchase already existed
  supersededCount: number;
}

export async function makePurchase(input: MakePurchaseInput): Promise<MakePurchaseResult> {
  const { offerId, quantityKg, notes } = input;

  if (quantityKg <= 0) {
    throw new PurchaseError('quantityKg must be greater than zero', 'INVALID_QUANTITY');
  }

  return await db.$transaction(async (tx) => {
    // ── Idempotency check ────────────────────────────────────────────────────
    const existing = await tx.purchase.findUnique({
      where: { offerId },
      include: {
        offer: { include: { shipment: { include: { produceType: true } }, retailer: true } },
        retailer: true,
        shipment: { include: { produceType: true } }
      }
    });

    if (existing) {
      return { purchase: existing, idempotent: true, supersededCount: 0 };
    }

    // ── Load offer ───────────────────────────────────────────────────────────
    const offer = await tx.discountOffer.findUnique({
      where: { id: offerId },
      include: { retailer: true, shipment: { include: { produceType: true } } }
    });

    if (!offer) throw new PurchaseError(`Offer ${offerId} not found`, 'OFFER_NOT_FOUND');
    if (offer.status !== 'PENDING') {
      throw new PurchaseError(`Offer is already ${offer.status}`, 'OFFER_NOT_PENDING');
    }

    // ── Lock the shipment row (FOR UPDATE) ───────────────────────────────────
    const [lockedShipment] = await tx.$queryRaw<any[]>`
      SELECT * FROM "Shipment" WHERE id::text = ${offer.shipmentId} FOR UPDATE
    `;

    if (!lockedShipment) throw new PurchaseError('Shipment not found', 'SHIPMENT_NOT_FOUND');

    // ── Expiry check ─────────────────────────────────────────────────────────
    const OFFER_EXPIRY_HOURS = 24;
    const expiryThreshold = new Date(Date.now() - OFFER_EXPIRY_HOURS * 3600 * 1000);
    if (new Date(offer.createdAt) < expiryThreshold) {
      throw new PurchaseError('Offer has expired', 'OFFER_EXPIRED');
    }

    // ── Stock availability check ─────────────────────────────────────────────
    const available = Number(lockedShipment.availableQuantityKg);
    if (quantityKg > available) {
      throw new PurchaseError(
        `Insufficient stock: requested ${quantityKg} kg but only ${available} kg available`,
        'INSUFFICIENT_STOCK',
        { availableQuantityKg: available }
      );
    }

    const now = new Date();
    const pricePerKg = Number(offer.discountedPricePerKg);
    const totalPrice = parseFloat((quantityKg * pricePerKg).toFixed(2));
    const newAvailable = parseFloat((available - quantityKg).toFixed(4));

    // ── Decrement stock ──────────────────────────────────────────────────────
    const newStatus = newAvailable === 0 ? 'SOLD_OUT' : lockedShipment.status;
    await tx.shipment.update({
      where: { id: offer.shipmentId },
      data: {
        availableQuantityKg: newAvailable,
        status: newAvailable === 0 ? 'SOLD_OUT' : lockedShipment.status
      }
    });

    // ── Insert Purchase ──────────────────────────────────────────────────────
    const purchase = await tx.purchase.create({
      data: {
        offerId,
        shipmentId: offer.shipmentId,
        retailerId: offer.retailerId,
        quantityKg,
        pricePerKg,
        totalPrice,
        status: 'COMPLETED',
        notes: notes ?? null,
        createdAt: now
      },
      include: {
        offer: { include: { shipment: { include: { produceType: true } }, retailer: true } },
        retailer: true,
        shipment: { include: { produceType: true } }
      }
    });

    // ── Mark offer ACCEPTED ──────────────────────────────────────────────────
    await tx.discountOffer.update({
      where: { id: offerId },
      data: { status: 'ACCEPTED', respondedAt: now }
    });

    // ── If stock reaches 0 (SOLD_OUT), supersede remaining PENDING offers ──────
    let supersededCount = 0;
    if (newAvailable === 0) {
      const otherPending = await tx.discountOffer.findMany({
        where: { shipmentId: offer.shipmentId, status: 'PENDING', id: { not: offerId } },
        include: { retailer: true, shipment: true }
      });

      if (otherPending.length > 0) {
        supersededCount = otherPending.length;
        await tx.discountOffer.updateMany({
          where: { id: { in: otherPending.map(o => o.id) } },
          data: { status: 'SUPERSEDED', supersededAt: now }
        });

        for (const o of otherPending) {
          await createAuditLog(
            'OFFER_SUPERSEDED',
            `Offer for retailer ${o.retailer.name} on ${o.shipment.trackingNumber} superseded because stock is SOLD OUT`,
            {
              supersededOfferId: o.id,
              purchaseOfferId: offerId,
              retailerId: o.retailerId,
              retailerName: o.retailer.name,
              supersededAt: now
            },
            offer.shipmentId,
            tx
          );
        }
      }
    }

    // ── Audit entry ───────────────────────────────────────────────────────────
    await createAuditLog(
      'PURCHASE_COMPLETED',
      `Retailer ${offer.retailer.name} purchased ${quantityKg} kg of ${offer.shipment.trackingNumber} @ $${pricePerKg}/kg (total $${totalPrice})`,
      {
        purchaseId: purchase.id,
        offerId,
        retailerId: offer.retailerId,
        retailerName: offer.retailer.name,
        trackingNumber: offer.shipment.trackingNumber,
        quantityKg,
        pricePerKg,
        totalPrice,
        remainingStock: newAvailable,
        supersededCount
      },
      offer.shipmentId,
      tx
    );

    return { purchase, idempotent: false, supersededCount };
  }, { timeout: 15000, maxWait: 10000 });
}

// ---------------------------------------------------------------------------
// Reversal
// ---------------------------------------------------------------------------

export async function reversePurchase(purchaseId: string, reason?: string): Promise<any> {
  return await db.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        shipment: { include: { produceType: true } },
        retailer: true,
        offer: true
      }
    });

    if (!purchase) throw new PurchaseError(`Purchase ${purchaseId} not found`, 'PURCHASE_NOT_FOUND');
    if (purchase.status === 'REVERSED') {
      throw new PurchaseError('Purchase is already reversed', 'ALREADY_REVERSED');
    }

    const now = new Date();
    const newAvailable = parseFloat(
      (Number(purchase.shipment.availableQuantityKg) + purchase.quantityKg).toFixed(4)
    );

    // Cap at initialQuantityKg
    const capped = Math.min(newAvailable, Number(purchase.shipment.initialQuantityKg));

    // Restore stock
    await tx.shipment.update({
      where: { id: purchase.shipmentId },
      data: {
        availableQuantityKg: capped,
        // Re-open to LIQUIDATING if the shipment had SOLD_OUT or LIQUIDATED
        status: purchase.shipment.status === 'SOLD_OUT' || purchase.shipment.status === 'LIQUIDATED'
          ? 'LIQUIDATING'
          : purchase.shipment.status
      }
    });

    // Mark purchase REVERSED
    const reversed = await tx.purchase.update({
      where: { id: purchaseId },
      data: { status: 'REVERSED', reversedAt: now, notes: reason ?? purchase.notes },
      include: {
        shipment: { include: { produceType: true } },
        retailer: true,
        offer: true
      }
    });

    // Re-open the offer to PENDING so retailers can re-bid
    await tx.discountOffer.update({
      where: { id: purchase.offerId },
      data: { status: 'PENDING', respondedAt: null }
    });

    await createAuditLog(
      'PURCHASE_REVERSED',
      `Purchase of ${purchase.quantityKg} kg by ${purchase.retailer.name} for ${purchase.shipment.trackingNumber} reversed`,
      {
        purchaseId,
        offerId: purchase.offerId,
        retailerId: purchase.retailerId,
        retailerName: purchase.retailer.name,
        trackingNumber: purchase.shipment.trackingNumber,
        quantityKgRestored: purchase.quantityKg,
        restoredAvailableStock: capped,
        reason: reason ?? null,
        reversedAt: now
      },
      purchase.shipmentId,
      tx
    );

    return reversed;
  }, { timeout: 15000, maxWait: 10000 });
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class PurchaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly data?: Record<string, any>
  ) {
    super(message);
    this.name = 'PurchaseError';
  }
}
