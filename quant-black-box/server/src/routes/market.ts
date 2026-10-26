import { Router } from 'express';
import type { Request, Response } from 'express';
import { getCandles, getQuote } from '../market.js';

const router = Router();

router.get('/quote/:symbol', async (req, res) => {
  try {
    const row = await getQuote(req.params.symbol);
    res.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(msg.includes('No data') ? 404 : 502).json({ ok: false, error: msg });
  }
});

router.get('/candles', async (req, res) => {
  try {
    const { symbol, timeframe, start, end, limit } = req.query as Record<string, string>;
    const rows = await getCandles(symbol, timeframe, start, end, limit ? Number(limit) : undefined);
    res.json({ symbol, timeframe: timeframe || '1d', rows });
  } catch (e: unknown) {
    res.status(502).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

// No keyless upstream serves options greeks, a symbol catalog, or the macro
// series endpoint — the one vendor that did (LSE) is gone. Answer honestly
// rather than proxying to a dead host. None of these have frontend callers.
const unavailable =
  (what: string) =>
  (_req: Request, res: Response): void => {
    res.status(503).json({ ok: false, error: `${what} data is unavailable: no keyless upstream serves it` });
  };

router.get('/options/:underlying', unavailable('Options chain'));
router.get('/catalog', unavailable('Catalog'));
router.get('/series', unavailable('Series'));

export default router;
