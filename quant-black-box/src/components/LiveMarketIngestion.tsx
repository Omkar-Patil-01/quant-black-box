import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, RefreshCw, Search, SkipBack, SkipForward, Wifi } from 'lucide-react'
import {
  fetchCandles,
  computeVolatility,
  type CandleRow,
  type CandleInterval,
} from '../lib/marketApi'
import { ParamLabel, Seg } from './ui'
import TimelineChart from './TimelineChart'

const TICKER_PRESETS = ['AAPL', 'MSFT', 'TSLA', 'SPY', 'QQQ', 'BTC-USD', '^GSPC', 'GLD']

const INTERVAL_OPTIONS = [
  { value: '1d', label: '1D' },
  { value: '1h', label: '1H' },
  { value: '1m', label: '1M' },
]

const SPEED_OPTIONS = [
  { value: '0.5', label: '0.5x' },
  { value: '1', label: '1x' },
  { value: '2', label: '2x' },
  { value: '5', label: '5x' },
]

const MAX_RANGE: Record<CandleInterval, number> = {
  '1d': 1825,
  '1h': 60,
  '1m': 7,
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultFrom(monthsAgo: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - monthsAgo)
  return d.toISOString().slice(0, 10)
}

function clampDateRange(from: string, to: string, interval: CandleInterval): { from: string; to: string } {
  const maxDays = MAX_RANGE[interval]
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const diffMs = toDate.getTime() - fromDate.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays > maxDays) {
    const clamped = new Date(toDate)
    clamped.setDate(clamped.getDate() - maxDays)
    return { from: clamped.toISOString().slice(0, 10), to }
  }
  return { from, to }
}

