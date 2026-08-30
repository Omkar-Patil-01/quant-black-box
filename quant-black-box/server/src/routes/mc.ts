import { Router } from 'express';
import { z } from 'zod';
import { simulateMc, mcStats } from '../engine.js';

const router = Router();

const mcSchema = z.object({
  S0: z.coerce.number().gt(0),
  mu: z.coerce.number(),
  sig: z.coerce.number().gt(0),
  T: z.coerce.number().gt(0),
  npaths: z.coerce.number().min(1).max(10000),
  gam: z.coerce.number(),
  include_paths: z.coerce.boolean().default(true),
});

router.post('/', (req, res) => {
  const parsed = mcSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ ok: false, error: 'Invalid parameters', details: parsed.error.flatten() });
    return;
  }
  const { S0, mu, sig, T, npaths, gam, include_paths } = parsed.data;
  const sim = simulateMc({ S0, mu, sig, T, npaths, gam });
  const stats = mcStats(sim, gam);
  res.json({
    params: { S0, mu, sig, T, npaths, gam },
    steps: 60,
    N: sim.N,
    term: sim.term,
    paths: include_paths ? sim.sorted : null,
    stats,
  });
});

export default router;
