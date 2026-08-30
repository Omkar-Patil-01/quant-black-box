import { Router } from 'express';
import { z } from 'zod';
import { hestonPrice, hestonP1 } from '../engine.js';

const router = Router();

const gridSchema = z.object({
  n: z.coerce.number().min(2).max(120).default(26),
  metric: z.enum(['price', 'delta']).default('price'),
});

const hestonSchema = z.object({
  S0: z.coerce.number().gt(0),
  K: z.coerce.number().gt(0),
  T: z.coerce.number().gt(0),
  r: z.coerce.number(),
  v0: z.coerce.number().gte(0),
  kappa: z.coerce.number().gte(0),
  theta: z.coerce.number().gte(0),
  sigv: z.coerce.number().gte(0),
  rho: z.coerce.number().min(-1).max(1),
  opt: z.enum(['call', 'put']).default('call'),
  grid: gridSchema.nullish(),
});

router.post('/', (req, res) => {
  const parsed = hestonSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ ok: false, error: 'Invalid parameters', details: parsed.error.flatten() });
    return;
  }
  const { S0, K, T, r, v0, kappa, theta, sigv, rho, opt, grid } = parsed.data;
  const params = { r, v0, kappa, theta, sigv, rho };
  const m = hestonPrice(S0, K, T, params);

  let gridData = null;
  if (grid) {
    const n = grid.n;
    const x0 = K * 0.4, x1 = K * 1.6, y0 = 0.05, y1 = 1.6;
    const points: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0) * i / (n - 1);
      for (let j = 0; j < n; j++) {
        const t = y0 + (y1 - y0) * j / (n - 1);
        let z: number;
        if (grid.metric === 'delta') {
          const d = hestonP1(x, K, t, params);
          z = opt === 'call' ? d : d - 1;
        } else {
          const mm = hestonPrice(x, K, t, params);
          z = opt === 'call' ? mm.C : mm.P;
        }
        points.push({ x, y: t, z });
      }
    }
    gridData = { n, metric: grid.metric, points, shape: [n, n], x_range: [x0, x1], y_range: [y0, y1] };
  }

  res.json({
    opt,
    params: { S0, K, T, r, v0, kappa, theta, sigv, rho },
    C: m.C, P: m.P, delta: m.delta, deltaP: m.deltaP,
    grid: gridData,
  });
});

export default router;
