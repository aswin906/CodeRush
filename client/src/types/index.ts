export interface ProduceType {
  id: string;
  name: string;
  tempRef: number;
  shelfLifeRef: number;
  q10: number;
  rhMin: number;
  rhMax: number;
  rhPenaltyCoeff: number;
  icon: string;
  color: string;
  description?: string;
}

export interface TelemetryRecord {
  id: string;
  shipmentId: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  transitTimeHours: number;
  consumedFractionStep: number;
  cumulativeConsumedFraction: number;
  remainingShelfLifeHours: number;
}

export interface Retailer {
  id: string;
  name: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  preferredProduceTypes: string;
}

export interface Purchase {
  id: string;
  offerId: string;
  offer?: DiscountOffer;
  shipmentId: string;
  shipment?: Shipment;
  retailerId: string;
  retailer?: Retailer;
  quantityKg: number;
  pricePerKg: number;
  totalPrice: number;
  status: 'COMPLETED' | 'REVERSED';
  notes?: string;
  reversedAt?: string;
  createdAt: string;
}

export interface DiscountOffer {
  id: string;
  shipmentId: string;
  shipment?: Shipment;
  retailerId: string;
  retailer?: Retailer;
  discountPercent: number;
  originalPricePerKg: number;
  discountedPricePerKg: number;
  offerQuantityKg?: number;
  remainingShelfLifeHoursAtOffer: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'SUPERSEDED';
  responseNotes?: string;
  respondedAt?: string;
  expiredAt?: string;
  supersededAt?: string;
  createdAt: string;
  purchase?: Purchase;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  produceTypeId: string;
  produceType: ProduceType;
  origin: string;
  destination: string;
  quantityKg: number;
  initialQuantityKg: number;
  availableQuantityKg: number;
  initialPricePerKg: number;
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'EXPIRED' | 'LIQUIDATING' | 'LIQUIDATED' | 'SOLD_OUT';
  scenario: 'stable' | 'gradual_warmup' | 'sudden_excursion' | 'door_open_spike';
  initialShelfLifeHours: number;
  remainingShelfLifeHours: number;
  consumedFraction: number;
  simulating: boolean;
  simIntervalSeconds: number;
  createdAt: string;
  updatedAt: string;
  telemetryRecords?: TelemetryRecord[];
  discountOffers?: DiscountOffer[];
  auditLogs?: AuditLog[];
  purchases?: Purchase[];
}

export interface AuditLog {
  id: string;
  shipmentId?: string;
  shipment?: Shipment;
  eventType: 'MODEL_RECALCULATED' | 'DISCOUNT_TRIGGERED' | 'RETAILER_RESPONSE' | 'SHIPMENT_CREATED' | 'SIMULATOR_TOGGLED' | 'OFFER_EXPIRED' | 'OFFER_SUPERSEDED' | 'PURCHASE_COMPLETED' | 'PURCHASE_REVERSED';
  summary: string;
  details: string;
  timestamp: string;
}

export interface BuyerStats {
  retailerId: string;
  retailerName: string;
  totalKgBought: number;
  totalSpent: number;
  avgDiscountPercent: number;
  completedPurchasesCount: number;
  reversedPurchasesCount: number;
}

export interface ProductStats {
  produceTypeId: string;
  produceTypeName: string;
  icon: string;
  color: string;
  totalLiquidatedShipments: number;
  soldOutShipments: number;
  totalKgSold: number;
  totalRevenueRecovered: number;
  avgDiscountOffered: number;
}

export interface StatsSummary {
  totalRevenueRecovered: number;
  totalStockSoldKg: number;
  topBuyer: string | null;
  mostLiquidatedProduct: string | null;
  offerStatusCounts: Record<string, number>;
}
