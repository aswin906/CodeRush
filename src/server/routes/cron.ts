import { Router } from 'express';
import { tickAllSimulations, expireAllStaleOffers } from '../services/simulatorService.js';
import { createAuditLog } from '../services/auditService.js';

const router = Router();

// Vercel Cron Endpoint: /api/cron/simulate
router.all('/simulate', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const headerSecret = req.headers['x-cron-secret'];
  const querySecret = req.query.secret;

  const expectedBearer = cronSecret ? `Bearer ${cronSecret}` : null;

  const isValid = cronSecret && (
    authHeader === expectedBearer ||
    headerSecret === cronSecret ||
    querySecret === cronSecret
  );

  if (!isValid) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or missing CRON_SECRET token',
      timestamp: new Date()
    });
  }

  try {
    // 1. Expire stale PENDING offers across all LIQUIDATING shipments first.
    let expiredCount = 0;
    try {
      expiredCount = await expireAllStaleOffers();
    } catch (expireErr) {
      console.warn('Cron expiry pass warning:', expireErr);
    }

    // 2. Tick all active simulations (each tick also runs expiry + dedup internally).
    let results: any[] = [];
    try {
      results = await tickAllSimulations();
    } catch (dbErr) {
      console.warn('Cron simulation tick DB warning:', dbErr);
    }

    await createAuditLog(
      'SIMULATOR_TOGGLED',
      `Vercel Cron tick: ${results.length} shipments ticked, ${expiredCount} offers expired`,
      {
        tickedCount: results.length,
        expiredCount,
        timestamp: new Date()
      }
    ).catch(() => {});

    return res.json({
      success: true,
      message: `Vercel Cron tick executed successfully`,
      tickedCount: results.length,
      expiredCount,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Vercel Cron simulation tick error:', error);
    return res.status(500).json({ error: 'Failed to execute Vercel Cron tick' });
  }
});

export default router;
