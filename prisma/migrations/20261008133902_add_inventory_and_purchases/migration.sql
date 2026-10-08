-- Migration: add_inventory_and_purchases
-- Adds inventory tracking fields to Shipment, offerQuantityKg to DiscountOffer,
-- and creates the Purchase table with stock consistency constraints.

-- ── 1. Shipment: add inventory columns ──────────────────────────────────────
ALTER TABLE "Shipment"
  ADD COLUMN "initialQuantityKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "availableQuantityKg" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Back-fill from existing quantityKg for pre-existing rows
UPDATE "Shipment" SET
  "initialQuantityKg" = "quantityKg",
  "availableQuantityKg" = "quantityKg";

-- CHECK constraints: stock must stay in [0, initialQuantityKg]
ALTER TABLE "Shipment"
  ADD CONSTRAINT "Shipment_availableQuantityKg_non_negative"
    CHECK ("availableQuantityKg" >= 0),
  ADD CONSTRAINT "Shipment_availableQuantityKg_upper_bound"
    CHECK ("availableQuantityKg" <= "initialQuantityKg");

-- Index on status for stats queries
CREATE INDEX IF NOT EXISTS "Shipment_status_idx" ON "Shipment" ("status");

-- ── 2. DiscountOffer: add offerQuantityKg ───────────────────────────────────
ALTER TABLE "DiscountOffer"
  ADD COLUMN "offerQuantityKg" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ── 3. Purchase table ────────────────────────────────────────────────────────
CREATE TABLE "Purchase" (
  "id"          TEXT NOT NULL,
  "offerId"     TEXT NOT NULL,
  "shipmentId"  TEXT NOT NULL,
  "retailerId"  TEXT NOT NULL,
  "quantityKg"  DOUBLE PRECISION NOT NULL,
  "pricePerKg"  DOUBLE PRECISION NOT NULL,
  "totalPrice"  DOUBLE PRECISION NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'COMPLETED',
  "notes"       TEXT,
  "reversedAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Purchase_offerId_key" UNIQUE ("offerId"),
  CONSTRAINT "Purchase_quantityKg_positive" CHECK ("quantityKg" > 0),
  CONSTRAINT "Purchase_totalPrice_positive" CHECK ("totalPrice" > 0)
);

-- Foreign keys
ALTER TABLE "Purchase"
  ADD CONSTRAINT "Purchase_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "DiscountOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Purchase_shipmentId_fkey"
    FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "Purchase_retailerId_fkey"
    FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes for stats queries
CREATE INDEX "Purchase_shipmentId_idx" ON "Purchase"("shipmentId");
CREATE INDEX "Purchase_retailerId_idx" ON "Purchase"("retailerId");
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");
