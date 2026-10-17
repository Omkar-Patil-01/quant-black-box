import { Router } from 'express';
import { env } from '../config.js';
import { getQuote, getCandles, getOptionsChain, getCatalog, getSeries } from '../market.js';

const router = Router();

// One missing key must not take down the rest of the API.
router.use((_req, res, next) => {
  if (!env.LSE_API_KEY) {
    res.status(503).json({ ok: false, error: 'Market data unavailable: LSE_API_KEY is not configured' });
    return;
  }
  next();
});

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

router.get('/options/:underlying', async (req, res) => {
  try {
    const contracts = await getOptionsChain(req.params.underlying);
    res.json({ underlying: req.params.underlying, contracts });
  } catch (e: unknown) {
    res.status(502).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.get('/catalog', async (req, res) => {
  try {
    const { category } = req.query as Record<string, string>;
    const entries = await getCatalog(category);
    res.json({ entries, total: entries.length });
  } catch (e: unknown) {
    res.status(502).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

router.get('/series', async (req, res) => {
  try {
    const { symbol, start, end, limit } = req.query as Record<string, string>;
    const rows = await getSeries(symbol, start, end, limit ? Number(limit) : undefined);
    res.json({ symbol, rows });
  } catch (e: unknown) {
    res.status(502).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});

export default router;
