import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/app.js';
import { db } from '../server/db.js';

describe('Telemetry Ingestion API Integration Test', () => {
  let testShipmentId: string;

  beforeAll(async () => {
    // Find or create a test shipment
    const shipment = await db.shipment.findFirst({
      include: { produceType: true }
    });

    if (shipment) {
      testShipmentId = shipment.id;
    } else {
      const produce = await db.produceType.findFirst();
      const newShip = await db.shipment.create({
        data: {
          trackingNumber: 'TEST-TELEMETRY-99',
          produceTypeId: produce!.id,
          origin: 'Test Farm',
          destination: 'Test Hub',
          quantityKg: 500,
          initialPricePerKg: 5.0,
          status: 'OPTIMAL',
          scenario: 'stable',
          initialShelfLifeHours: 168.0,
          remainingShelfLifeHours: 168.0,
          consumedFraction: 0.0,
          simulating: false
        }
      });
      testShipmentId = newShip.id;
    }
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('ingests telemetry, recomputes shelf-life, and persists to SQLite database', async () => {
    const payload = {
      temperature: 16.5,
      humidity: 70.0,
      transitTimeHours: 10.0
    };

    // 1. Post telemetry via HTTP API
    const response = await request(app)
      .post(`/api/shipments/${testShipmentId}/telemetry`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('telemetry');
    expect(response.body).toHaveProperty('shipment');
    expect(response.body.telemetry.temperature).toBe(16.5);
    expect(response.body.telemetry.humidity).toBe(70.0);

    const telemetryRecordId = response.body.telemetry.id;

    // 2. Direct database query to verify persistence
    const dbRecord = await db.telemetryRecord.findUnique({
      where: { id: telemetryRecordId }
    });

    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.shipmentId).toBe(testShipmentId);
    expect(dbRecord?.temperature).toBe(16.5);
    expect(dbRecord?.humidity).toBe(70.0);
    expect(dbRecord?.remainingShelfLifeHours).toBeLessThan(168.0);
  });
});
