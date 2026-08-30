import { Router } from 'express';
import { z } from 'zod';
import { bs, normCdf, normPdf } from '../engine.js';

const router = Router();

const gridSchema = z.object({
  n: z.coerce.number().min(2).max(120).default(26),
  metric: z.enum(['price', 'delta']).default('price'),
});

const bsSchema = z.object({
  S0: z.coerce.number().gt(0),
  K: z.coerce.number().gt(0),
  T: z.coerce.number().gt(0),
  r: z.coerce.number(),
  sig: z.coerce.number().gt(0),
  opt: z.enum(['call', 'put']).default('call'),
  grid: gridSchema.nullish(),
});

router.post('/', (req, res) => {
  const parsed = bsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ ok: false, error: 'Invalid parameters', details: parsed.error.flatten() });
    return;
  }
  const { S0, K, T, r, sig, opt, grid } = parsed.data;
  const m = bs(S0, K, T, r, sig);
  if (!m) {
    res.status(422).json({ ok: false, error: 'Degenerate inputs: S0, K, T and sig must be positive' });
    return;
  }
  let gridData = null;
  if (grid) {
    const n = grid.n;
    const x0 = K * 0.4, x1 = K * 1.6, y0 = 0.05, y1 = 1.6;
    const points: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0) * i / (n - 1);
      for (let j = 0; j < n; j++) {
        const t = y0 + (y1 - y0) * j / (n - 1);
        const mm = bs(x, K, t, r, sig);
        if (!mm) continue;
        points.push({ x, y: t, z: grid.metric === 'price' ? (opt === 'call' ? mm.C : mm.P) : (opt === 'call' ? mm.delta : mm.deltaP) });
      }
    }
    gridData = { n, metric: grid.metric, points, shape: [n, n], x_range: [x0, x1], y_range: [y0, y1] };
  }
  res.json({ opt, params: { S0, K, T, r, sig }, C: m.C, P: m.P, delta: m.delta, deltaP: m.deltaP, gamma: m.gamma, vega: m.vega, theta: m.theta, rho: m.rho, d1: m.d1, d2: m.d2, grid: gridData });
});

export default router;
