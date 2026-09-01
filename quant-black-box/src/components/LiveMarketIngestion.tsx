import { useCallback, useState } from 'react'
import { RefreshCw, Search, Wifi } from 'lucide-react'
import { fetchCandles, computeVolatility, computeDrift, lookbackYears } from '../lib/marketApi'
import { ParamLabel, Seg } from './ui'

const TICKER_PRESETS = ['AAPL', 'MSFT', 'TSLA', 'SPY', 'QQQ', 'BTC-USD', '^GSPC', 'GLD']

const LOOKBACK_OPTIONS = [
  { value: '1', label: '1M' },
  { value: '3', label: '3M' },
  { value: '6', label: '6M' },
  { value: '12', label: '1Y' },
  { value: '60', label: '5Y' },
]

interface LiveMarketIngestionProps {
  onApply: (params: { S0: number; mu: number; sig: number }) => void
}

export default function LiveMarketIngestion({ onApply }: LiveMarketIngestionProps) {
  const [mode, setMode] = useState<'manual' | 'live'>('manual')
  const [symbol, setSymbol] = useState('')
  const [lookback, setLookback] = useState('12')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncedSymbol, setSyncedSymbol] = useState<string | null>(null)

  const sync = useCallback(async () => {
    if (!symbol.trim()) return
    setLoading(true)
    setError(null)
    try {
      const months = parseInt(lookback, 10)
      const endDate = new Date().toISOString().slice(0, 10)
      const startDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      const { rows } = await fetchCandles(symbol.trim(), '1d', startDate, endDate, 1000)
      if (rows.length < 2) throw new Error('Insufficient historical data')

      const closes = rows.map((r) => r.close)
      const latestPrice = closes[closes.length - 1]
      const vol = computeVolatility(closes)
      const drift = computeDrift(closes, lookbackYears(months))

      onApply({
        S0: Math.round(latestPrice),
        sig: Math.round(vol * 100),
        mu: Math.round(drift * 10) / 10,
      })

      const now = new Date()
      setLastSync(
        now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC'
      )
      setSyncedSymbol(symbol.trim().toUpperCase())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [symbol, lookback, onApply])

  return (
    <div>
      <ParamLabel>DATA SOURCE</ParamLabel>
      <Seg
        options={[
          { value: 'manual', label: 'MANUAL EDIT' },
          { value: 'live', label: 'LIVE MARKET DATA' },
        ]}
        value={mode}
        onChange={(v) => setMode(v as 'manual' | 'live')}
      />

      {mode === 'live' && (
        <div className="mt-2 space-y-3">
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-mute" />
            <input
              id="market-data-input"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sync()}
              placeholder="Ticker (e.g. AAPL, BTC-USD)..."
              className="w-full rounded border border-border bg-[#0a0a0a] pl-7 pr-2 py-1.5 font-mono text-[10px] text-white placeholder:text-mute focus:border-[#555] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {TICKER_PRESETS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSymbol(t)}
                className={`cursor-pointer rounded border px-2 py-0.5 font-mono text-[8px] transition-colors ${
                  symbol === t
                    ? 'border-white bg-white text-black'
                    : 'border-border text-label hover:border-[#555] hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <ParamLabel>LOOKBACK</ParamLabel>
            <Seg options={LOOKBACK_OPTIONS} value={lookback} onChange={setLookback} />
          </div>

          {error && (
            <div className="rounded border border-red/30 bg-red/10 px-2 py-1.5 font-mono text-[9px] text-red">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={sync}
              disabled={loading || !symbol.trim()}
              className="flex cursor-pointer items-center gap-1.5 rounded bg-white px-3 py-1.5 text-[9px] font-semibold text-black disabled:opacity-40"
            >
              <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Syncing...' : 'Sync Live Data'}
            </button>

            {lastSync && syncedSymbol && (
              <div className="flex items-center gap-1.5 font-mono text-[8px] text-label">
                <span className="live-dot" />
                <span>{syncedSymbol} · LAST SYNC: {lastSync}</span>
              </div>
            )}
          </div>

          {lastSync && (
            <div className="flex items-center gap-1 rounded bg-green/10 px-2 py-1 font-mono text-[8px] text-green">
              <Wifi size={9} />
              Connected — S₀, σ, μ auto-populated
            </div>
          )}
        </div>
      )}
    </div>
  )
}
