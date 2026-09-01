const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export interface Quote {
  symbol: string
  price: number
  bid: number
  ask: number
  volume: number
  timestamp: string
  name: string
}

export interface CandleRow {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OptionContract {
  ticker: string
  strike: number
  expiry: string
  type: string
  price: number
  iv: number
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
  volume: number
  premium: number
}

export interface CatalogEntry {
  symbol: string
  name: string
  category: string
  ticks: number
  first: string | null
  last: string | null
}

export interface SeriesRow {
  date: string
  value: number
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail || `API error ${res.status}`)
  }
  return res.json()
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  return apiFetch<Quote>(`/market/quote/${encodeURIComponent(symbol)}`)
}

export async function fetchCandles(
  symbol: string,
  timeframe = '1d',
  start?: string,
  end?: string,
  limit = 500,
): Promise<{ symbol: string; timeframe: string; rows: CandleRow[] }> {
  const params = new URLSearchParams({ symbol, timeframe, limit: String(limit) })
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  return apiFetch(`/market/candles?${params}`)
}

export async function fetchOptionsChain(underlying: string): Promise<{ underlying: string; contracts: OptionContract[] }> {
  return apiFetch(`/market/options/${encodeURIComponent(underlying)}`)
}

export async function fetchCatalog(category?: string): Promise<{ entries: CatalogEntry[]; total: number }> {
  const params = category ? `?category=${encodeURIComponent(category)}` : ''
  return apiFetch(`/market/catalog${params}`)
}

export async function fetchSeries(
  symbol: string,
  start?: string,
  end?: string,
  limit = 500,
): Promise<{ symbol: string; rows: SeriesRow[] }> {
  const params = new URLSearchParams({ symbol, limit: String(limit) })
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  return apiFetch(`/market/series?${params}`)
}

export type CandleInterval = '1d' | '1h' | '1m'

export function annualizationFactor(interval: CandleInterval): number {
  switch (interval) {
    case '1d': return Math.sqrt(252)
    case '1h': return Math.sqrt(252 * 6.5)
    case '1m': return Math.sqrt(252 * 6.5 * 60)
  }
}

export function computeVolatility(closes: number[], interval: CandleInterval = '1d'): number {
  if (closes.length < 2) return 0
  const logReturns: number[] = []
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > 0 && closes[i - 1] > 0) {
      logReturns.push(Math.log(closes[i] / closes[i - 1]))
    }
  }
  if (logReturns.length === 0) return 0
  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length
  const variance = logReturns.reduce((a, r) => a + (r - mean) * (r - mean), 0) / (logReturns.length - 1)
  return Math.sqrt(variance) * annualizationFactor(interval)
}

export function computeDrift(closes: number[], lookbackYears: number): number {
  if (closes.length < 2 || lookbackYears <= 0) return 0
  const first = closes[0]
  const last = closes[closes.length - 1]
  if (first <= 0 || last <= 0) return 0
  return (Math.pow(last / first, 1 / lookbackYears) - 1) * 100
}

export function lookbackYears(months: number): number {
  return months / 12
}
