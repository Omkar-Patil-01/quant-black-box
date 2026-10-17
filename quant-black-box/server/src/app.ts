import express from 'express';
import { errorHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/health.js';
import bsRoutes from './routes/bs.js';
import hestonRoutes from './routes/heston.js';
import blRoutes from './routes/bl.js';
import mcRoutes from './routes/mc.js';
import aptRoutes from './routes/apt.js';
import kfRoutes from './routes/kf.js';
import workspaceRoutes from './routes/workspace.js';
import marketRoutes from './routes/market.js';
import { initSchema } from './schema.js';

const app = express();

app.use(express.json());

// Serverless cold starts never run a boot-time init, so ensure the schema once
// per instance — but gate only the DB-backed routes on it, so the pure-math and
// market routes never wait for Postgres. The catch means a missing DATABASE_URL
// degrades the workspace instead of taking down the whole API.
const ready = initSchema().catch((e) => {
  console.error('[DB] Schema init failed:', e);
  return undefined;
});

app.use('/api/workspace', (_req, _res, next) => { void ready.then(() => next()); });

app.use('/api', healthRoutes);
app.use('/api/bs', bsRoutes);
app.use('/api/heston', hestonRoutes);
app.use('/api/bl', blRoutes);
app.use('/api/mc', mcRoutes);
app.use('/api/apt', aptRoutes);
app.use('/api/kf', kfRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/market', marketRoutes);

app.use((_req, res) => { res.status(404).json({ ok: false, error: 'Not found' }); });
app.use(errorHandler);

export default app;
