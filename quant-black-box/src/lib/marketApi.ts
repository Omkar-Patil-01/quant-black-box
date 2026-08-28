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
