import { Shipment, ProduceType, TelemetryRecord, DiscountOffer, Retailer, AuditLog } from '../types';

const API_BASE = '/api';

export async function fetchShipments(): Promise<Shipment[]> {
  const res = await fetch(`${API_BASE}/shipments`);
  if (!res.ok) throw new Error('Failed to fetch shipments');
  return res.json();
}

export async function fetchShipmentDetail(id: string): Promise<Shipment> {
  const res = await fetch(`${API_BASE}/shipments/${id}`);
  if (!res.ok) throw new Error('Failed to fetch shipment detail');
  return res.json();
}

export async function createShipment(data: {
  produceTypeId: string;
  origin: string;
  destination: string;
  quantityKg: number;
  initialPricePerKg?: number;
  scenario?: string;
  simulating?: boolean;
}): Promise<Shipment> {
  const res = await fetch(`${API_BASE}/shipments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create shipment');
  }
  return res.json();
}

export async function updateSimulatorConfig(id: string, config: {
  simulating: boolean;
  scenario?: string;
  simIntervalSeconds?: number;
}): Promise<Shipment> {
  const res = await fetch(`${API_BASE}/shipments/${id}/simulator`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error('Failed to update simulator settings');
  return res.json();
}

export async function ingestTelemetry(shipmentId: string, data: {
  temperature: number;
  humidity: number;
  transitTimeHours?: number;
}): Promise<{ telemetry: TelemetryRecord; shipment: Shipment }> {
  const res = await fetch(`${API_BASE}/shipments/${shipmentId}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to ingest telemetry');
  return res.json();
}

export async function fetchProduceTypes(): Promise<ProduceType[]> {
  const res = await fetch(`${API_BASE}/produce`);
  if (!res.ok) throw new Error('Failed to fetch produce types');
  return res.json();
}

export async function fetchDiscountOffers(): Promise<DiscountOffer[]> {
  const res = await fetch(`${API_BASE}/discounts`);
  if (!res.ok) throw new Error('Failed to fetch discount offers');
  return res.json();
}

export async function respondToOffer(offerId: string, status: 'ACCEPTED' | 'DECLINED', notes?: string): Promise<DiscountOffer> {
  const res = await fetch(`${API_BASE}/discounts/${offerId}/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, responseNotes: notes })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to respond to offer');
  }
  return res.json();
}

export async function fetchRetailers(): Promise<Retailer[]> {
  const res = await fetch(`${API_BASE}/retailers`);
  if (!res.ok) throw new Error('Failed to fetch retailers');
  return res.json();
}

export async function fetchAuditLogs(shipmentId?: string): Promise<AuditLog[]> {
  const url = shipmentId ? `${API_BASE}/audit?shipmentId=${shipmentId}` : `${API_BASE}/audit`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function triggerSimulationTick(shipmentId?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/simulation/tick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shipmentId })
  });
  if (!res.ok) throw new Error('Failed to trigger simulation tick');
}
