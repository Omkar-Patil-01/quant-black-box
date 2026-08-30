import express from 'express';
import cors from 'cors';
import { env } from './config.js';
import { initSchema } from './schema.js';
import { errorHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/health.js';
import bsRoutes from './routes/bs.js';
import hestonRoutes from './routes/heston.js';
import blRoutes from './routes/bl.js';
import mcRoutes from './routes/mc.js';
import aptRoutes from './routes/apt.js';
import workspaceRoutes from './routes/workspace.js';
import marketRoutes from './routes/market.js';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }));
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api/bs', bsRoutes);
app.use('/api/heston', hestonRoutes);
app.use('/api/bl', blRoutes);
app.use('/api/mc', mcRoutes);
app.use('/api/apt', aptRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/market', marketRoutes);

app.use((_req, res) => { res.status(404).json({ ok: false, error: 'Not found' }); });
app.use(errorHandler);

async function start() {
  await initSchema();
  app.listen(env.PORT, () => {
    console.log(`[Quant Black Box] Running on http://localhost:${env.PORT}`);
    console.log(`[Quant Black Box] Environment: ${env.NODE_ENV}`);
  });

  const shutdown = async () => {
    console.log('\n[Quant Black Box] Shutting down...');
    const { db } = await import('./db.js');
    await db.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('[Quant Black Box] Fatal:', err);
  process.exit(1);
});
