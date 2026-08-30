import { Router } from 'express';
import { z } from 'zod';
import { blSolve } from '../engine.js';

const router = Router();

const blSchema = z.object({
  tau: z.coerce.number().gt(0),
  lam: z.coerce.number(),
  del: z.coerce.number().gt(0),
  q1: z.coerce.number(),
  q2: z.coerce.number(),
});

router.post('/', (req, res) => {
  const parsed = blSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ ok: false, error: 'Invalid parameters', details: parsed.error.flatten() });
    return;
  }
  const { tau, lam, del, q1, q2 } = parsed.data;
  const r = blSolve(tau, lam, del, q1, q2);
  res.json({ names: r.names, Pi: r.Pi, ER: r.ER, SigP: r.SigP, wStar: r.wStar, res1: r.res1, res2: r.res2 });
});

export default router;
