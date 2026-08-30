import { env } from './config.js';

const BASE = 'https://api.londonstrategicedge.com/vault';

async function lseFetch(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, v);
  }
  const res = await fetch(url, { headers: { 'x-api-key': env.LSE_API_KEY } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LSE API error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getQuote(symbol: string) {
  const rows = await lseFetch('/candles', { symbol, timeframe: '1d', limit: '1', order: 'desc' }) as Record<string, unknown>[];
  if (!rows || rows.length === 0) throw new Error(`No data for ${symbol}`);
  const row = rows[rows.length - 1]!;
  return {
    symbol,
    price: Number(row.close ?? row.c ?? 0),
    bid: Number(row.bid ?? row.b ?? 0),
    ask: Number(row.ask ?? row.a ?? 0),
    volume: Number(row.volume ?? row.v ?? 0),
    timestamp: String(row.timestamp ?? row.ts ?? row.datetime ?? ''),
    name: String(row.name ?? symbol),
  };
}

export async function getCandles(symbol: string, timeframe = '1d', start?: string, end?: string, limit = 500) {
  const rows = await lseFetch('/candles', { symbol, timeframe, start: start || '', end: end || '', limit: String(limit), order: 'asc' }) as Record<string, unknown>[];
  return rows.map((r) => ({
    timestamp: String(r.timestamp ?? r.ts ?? r.datetime ?? ''),
    open: Number(r.open ?? r.o ?? 0),
    high: Number(r.high ?? r.h ?? 0),
    low: Number(r.low ?? r.l ?? 0),
    close: Number(r.close ?? r.c ?? 0),
    volume: Number(r.volume ?? r.v ?? 0),
  }));
}

export async function getOptionsChain(underlying: string) {
  const rows = await lseFetch('/options', { underlying }) as Record<string, unknown>[];
  return rows.map((r) => ({
    ticker: String(r.ticker ?? ''),
    strike: Number(r.strike ?? 0),
    expiry: String(r.expiry ?? r.expiration ?? ''),
    type: String(r.type ?? r.call_put ?? ''),
    price: Number(r.price ?? r.last ?? 0),
    iv: Number(r.iv ?? r.implied_volatility ?? 0),
    delta: Number(r.delta ?? 0),
    gamma: Number(r.gamma ?? 0),
    theta: Number(r.theta ?? 0),
    vega: Number(r.vega ?? 0),
    rho: Number(r.rho ?? 0),
    volume: Number(r.volume ?? 0),
    premium: Number(r.premium ?? 0),
  }));
}

export async function getCatalog(category?: string) {
  const rows = await lseFetch('/catalog', category ? { category } : {}) as Record<string, unknown>[];
  return rows.map((r) => ({
    symbol: String(r.symbol ?? ''),
    name: String(r.name ?? ''),
    category: String(r.category ?? ''),
    ticks: Number(r.ticks ?? 0),
    first: r.first != null ? String(r.first) : null,
    last: r.last != null ? String(r.last) : null,
  }));
}

export async function getSeries(symbol: string, start?: string, end?: string, limit = 500) {
  const rows = await lseFetch('/series', { symbol, start: start || '', end: end || '', limit: String(limit), order: 'asc' }) as Record<string, unknown>[];
  return rows.map((r) => ({
    date: String(r.date ?? r.datetime ?? r.ts ?? ''),
    value: Number(r.value ?? r.v ?? 0),
  }));
}
