import { db } from '../db.js';

export type AuditEventType =
  | 'MODEL_RECALCULATED'
  | 'DISCOUNT_TRIGGERED'
  | 'RETAILER_RESPONSE'
  | 'SHIPMENT_CREATED'
  | 'SIMULATOR_TOGGLED'
  | 'OFFER_EXPIRED'
  | 'OFFER_SUPERSEDED'
  | 'PURCHASE_COMPLETED'
  | 'PURCHASE_REVERSED';

export async function createAuditLog(
  eventType: AuditEventType,
  summary: string,
  detailsObj: Record<string, any>,
  shipmentId?: string,
  txClient?: any
) {
  const client = txClient || db;
  try {
    return await client.auditLog.create({
      data: {
        eventType,
        summary,
        details: JSON.stringify(detailsObj, null, 2),
        shipmentId: shipmentId || null,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
