/**
 * offerLifecycle.test.ts
 *
 * Integration tests for the DiscountOffer lifecycle:
 *  1. Accepting an offer then re-running the engine produces no new offers.
 *  2. Two concurrent evaluations for the same shipment produce at most one
 *     PENDING offer per retailer.
 *  3. A PENDING offer older than the expiry window is expired by the next pass.
 *
 * These tests require a live PostgreSQL DATABASE_URL (Supabase or local).
 * They are skipped when only a placeholder or SQLite URL is configured.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../server/db.js';
import {
  evaluateAndCreateOffers,
  expireStaleOffers,
  acceptOffer,
  OFFER_EXPIRY_HOURS
} from '../server/services/offerLifecycleService.js';

// ---------------------------------------------------------------------------
// DB reachability guard
// ---------------------------------------------------------------------------
const rawDbUrl = process.env.DATABASE_URL ?? '';
const hasPostgresUrl =
  (rawDbUrl.startsWith('postgresql://') || rawDbUrl.startsWith('postgres://')) &&
  !rawDbUrl.includes('[YOUR_DB_PASSWORD]') &&
  !rawDbUrl.includes('YOUR_');

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

async function createTestFixtures() {
  // Resolve an existing produce type (seeded) or create a minimal one.
  let produce = await db.produceType.findFirst();
  if (!produce) {
    produce = await db.produceType.create({
      data: {
        id: 'test-produce-lifecycle',
        name: 'Test Tomato',
        tempRef: 4.0,
        shelfLifeRef: 168.0,
        q10: 2.0,
        rhMin: 90.0,
        rhMax: 95.0,
        rhPenaltyCoeff: 0.01,
        icon: '🍅',
        color: '#ef4444'
      }
    });
  }

  // Ensure at least one retailer exists.
  let retailer = await db.retailer.findFirst();
  if (!retailer) {
    retailer = await db.retailer.create({
      data: {
        name: 'Test Retailer',
        location: 'Test City',
        contactEmail: 'test@test.com',
        contactPhone: '+1-000-000-0000',
        preferredProduceTypes: ''
      }
    });
  }

  return { produce, retailer };
}

async function createTestShipment(produce: any, suffix: string) {
  return db.shipment.create({
    data: {
      trackingNumber: `TEST-LIFECYCLE-${suffix}-${Date.now()}`,
      produceTypeId: produce.id,
      origin: 'Farm A',
      destination: 'Hub B',
      quantityKg: 100,
      initialQuantityKg: 100,
      availableQuantityKg: 100,
      initialPricePerKg: 5.0,
      status: 'CRITICAL',
      scenario: 'stable',
      initialShelfLifeHours: 168.0,
      // Set remaining shelf life below threshold to trigger discount
      remainingShelfLifeHours: 40.0,
      consumedFraction: 0.78,
      simulating: false
    }
  });
}

async function deleteTestShipment(shipmentId: string) {
  // Cascades to TelemetryRecord, DiscountOffer, AuditLog
  await db.shipment.delete({ where: { id: shipmentId } }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.skipIf(!hasPostgresUrl)('Offer Lifecycle Integration Tests', () => {
  let produce: any;
  let retailer: any;

  beforeAll(async () => {
    const fixtures = await createTestFixtures();
    produce = fixtures.produce;
    retailer = fixtures.retailer;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  // ── Test 1: Accept an offer, then re-evaluate — no new offers created ──────
  it('does not create new offers for a shipment that has an ACCEPTED offer', async () => {
    const shipment = await createTestShipment(produce, 'ACCEPT');

    try {
      // First evaluation — should create offers
      const firstResult = await evaluateAndCreateOffers(
        shipment.id,
        shipment.remainingShelfLifeHours,
        shipment.consumedFraction
      );
      expect(firstResult.createdCount).toBeGreaterThan(0);

      // Fetch the created offer
      const offers = await db.discountOffer.findMany({
        where: { shipmentId: shipment.id, status: 'PENDING' }
      });
      expect(offers.length).toBeGreaterThan(0);

      // Accept the first offer
      const acceptResult = await acceptOffer(offers[0].id);
      expect(acceptResult.alreadyAccepted).toBe(false);

      // All other PENDING offers should now be SUPERSEDED
      const remainingPending = await db.discountOffer.findMany({
        where: { shipmentId: shipment.id, status: 'PENDING' }
      });
      expect(remainingPending).toHaveLength(0);

      // Shipment should be LIQUIDATED
      const updatedShipment = await db.shipment.findUnique({ where: { id: shipment.id } });
      expect(updatedShipment?.status).toBe('LIQUIDATED');

      // Re-run the engine — must not create any new offers
      const secondResult = await evaluateAndCreateOffers(
        shipment.id,
        shipment.remainingShelfLifeHours,
        shipment.consumedFraction
      );
      expect(secondResult.createdCount).toBe(0);
      expect(['accepted_offer_exists', 'already_liquidated']).toContain(secondResult.skippedReason);

      // Accepting the same offer again is idempotent
      const idempotentResult = await acceptOffer(offers[0].id);
      expect(idempotentResult.alreadyAccepted).toBe(true);
    } finally {
      await deleteTestShipment(shipment.id);
    }
  });

  // ── Test 2: Two concurrent evaluations → at most one PENDING offer per retailer
  it('concurrent evaluations produce at most one PENDING offer per retailer', async () => {
    const shipment = await createTestShipment(produce, 'CONCURRENT');

    try {
      // Fire two evaluations concurrently
      const [r1, r2] = await Promise.all([
        evaluateAndCreateOffers(shipment.id, shipment.remainingShelfLifeHours, shipment.consumedFraction),
        evaluateAndCreateOffers(shipment.id, shipment.remainingShelfLifeHours, shipment.consumedFraction)
      ]);

      // Together they must have created at least 1 offer
      expect(r1.createdCount + r2.createdCount).toBeGreaterThan(0);

      // But there must be at most 1 PENDING offer per retailer for this shipment
      const pendingOffers = await db.discountOffer.findMany({
        where: { shipmentId: shipment.id, status: 'PENDING' }
      });

      const offersByRetailer = new Map<string, number>();
      for (const offer of pendingOffers) {
        offersByRetailer.set(offer.retailerId, (offersByRetailer.get(offer.retailerId) ?? 0) + 1);
      }
      for (const [, count] of offersByRetailer) {
        expect(count).toBeLessThanOrEqual(1);
      }
    } finally {
      await deleteTestShipment(shipment.id);
    }
  });

  // ── Test 3: Offers older than the expiry window are expired ─────────────────
  it('expires PENDING offers older than the expiry window', async () => {
    const shipment = await createTestShipment(produce, 'EXPIRY');

    try {
      // Manually create a PENDING offer backdated beyond the expiry window
      const backdatedCreatedAt = new Date(
        Date.now() - (OFFER_EXPIRY_HOURS + 1) * 60 * 60 * 1000
      );

      const staleOffer = await db.discountOffer.create({
        data: {
          shipmentId: shipment.id,
          retailerId: retailer.id,
          discountPercent: 20.0,
          originalPricePerKg: 5.0,
          discountedPricePerKg: 4.0,
          remainingShelfLifeHoursAtOffer: 40.0,
          status: 'PENDING',
          createdAt: backdatedCreatedAt
        }
      });

      // Run the expiry pass
      const expiredCount = await expireStaleOffers(shipment.id);
      expect(expiredCount).toBeGreaterThanOrEqual(1);

      // The stale offer should now be EXPIRED with expiredAt set
      const expiredOffer = await db.discountOffer.findUnique({ where: { id: staleOffer.id } });
      expect(expiredOffer?.status).toBe('EXPIRED');
      expect(expiredOffer?.expiredAt).not.toBeNull();

      // There should be an OFFER_EXPIRED audit entry for this offer
      const auditEntry = await db.auditLog.findFirst({
        where: {
          shipmentId: shipment.id,
          eventType: 'OFFER_EXPIRED'
        }
      });
      expect(auditEntry).not.toBeNull();
    } finally {
      await deleteTestShipment(shipment.id);
    }
  });
});

// Stub test for environments without a DB
describe.skipIf(hasPostgresUrl)('Offer Lifecycle (No DB — skipped)', () => {
  it('skips lifecycle tests when DATABASE_URL is not configured', () => {
    expect(true).toBe(true);
  });
});
