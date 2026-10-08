/**
 * offerLifecycleService.ts
 *
 * Central module for all DiscountOffer state transitions:
 *   PENDING → ACCEPTED | DECLINED | EXPIRED | SUPERSEDED
 *
 * Invariants enforced here:
 *  1. No new offer is created if the shipment already has an ACCEPTED offer.
 *  2. No new offer is created for a retailer that already has a PENDING offer
 *     for the same shipment (partial-unique guarantee via advisory lock + query guard).
 *  3. Every tick and every cron run expires overdue PENDING offers before evaluating
 *     new ones, using a single UTC timestamp comparison.
 *  4. Duplicate PENDING offers (created before this guard was in place) are cleaned
 *     up by marking the older ones SUPERSEDED, keeping the newest per (shipment, retailer).
 *  5. Accepting an offer is idempotent — calling accept on an already-ACCEPTED offer
 *     returns the offer unchanged.
 *  6. All state changes produce one audit log entry each.
 */

import { db } from '../db.js';
import { calculateDiscountTier } from './discountEngine.js';
import { createAuditLog } from './auditService.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Offers older than this many hours that are still PENDING are automatically expired. */
export const OFFER_EXPIRY_HOURS = 24;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the UTC timestamp threshold before which PENDING offers are considered expired. */
function expiryThreshold(): Date {
  return new Date(Date.now() - OFFER_EXPIRY_HOURS * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// 1. Expiry pass
// ---------------------------------------------------------------------------

/**
 * Expires all PENDING offers for a shipment whose createdAt is older than
 * OFFER_EXPIRY_HOURS. Returns the number of offers expired.
 *
 * Must be called inside a transaction when used alongside offer-creation logic.
 */
export async function expireStaleOffers(
  shipmentId: string,
  txClient: typeof db = db
): Promise<number> {
  const threshold = expiryThreshold();
  const now = new Date();

  // Find offers to expire so we can write individual audit entries.
  const staleOffers = await txClient.discountOffer.findMany({
    where: {
      shipmentId,
      status: 'PENDING',
      createdAt: { lt: threshold }
    },
    include: { retailer: true, shipment: true }
  });

  if (staleOffers.length === 0) return 0;

  // Bulk-update statuses first.
  await txClient.discountOffer.updateMany({
    where: {
      id: { in: staleOffers.map(o => o.id) }
    },
    data: {
      status: 'EXPIRED',
      expiredAt: now
    }
  });

  // One audit entry per expired offer.
  for (const offer of staleOffers) {
    await createAuditLog(
      'OFFER_EXPIRED',
      `PENDING offer for retailer ${offer.retailer.name} on ${offer.shipment.trackingNumber} expired after ${OFFER_EXPIRY_HOURS}h`,
      {
        offerId: offer.id,
        retailerId: offer.retailerId,
        retailerName: offer.retailer.name,
        discountPercent: offer.discountPercent,
        createdAt: offer.createdAt,
        expiredAt: now
      },
      shipmentId
    );
  }

  return staleOffers.length;
}

// ---------------------------------------------------------------------------
// 2. Dedup / cleanup pass
// ---------------------------------------------------------------------------

/**
 * For each (shipmentId, retailerId) pair that has more than one PENDING offer,
 * keeps the newest and marks the rest SUPERSEDED.
 *
 * Returns the total number of offers superseded.
 */
export async function supersedeDuplicatePendingOffers(
  shipmentId: string,
  txClient: typeof db = db
): Promise<number> {
  const pendingOffers = await txClient.discountOffer.findMany({
    where: { shipmentId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: { retailer: true, shipment: true }
  });

  // Group by retailerId
  const byRetailer = new Map<string, typeof pendingOffers>();
  for (const offer of pendingOffers) {
    const group = byRetailer.get(offer.retailerId) ?? [];
    group.push(offer);
    byRetailer.set(offer.retailerId, group);
  }

  let supersededCount = 0;
  const now = new Date();

  for (const [, group] of byRetailer) {
    if (group.length <= 1) continue;
    // group is already sorted newest-first; supersede everything but index 0
    const toSupersede = group.slice(1);
    await txClient.discountOffer.updateMany({
      where: { id: { in: toSupersede.map(o => o.id) } },
      data: { status: 'SUPERSEDED', supersededAt: now }
    });
    for (const offer of toSupersede) {
      await createAuditLog(
        'OFFER_SUPERSEDED',
        `Duplicate PENDING offer for retailer ${offer.retailer.name} on ${offer.shipment.trackingNumber} superseded`,
        {
          offerId: offer.id,
          keptOfferId: group[0].id,
          retailerId: offer.retailerId,
          retailerName: offer.retailer.name,
          discountPercent: offer.discountPercent,
          supersededAt: now
        },
        shipmentId
      );
      supersededCount++;
    }
  }

  return supersededCount;
}

// ---------------------------------------------------------------------------
// 3. Offer creation with full lifecycle guard
// ---------------------------------------------------------------------------

export interface CreateOffersResult {
  createdCount: number;
  skippedReason?: string;
  expiredCount: number;
  supersededCount: number;
}

/**
 * Evaluates whether new discount offers should be created for a shipment and
 * creates them if appropriate. Runs expiry + dedup passes first.
 *
 * Uses a PostgreSQL advisory lock keyed on the shipment's integer hash to
 * prevent two concurrent evaluations from racing on the same shipment.
 *
 * @param shipmentId  UUID of the shipment being evaluated
 * @param remainingShelfLifeHours  Current remaining hours from the degradation engine
 * @param consumedFraction  Current cumulative consumed fraction (0–1+)
 */
export async function evaluateAndCreateOffers(
  shipmentId: string,
  remainingShelfLifeHours: number,
  consumedFraction: number
): Promise<CreateOffersResult> {
  // Derive a stable 32-bit advisory lock key from the shipment UUID.
  // We take the first 8 hex chars of the UUID and parse as uint32.
  const lockKey = parseInt(shipmentId.replace(/-/g, '').slice(0, 8), 16);

  return await db.$transaction(async (tx) => {
    // ── Advisory lock: only one evaluation per shipment at a time ──────────
    // pg_try_advisory_xact_lock returns false immediately if another
    // session holds the lock, preventing double-offer creation.
    const [lockResult] = await tx.$queryRaw<[{ acquired: boolean }]>`
      SELECT pg_try_advisory_xact_lock(${lockKey}::bigint) AS acquired
    `;

    if (!lockResult.acquired) {
      // Another concurrent evaluation is in progress; skip safely.
      return { createdCount: 0, skippedReason: 'advisory_lock_held', expiredCount: 0, supersededCount: 0 };
    }

    // ── Load shipment with offers under lock ────────────────────────────────
    const shipment = await tx.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        produceType: true,
        discountOffers: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } },
          include: { retailer: true }
        }
      }
    });

    if (!shipment) {
      return { createdCount: 0, skippedReason: 'shipment_not_found', expiredCount: 0, supersededCount: 0 };
    }

    // ── Guard: skip if shipment is already LIQUIDATED or SOLD_OUT ──────────
    if (shipment.status === 'LIQUIDATED' || shipment.status === 'SOLD_OUT') {
      return { createdCount: 0, skippedReason: 'already_liquidated', expiredCount: 0, supersededCount: 0 };
    }

    // ── Guard: skip if no stock available ───────────────────────────────────
    const availableQty = (shipment as any).availableQuantityKg ?? 0;
    if (availableQty <= 0) {
      return { createdCount: 0, skippedReason: 'no_stock', expiredCount: 0, supersededCount: 0 };
    }

    // ── Guard: skip if there is already an ACCEPTED offer ──────────────────
    const hasAccepted = shipment.discountOffers.some(o => o.status === 'ACCEPTED');
    if (hasAccepted) {
      return { createdCount: 0, skippedReason: 'accepted_offer_exists', expiredCount: 0, supersededCount: 0 };
    }

    // ── Expiry pass (inside the transaction) ───────────────────────────────
    const expiredCount = await expireStaleOffers(shipmentId, tx as any);

    // ── Dedup pass (inside the transaction) ────────────────────────────────
    const supersededCount = await supersedeDuplicatePendingOffers(shipmentId, tx as any);

    // ── Evaluate discount tier ──────────────────────────────────────────────
    const discountEval = calculateDiscountTier({
      remainingShelfLifeHours,
      initialShelfLifeHours: shipment.initialShelfLifeHours,
      consumedFraction,
      originalPricePerKg: shipment.initialPricePerKg
    });

    if (!discountEval.triggered) {
      return { createdCount: 0, skippedReason: 'threshold_not_met', expiredCount, supersededCount };
    }

    // ── Collect retailer IDs that already have an active PENDING offer ──────
    // Re-fetch after the expiry/dedup passes above.
    const activePendingOffers = await tx.discountOffer.findMany({
      where: { shipmentId, status: 'PENDING' }
    });
    const pendingRetailerIds = new Set(activePendingOffers.map(o => o.retailerId));

    // ── Find eligible retailers ─────────────────────────────────────────────
    const allRetailers = await tx.retailer.findMany();
    const eligibleRetailers = allRetailers.filter(r =>
      r.preferredProduceTypes.includes(shipment.produceTypeId) ||
      r.preferredProduceTypes === ''
    );
    const targetRetailers = eligibleRetailers.length > 0 ? eligibleRetailers : allRetailers;

    // Filter out retailers that already have a PENDING offer for this shipment.
    const newRetailers = targetRetailers.filter(r => !pendingRetailerIds.has(r.id));

    if (newRetailers.length === 0) {
      return { createdCount: 0, skippedReason: 'all_retailers_have_pending', expiredCount, supersededCount };
    }

    // ── Create offers ───────────────────────────────────────────────────────
    for (const retailer of newRetailers) {
      await tx.discountOffer.create({
        data: {
          shipmentId,
          retailerId: retailer.id,
          discountPercent: discountEval.discountPercent,
          originalPricePerKg: shipment.initialPricePerKg,
          discountedPricePerKg: discountEval.discountedPricePerKg,
          offerQuantityKg: availableQty,
          remainingShelfLifeHoursAtOffer: remainingShelfLifeHours,
          status: 'PENDING'
        }
      });
    }

    // ── Update shipment to LIQUIDATING ──────────────────────────────────────
    await tx.shipment.update({
      where: { id: shipmentId },
      data: { status: 'LIQUIDATING' }
    });

    // ── Audit log ───────────────────────────────────────────────────────────
    await createAuditLog(
      'DISCOUNT_TRIGGERED',
      `Automated ${discountEval.discountPercent}% Liquidation Offer generated for ${shipment.trackingNumber}`,
      {
        discountPercent: discountEval.discountPercent,
        tierName: discountEval.tierName,
        originalPrice: shipment.initialPricePerKg,
        discountedPrice: discountEval.discountedPricePerKg,
        remainingShelfLifeHours,
        notifiedRetailerNames: newRetailers.map(r => r.name),
        expiredCount,
        supersededCount
      },
      shipmentId
    );

    return { createdCount: newRetailers.length, expiredCount, supersededCount };
  });
}

