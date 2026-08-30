import { Router } from 'express';
import { z } from 'zod';
import { aptRet } from '../engine.js';

const router = Router();

const aptGridSchema = z.object({
  n: z.coerce.number().min(2).max(120).default(30),
  b1_min: z.coerce.number().default(0),
  b1_max: z.coerce.number().default(2),
  b2_min: z.coerce.number().default(-1),
  b2_max: z.coerce.number().default(1),
  metric: z.enum(['fair', 'alpha']).default('fair'),
});

const aptSchema = z.object({
  r: z.coerce.number(),
  lam: z.coerce.number(),
  lams: z.coerce.number(),
  lamv: z.coerce.number(),
  b3: z.coerce.number(),
  al: z.coerce.number(),
  metric: z.enum(['fair', 'alpha']).default('fair'),
  b1: z.coerce.number().default(1),
  b2: z.coerce.number().default(0.5),
  grid: aptGridSchema.nullish(),
});

router.post('/', (req, res) => {
  const parsed = aptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ ok: false, error: 'Invalid parameters', details: parsed.error.flatten() });
    return;
  }
  const { r, lam, lams, lamv, b3, al, metric, b1, b2, grid } = parsed.data;
  const params = { r, lam, lams, lamv, b3, al };
  const ret = aptRet(b1, b2, metric === 'alpha', params);

  let gridData = null;
  if (grid) {
    if (grid.b1_max <= grid.b1_min) {
      res.status(422).json({ ok: false, error: 'grid.b1_max must be > grid.b1_min' });
      return;
    }
    if (grid.b2_max <= grid.b2_min) {
      res.status(422).json({ ok: false, error: 'grid.b2_max must be > grid.b2_min' });
      return;
    }
    const n = grid.n;
    const points: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < n; i++) {
      const x = grid.b1_min + (grid.b1_max - grid.b1_min) * i / (n - 1);
      for (let j = 0; j < n; j++) {
        const y = grid.b2_min + (grid.b2_max - grid.b2_min) * j / (n - 1);
        points.push({ x, y, z: aptRet(x, y, grid.metric === 'alpha', params) });
      }
    }
    gridData = { n, metric: grid.metric, points, shape: [n, n], x_range: [grid.b1_min, grid.b1_max], y_range: [grid.b2_min, grid.b2_max] };
  }

  res.json({ params: { r, lam, lams, lamv, b3, al }, metric, b1, b2, ret, grid: gridData });
});

export default router;
