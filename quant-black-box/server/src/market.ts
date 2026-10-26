// Upstream market data. LSE deprecated their /vault API (HTTP 410) and their
// v3 API rejects the issued keys, so this proxies Yahoo Finance's chart API:
// keyless, and it covers every ticker the UI presets offer (incl. ^GSPC, BTC-USD).
// shortcut: Yahoo's chart endpoint is unofficial and undocumented, so it can rate-limit
// or change shape without notice; all response mapping is kept in this one file to make
// the next upstream swap a single-file change.
const YF = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Yahoo 429s requests with an empty UA. Server-side fetch, so no CORS concern.
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

const UPSTREAM_TIMEOUT_MS = 8000;

export interface YahooCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface YfQuote {
  open?: (number | null)[];
  high?: (number | null)[];
  low?: (number | null)[];
  close?: (number | null)[];
  volume?: (number | null)[];
}

interface YfChart {
  chart?: {
    result?: Array<{ timestamp?: number[]; indicators?: { quote?: YfQuote[] }; meta?: Record<string, unknown> }>;
    error?: { description?: string } | null;
  };
}

/** Pure: Yahoo returns parallel arrays with nulls for closed/missing bars. */
export function mapYahooCandles(payload: YahooCandle[] | YfChart): YahooCandle[] {
  const chart = (payload as YfChart).chart;
  if (chart?.error) throw new Error(`Yahoo Finance: ${chart.error.description ?? 'unknown error'}`);
  const result = chart?.result?.[0];
  const ts = result?.timestamp;
  const q = result?.indicators?.quote?.[0];
  if (!ts || !q) return [];

  const rows: YahooCandle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    // A null close means the bar never traded (market closed / partial bar).
    if (close == null) continue;
    rows.push({
      timestamp: new Date(ts[i]! * 1000).toISOString(),
      open: q.open?.[i] ?? close,
      high: q.high?.[i] ?? close,
      low: q.low?.[i] ?? close,
      close,
      volume: q.volume?.[i] ?? 0,
    });
  }
  return rows;
}

/** Maps the UI's intervals straight onto Yahoo's granularity strings. */
function yfInterval(timeframe: string): string {
  return timeframe === '1h' || timeframe === '1m' ? timeframe : '1d';
}

// Yahoo only serves 1m for ~7 days and 1h for ~730 days of history.
const RANGE_BY_INTERVAL: Record<string, string> = { '1m': '7d', '1h': '1mo', '1d': '5y' };

async function yfChart(params: Record<string, string>): Promise<YfChart> {
  const url = new URL(`${YF}/${encodeURIComponent(params.symbol ?? '')}`);
  for (const [k, v] of Object.entries(params)) {
    if (k !== 'symbol' && v) url.searchParams.set(k, v);
  }
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Yahoo Finance error ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as YfChart;
}

/** Accepts 'YYYY-MM-DD' and returns unix seconds, or undefined when unparseable. */
function toUnix(date?: string): string {
  if (!date) return '';
  const t = Date.parse(date);
  return Number.isFinite(t) ? String(Math.floor(t / 1000)) : '';
}

export async function getQuote(symbol: string) {
  const payload = await yfChart({ symbol, range: '5d', interval: '1d' });
  const meta = payload.chart?.result?.[0]?.meta;
  const rows = mapYahooCandles(payload);
  if (rows.length === 0) throw new Error(`No data for ${symbol}`);
  const row = rows[rows.length - 1]!;
  const price = Number(meta?.regularMarketPrice ?? row.close);
  return {
    symbol: String(meta?.symbol ?? symbol),
    price,
    // Yahoo's chart API exposes no bid/ask; report 0 rather than invent levels.
    bid: 0,
    ask: 0,
    volume: row.volume,
    timestamp: row.timestamp,
    name: String(meta?.longName ?? meta?.shortName ?? symbol),
  };
}

export async function getCandles(
  symbol: string,
  timeframe = '1d',
  start?: string,
  end?: string,
  limit = 500,
): Promise<YahooCandle[]> {
  const interval = yfInterval(timeframe);
  // Prefer an explicit window; fall back to a range Yahoo actually serves for
  // this granularity so a wide 1m request can't ask for years of minute bars.
  const p1 = toUnix(start);
  const p2 = toUnix(end);
  const params: Record<string, string> = { symbol, interval };
  if (p1 && p2) {
    params.period1 = p1;
    params.period2 = p2;
  } else {
    params.range = RANGE_BY_INTERVAL[interval] ?? '1mo';
  }

  const rows = mapYahooCandles(await yfChart(params));
  return rows.slice(Math.max(0, rows.length - limit));
}