// ---------------------------------------------------------------------------
// 4. Accept offer (idempotent)
// ---------------------------------------------------------------------------

export interface AcceptOfferResult {
  offer: any;
  alreadyAccepted: boolean;
  supersededCount: number;
}

/**
 * Accepts a discount offer. Idempotent — if the offer is already ACCEPTED,
 * returns it unchanged. Marks all other PENDING offers for the same shipment
 * as SUPERSEDED and transitions the shipment to LIQUIDATED.
 */
export async function acceptOffer(
  offerId: string,
  responseNotes?: string
): Promise<AcceptOfferResult> {
  return await db.$transaction(async (tx) => {
    // Lock the offer row to prevent race conditions.
    // Cast the column to text so Prisma's string parameter binds correctly.
    const offers = await tx.$queryRaw<any[]>`
      SELECT * FROM "DiscountOffer" WHERE id::text = ${offerId} FOR UPDATE
    `;
    const offer = offers[0];

    if (!offer) throw new Error(`Offer ${offerId} not found`);

    // Idempotency: already accepted → return as-is.
    if (offer.status === 'ACCEPTED') {
      const full = await tx.discountOffer.findUnique({
        where: { id: offerId },
        include: { shipment: { include: { produceType: true } }, retailer: true }
      });
      return { offer: full, alreadyAccepted: true, supersededCount: 0 };
    }

    if (offer.status !== 'PENDING') {
      throw new Error(`Cannot accept offer in status ${offer.status}`);
    }

    const now = new Date();

    // Mark this offer ACCEPTED.
    const updatedOffer = await tx.discountOffer.update({
      where: { id: offerId },
      data: { status: 'ACCEPTED', respondedAt: now, responseNotes: responseNotes ?? null },
      include: { shipment: { include: { produceType: true } }, retailer: true }
    });

    // Mark all other PENDING offers for this shipment as SUPERSEDED.
    const otherPending = await tx.discountOffer.findMany({
      where: { shipmentId: offer.shipmentId, status: 'PENDING', id: { not: offerId } },
      include: { retailer: true, shipment: true }
    });

    if (otherPending.length > 0) {
      await tx.discountOffer.updateMany({
        where: { id: { in: otherPending.map(o => o.id) } },
        data: { status: 'SUPERSEDED', supersededAt: now }
      });

      for (const o of otherPending) {
        await createAuditLog(
          'OFFER_SUPERSEDED',
          `Offer for retailer ${o.retailer.name} on ${o.shipment.trackingNumber} superseded by accepted offer`,
          {
            supersededOfferId: o.id,
            acceptedOfferId: offerId,
            retailerId: o.retailerId,
            retailerName: o.retailer.name,
            supersededAt: now
          },
          offer.shipmentId
        );
      }
    }

    // Move shipment to LIQUIDATED.
    await tx.shipment.update({
      where: { id: offer.shipmentId },
      data: { status: 'LIQUIDATED' }
    });

    // Audit the acceptance.
    await createAuditLog(
      'RETAILER_RESPONSE',
      `Retailer ${updatedOffer.retailer.name} ACCEPTED ${updatedOffer.discountPercent}% discount offer for ${updatedOffer.shipment.trackingNumber}`,
      {
        offerId,
        retailerId: updatedOffer.retailer.id,
        retailerName: updatedOffer.retailer.name,
        trackingNumber: updatedOffer.shipment.trackingNumber,
        status: 'ACCEPTED',
        discountedPricePerKg: updatedOffer.discountedPricePerKg,
        responseNotes: responseNotes ?? null,
        supersededCount: otherPending.length
      },
      offer.shipmentId
    );

    return { offer: updatedOffer, alreadyAccepted: false, supersededCount: otherPending.length };
  });
}
