import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../server/app.js';

describe('Vercel Cron Route Security Test', () => {
  beforeAll(() => {
    process.env.CRON_SECRET = 'test_secret_key_12345';
  });

  it('rejects cron requests without secret with 401 Unauthorized', async () => {
    const response = await request(app)
      .get('/api/cron/simulate');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Unauthorized');
  });

  it('rejects cron requests with incorrect Bearer secret with 401', async () => {
    const response = await request(app)
      .get('/api/cron/simulate')
      .set('Authorization', 'Bearer wrong_secret');

    expect(response.status).toBe(401);
  });

  it('accepts cron requests with valid Bearer secret and returns success', async () => {
    const response = await request(app)
      .get('/api/cron/simulate')
      .set('Authorization', 'Bearer test_secret_key_12345');

    // Route must return 200 — DB may be unavailable so tickedCount can be 0
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).toHaveProperty('tickedCount');
  });
});
