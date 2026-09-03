import { Router } from 'express';
import { z } from 'zod';
import { kalmanFilter } from '../engine.js';

const router = Router();

const kfSchema = z.object({
  n: z.coerce.number().int().min(1).max(5).default(2),
  m: z.coerce.number().int().min(1).max(3).default(1),
  Q: z.coerce.number().gt(0).default(0.01),
  R: z.coerce.number().gt(0).default(0.1),
  nDays: z.coerce.number().int().min(1).max(60).default(20),
  seed: z.coerce.number().int().default(42),
});

router.post('/', (req, res) => {
  const parsed = kfSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ ok: false, error: 'Invalid parameters', details: parsed.error.flatten() });
    return;
  }
  const result = kalmanFilter(parsed.data);
  res.json({ ticks: result });
});

export default router;
