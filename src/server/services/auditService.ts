import { db } from '../db.js';

export async function createAuditLog(
  eventType: 'MODEL_RECALCULATED' | 'DISCOUNT_TRIGGERED' | 'RETAILER_RESPONSE' | 'SHIPMENT_CREATED' | 'SIMULATOR_TOGGLED',
  summary: string,
  detailsObj: Record<string, any>,
  shipmentId?: string
) {
  try {
    return await db.auditLog.create({
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
