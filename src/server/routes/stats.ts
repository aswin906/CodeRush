import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { db } from '../db.js';

const router = Router();

/**
 * GET /api/stats/buyers
 * Per-retailer: total kg bought, total spent, avg discount, completed vs reversed counts.
 */
router.get('/buyers', async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const gte = from ? new Date(from) : null;
    const lte = to ? new Date(to) : null;

    let dateWhere = Prisma.sql``;
    if (gte && lte) {
      dateWhere = Prisma.sql`AND p."createdAt" >= ${gte} AND p."createdAt" <= ${lte}`;
    } else if (gte) {
      dateWhere = Prisma.sql`AND p."createdAt" >= ${gte}`;
    } else if (lte) {
      dateWhere = Prisma.sql`AND p."createdAt" <= ${lte}`;
    }

    const rows = await db.$queryRaw<any[]>`
      SELECT
        r.id AS "retailerId",
        r.name AS "retailerName",
        r.location,
        COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END)::int AS "completedPurchasesCount",
        COUNT(CASE WHEN p.status = 'REVERSED' THEN 1 END)::int AS "reversedPurchasesCount",
        COALESCE(SUM(CASE WHEN p.status = 'COMPLETED' THEN p."quantityKg" ELSE 0 END), 0)::float AS "totalKgBought",
        COALESCE(SUM(CASE WHEN p.status = 'COMPLETED' THEN p."totalPrice" ELSE 0 END), 0)::float AS "totalSpent",
        COALESCE(AVG(CASE WHEN p.status = 'COMPLETED' THEN do2."discountPercent" ELSE NULL END), 0)::float AS "avgDiscountPercent"
      FROM "Retailer" r
      LEFT JOIN "Purchase" p ON p."retailerId" = r.id ${dateWhere}
      LEFT JOIN "DiscountOffer" do2 ON do2.id = p."offerId"
      GROUP BY r.id, r.name, r.location
      ORDER BY "totalSpent" DESC
    `;

    return res.json(rows);
  } catch (error) {
    console.error('Buyers stats error:', error);
    return res.status(500).json({ error: 'Failed to compute buyer statistics' });
  }
});

/**
 * GET /api/stats/products
 * Per-produce-type: liquidated shipments, sold out shipments, volume sold, revenue recovered, avg discount.
 */
router.get('/products', async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const gte = from ? new Date(from) : null;
    const lte = to ? new Date(to) : null;

    let dateWhere = Prisma.sql``;
    if (gte && lte) {
      dateWhere = Prisma.sql`AND p."createdAt" >= ${gte} AND p."createdAt" <= ${lte}`;
    } else if (gte) {
      dateWhere = Prisma.sql`AND p."createdAt" >= ${gte}`;
    } else if (lte) {
      dateWhere = Prisma.sql`AND p."createdAt" <= ${lte}`;
    }

    const rows = await db.$queryRaw<any[]>`
      SELECT
        pt.id AS "produceTypeId",
        pt.name AS "produceTypeName",
        pt.icon,
        pt.color,
        COUNT(DISTINCT CASE WHEN s.status IN ('LIQUIDATING','LIQUIDATED','SOLD_OUT') THEN s.id END)::int AS "totalLiquidatedShipments",
        COUNT(DISTINCT CASE WHEN s.status = 'SOLD_OUT' THEN s.id END)::int AS "soldOutShipments",
        COALESCE(SUM(CASE WHEN p.status = 'COMPLETED' THEN p."quantityKg" ELSE 0 END), 0)::float AS "totalKgSold",
        COALESCE(SUM(CASE WHEN p.status = 'COMPLETED' THEN p."totalPrice" ELSE 0 END), 0)::float AS "totalRevenueRecovered",
        COALESCE(AVG(CASE WHEN p.status = 'COMPLETED' THEN do2."discountPercent" ELSE NULL END), 0)::float AS "avgDiscountOffered"
      FROM "ProduceType" pt
      LEFT JOIN "Shipment" s ON s."produceTypeId" = pt.id
      LEFT JOIN "Purchase" p ON p."shipmentId" = s.id ${dateWhere}
      LEFT JOIN "DiscountOffer" do2 ON do2.id = p."offerId"
      GROUP BY pt.id, pt.name, pt.icon, pt.color
      ORDER BY "totalRevenueRecovered" DESC
    `;

    return res.json(rows);
  } catch (error) {
    console.error('Products stats error:', error);
    return res.status(500).json({ error: 'Failed to compute product statistics' });
  }
});

/**
 * GET /api/stats/summary
 * Summary KPIs: total revenue recovered, total stock sold, top buyer, most liquidated produce, offer status counts.
 */
router.get('/summary', async (req, res) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const gte = from ? new Date(from) : null;
    const lte = to ? new Date(to) : null;

    let purchaseDateWhere = Prisma.sql``;
    if (gte && lte) {
      purchaseDateWhere = Prisma.sql`AND "createdAt" >= ${gte} AND "createdAt" <= ${lte}`;
    } else if (gte) {
      purchaseDateWhere = Prisma.sql`AND "createdAt" >= ${gte}`;
    } else if (lte) {
      purchaseDateWhere = Prisma.sql`AND "createdAt" <= ${lte}`;
    }

    const [purchaseTotals, topBuyerRow, mostLiquidatedRow, offerCounts] = await Promise.all([
      db.$queryRaw<any[]>`
        SELECT
          COALESCE(SUM("totalPrice"), 0)::float AS "totalRevenueRecovered",
          COALESCE(SUM("quantityKg"), 0)::float AS "totalStockSoldKg"
        FROM "Purchase"
        WHERE status = 'COMPLETED' ${purchaseDateWhere}
      `,
      db.$queryRaw<any[]>`
        SELECT r.name
        FROM "Purchase" p
        JOIN "Retailer" r ON r.id = p."retailerId"
        WHERE p.status = 'COMPLETED' ${purchaseDateWhere}
        GROUP BY r.id, r.name
        ORDER BY SUM(p."quantityKg") DESC
        LIMIT 1
      `,
      db.$queryRaw<any[]>`
        SELECT pt.name
        FROM "DiscountOffer" o
        JOIN "Shipment" s ON s.id = o."shipmentId"
        JOIN "ProduceType" pt ON pt.id = s."produceTypeId"
        GROUP BY pt.id, pt.name
        ORDER BY COUNT(*) DESC
        LIMIT 1
      `,
      db.$queryRaw<any[]>`
        SELECT status, COUNT(*)::int AS count
        FROM "DiscountOffer"
        GROUP BY status
      `
    ]);

    const offerStatusCounts = Object.fromEntries(
      (offerCounts as any[]).map(r => [r.status, r.count])
    );

    return res.json({
      totalRevenueRecovered: purchaseTotals[0]?.totalRevenueRecovered ?? 0,
      totalStockSoldKg: purchaseTotals[0]?.totalStockSoldKg ?? 0,
      topBuyer: topBuyerRow[0]?.name ?? null,
      mostLiquidatedProduct: mostLiquidatedRow[0]?.name ?? null,
      offerStatusCounts
    });
  } catch (error) {
    console.error('Summary stats error:', error);
    return res.status(500).json({ error: 'Failed to compute summary statistics' });
  }
});

export default router;
