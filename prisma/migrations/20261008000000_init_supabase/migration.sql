-- CreateTable
CREATE TABLE "ProduceType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tempRef" DOUBLE PRECISION NOT NULL,
    "shelfLifeRef" DOUBLE PRECISION NOT NULL,
    "q10" DOUBLE PRECISION NOT NULL,
    "rhMin" DOUBLE PRECISION NOT NULL,
    "rhMax" DOUBLE PRECISION NOT NULL,
    "rhPenaltyCoeff" DOUBLE PRECISION NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProduceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "produceTypeId" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "initialPricePerKg" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "status" TEXT NOT NULL DEFAULT 'OPTIMAL',
    "scenario" TEXT NOT NULL DEFAULT 'stable',
    "initialShelfLifeHours" DOUBLE PRECISION NOT NULL,
    "remainingShelfLifeHours" DOUBLE PRECISION NOT NULL,
    "consumedFraction" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "simulating" BOOLEAN NOT NULL DEFAULT false,
    "simIntervalSeconds" INTEGER NOT NULL DEFAULT 5,
    "simSeed" TEXT NOT NULL DEFAULT 'agro-seed-1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryRecord" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temperature" DOUBLE PRECISION NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,
    "transitTimeHours" DOUBLE PRECISION NOT NULL,
    "consumedFractionStep" DOUBLE PRECISION NOT NULL,
    "cumulativeConsumedFraction" DOUBLE PRECISION NOT NULL,
    "remainingShelfLifeHours" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retailer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "preferredProduceTypes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Retailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountOffer" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "discountPercent" DOUBLE PRECISION NOT NULL,
    "originalPricePerKg" DOUBLE PRECISION NOT NULL,
    "discountedPricePerKg" DOUBLE PRECISION NOT NULL,
    "remainingShelfLifeHoursAtOffer" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "responseNotes" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT,
    "eventType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_trackingNumber_key" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "TelemetryRecord_shipmentId_timestamp_idx" ON "TelemetryRecord"("shipmentId", "timestamp");

-- CreateIndex
CREATE INDEX "DiscountOffer_shipmentId_idx" ON "DiscountOffer"("shipmentId");

-- CreateIndex
CREATE INDEX "DiscountOffer_retailerId_idx" ON "DiscountOffer"("retailerId");

-- CreateIndex
CREATE INDEX "AuditLog_shipmentId_idx" ON "AuditLog"("shipmentId");

-- CreateIndex
CREATE INDEX "AuditLog_eventType_idx" ON "AuditLog"("eventType");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_produceTypeId_fkey" FOREIGN KEY ("produceTypeId") REFERENCES "ProduceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryRecord" ADD CONSTRAINT "TelemetryRecord_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountOffer" ADD CONSTRAINT "DiscountOffer_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountOffer" ADD CONSTRAINT "DiscountOffer_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable Row Level Security (RLS) on all tables as defense-in-depth
ALTER TABLE "ProduceType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Shipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TelemetryRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Retailer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiscountOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