function formatTs(ts: string): string {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface LiveMarketIngestionProps {
  onApply: (params: { S0: number; mu: number; sig: number }) => void
}

export default function LiveMarketIngestion({ onApply }: LiveMarketIngestionProps) {
  const [mode, setMode] = useState<'manual' | 'live'>('manual')
  const [symbol, setSymbol] = useState('')
  const [dateFrom, setDateFrom] = useState(() => defaultFrom(12))
  const [dateTo, setDateTo] = useState(today())
  const [interval, setInterval] = useState<CandleInterval>('1d')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [syncedSymbol, setSyncedSymbol] = useState<string | null>(null)

  const [candles, setCandles] = useState<CandleRow[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const timerRef = useRef<number | null>(null)

  const totalSteps = candles.length
  const currentCandle = candles[currentStep]

  const handleIntervalChange = useCallback(
    (v: string) => {
      const newInterval = v as CandleInterval
      setInterval(newInterval)
      const clamped = clampDateRange(dateFrom, dateTo, newInterval)
      setDateFrom(clamped.from)
      setDateTo(clamped.to)
    },
    [dateFrom, dateTo],
  )

  const sync = useCallback(async () => {
    if (!symbol.trim()) return
    setLoading(true)
    setError(null)
    try {
      const { rows } = await fetchCandles(symbol.trim(), interval, dateFrom, dateTo, 5000)
      if (rows.length < 2) throw new Error('Insufficient data for range')
      rows.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      setCandles(rows)
      setCurrentStep(0)
      setIsPlaying(true)

      const closes = rows.map((r) => r.close)
      const vol = computeVolatility(closes.slice(0, 1), interval)
      onApply({ S0: Math.round(closes[0]), sig: Math.round(vol * 100), mu: 0 })

      const now = new Date()
      setLastSync(
        now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC',
      )
      setSyncedSymbol(symbol.trim().toUpperCase())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [symbol, interval, dateFrom, dateTo, onApply])

  useEffect(() => {
    if (!currentCandle || candles.length === 0) return
    const closes = candles.slice(0, currentStep + 1).map((c) => c.close)
    const vol = computeVolatility(closes, interval)
    onApply({ S0: Math.round(currentCandle.close), sig: Math.round(vol * 100), mu: 0 })
  }, [currentStep, candles, interval, onApply])

  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    if (!isPlaying || currentStep >= totalSteps - 1) {
      setIsPlaying(false)
      return
    }
    const baseMs = interval === '1d' ? 300 : interval === '1h' ? 150 : 50
    timerRef.current = window.setInterval(() => {
      setCurrentStep((s) => {
        if (s >= totalSteps - 1) {
          setIsPlaying(false)
          return s
        }
        return s + 1
      })
    }, baseMs / speed)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [isPlaying, currentStep, totalSteps, speed, interval])

  const handleSeek = useCallback(
    (step: number) => {
      setCurrentStep(step)
      setIsPlaying(false)
    },
    [],
  )

  const togglePlay = useCallback(() => {
    if (currentStep >= totalSteps - 1) {
      setCurrentStep(0)
      setIsPlaying(true)
    } else {
      setIsPlaying((p) => !p)
    }
  }, [currentStep, totalSteps])

  const stepPrev = useCallback(() => {
    setIsPlaying(false)
    setCurrentStep((s) => Math.max(0, s - 1))
  }, [])

  const stepNext = useCallback(() => {
    setIsPlaying(false)
    setCurrentStep((s) => Math.min(totalSteps - 1, s + 1))
  }, [totalSteps])

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

          <div className="space-y-2">
            <ParamLabel>DATE RANGE</ParamLabel>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 rounded border border-border bg-[#0a0a0a] px-2 py-1.5 font-mono text-[10px] text-white focus:border-[#555] focus:outline-none"
              />
              <span className="text-[9px] text-mute">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 rounded border border-border bg-[#0a0a0a] px-2 py-1.5 font-mono text-[10px] text-white focus:border-[#555] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <ParamLabel>INTERVAL</ParamLabel>
            <Seg options={INTERVAL_OPTIONS} value={interval} onChange={handleIntervalChange} />
          </div>

          {error && (
            <div className="rounded border border-red/30 bg-red/10 px-2 py-1.5 font-mono text-[9px] text-red">
              {error}
            </div>
          )}

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
              <span>
                {syncedSymbol} · {totalSteps} candles · LAST SYNC: {lastSync}
              </span>
            </div>
          )}

          {totalSteps > 0 && (
            <>
              <TimelineChart candles={candles} currentStep={currentStep} onSeek={handleSeek} />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={stepPrev}
                  className="cursor-pointer rounded border border-border p-1 text-label hover:text-white"
                >
                  <SkipBack size={10} />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="cursor-pointer rounded border border-border p-1 text-label hover:text-white"
                >
                  {isPlaying ? <Pause size={10} /> : <Play size={10} />}
                </button>
                <button
                  type="button"
                  onClick={stepNext}
                  className="cursor-pointer rounded border border-border p-1 text-label hover:text-white"
                >
                  <SkipForward size={10} />
                </button>

                <input
                  type="range"
                  min={0}
                  max={Math.max(0, totalSteps - 1)}
                  value={currentStep}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="flex-1"
                />

                <div className="flex gap-0.5">
                  {SPEED_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSpeed(Number(s.value))}
                      className={`cursor-pointer rounded px-1.5 py-0.5 text-[8px] font-mono transition-colors ${
                        speed === Number(s.value) ? 'bg-white text-black' : 'text-label hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between font-mono text-[8px] text-label">
                <span>
                  Step {currentStep + 1}/{totalSteps}
                </span>
                {currentCandle && (
                  <span>
                    {formatTs(currentCandle.timestamp)} · Close: ${currentCandle.close.toFixed(2)}
                  </span>
                )}
              </div>

              {isPlaying && (
                <div className="flex items-center gap-1 rounded bg-green/10 px-2 py-1 font-mono text-[8px] text-green">
                  <Wifi size={9} />
                  Playing — updating surface at each step
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
