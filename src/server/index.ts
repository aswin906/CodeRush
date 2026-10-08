import { app } from './app.js';
import { config } from './config.js';
import { tickAllSimulations } from './services/simulatorService.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`🚀 AgroSense Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 Telemetry Simulator active with ${config.simulatorDefaultIntervalSec}s interval ticks.`);
});

// Server-side telemetry simulator background loop
const intervalMs = config.simulatorDefaultIntervalSec * 1000;
const simTimer = setInterval(async () => {
  try {
    await tickAllSimulations();
  } catch (err) {
    console.error('Background simulation tick error:', err);
  }
}, intervalMs);

// Graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(simTimer);
  server.close(() => {
    console.log('Server terminated cleanly.');
  });
});
