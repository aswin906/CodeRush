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

export interface DiscountOffer {
  id: string;
  shipmentId: string;
  shipment?: Shipment;
  retailerId: string;
  retailer?: Retailer;
  discountPercent: number;
  originalPricePerKg: number;
  discountedPricePerKg: number;
  remainingShelfLifeHoursAtOffer: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  responseNotes?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface Shipment {
  id: string;
  trackingNumber: string;
  produceTypeId: string;
  produceType: ProduceType;
  origin: string;
  destination: string;
  quantityKg: number;
  initialPricePerKg: number;
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'EXPIRED' | 'LIQUIDATING' | 'LIQUIDATED';
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
}

export interface AuditLog {
  id: string;
  shipmentId?: string;
  shipment?: Shipment;
  eventType: 'MODEL_RECALCULATED' | 'DISCOUNT_TRIGGERED' | 'RETAILER_RESPONSE' | 'SHIPMENT_CREATED' | 'SIMULATOR_TOGGLED';
  summary: string;
  details: string;
  timestamp: string;
}
