import express from 'express';
import cors from 'cors';
import produceRouter from './routes/produce.js';
import shipmentsRouter from './routes/shipments.js';
import telemetryRouter from './routes/telemetry.js';
import discountsRouter from './routes/discounts.js';
import retailersRouter from './routes/retailers.js';
import auditRouter from './routes/audit.js';
import simulationRouter from './routes/simulation.js';
import cronRouter from './routes/cron.js';

export const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/produce', produceRouter);
app.use('/api/shipments', shipmentsRouter);
app.use('/api', telemetryRouter); // handles /api/shipments/:id/telemetry
app.use('/api/discounts', discountsRouter);
app.use('/api/retailers', retailersRouter);
app.use('/api/audit', auditRouter);
app.use('/api/simulation', simulationRouter);
app.use('/api/cron', cronRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'AgroSense API', timestamp: new Date() });
});
