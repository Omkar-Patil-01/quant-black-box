import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { TrendingUp, Download, X, Search } from 'lucide-react'
import { fetchQuote, fetchOptionsChain, type Quote, type OptionContract } from '../lib/marketApi'
import { useApp, type View } from '../store/app'

const SYMBOL_PRESETS: Record<View, string[]> = {
  index: [],
  bs: ['AAPL', 'MSFT', 'TSLA', 'BTC/USD', 'EUR/USD', 'SPY'],
  heston: ['AAPL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'SPY'],
  bl: ['SPY', 'QQQ', 'GLD', 'BTC/USD'],
  mc: ['SPY', 'QQQ', 'AAPL', 'BTC/USD'],
  apt: ['SPY', 'QQQ', 'IWM', 'GLD'],
}

interface MarketPanelProps {
  onLoadQuote?: (quote: Quote) => void
  onLoadVol?: (iv: number) => void
}

export default function MarketPanel({ onLoadQuote, onLoadVol }: MarketPanelProps) {
  const view = useApp((s) => s.view)
  const [open, setOpen] = useState(false)
  const [symbol, setSymbol] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [iv, setIv] = useState<number | null>(null)
  const [chain, setChain] = useState<OptionContract[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'quote' | 'options'>('quote')

  const presets = SYMBOL_PRESETS[view] || []

  const loadQuote = useCallback(async (sym: string) => {
    setLoading(true)
    setError(null)
    try {
      const q = await fetchQuote(sym)
      setQuote(q)
      setSymbol(sym)
      // Try to get ATM IV from options chain
      try {
        const underlying = sym.split('/')[0]
        const oc = await fetchOptionsChain(underlying)
        setChain(oc.contracts)
        // Find ATM call
        const calls = oc.contracts.filter((c) => c.type === 'call' && c.strike > 0)
        if (calls.length > 0) {
          const closest = calls.reduce((prev, curr) =>
            Math.abs(curr.strike - q.price) < Math.abs(prev.strike - q.price) ? curr : prev
          )
          setIv(closest.iv)
        }
      } catch {
        // Options not available for this symbol
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch')
    } finally {
      setLoading(false)
    }
  }, [])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center gap-1.5 rounded border border-border px-2 py-1.5 text-[9px] font-medium text-label transition-colors hover:border-[#555] hover:text-white"
      >
        <TrendingUp size={10} />
        Market Data
      </button>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8"
        onClick={() => setOpen(false)}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-md border border-border bg-panel p-5 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
              London Strategic Edge — Market Data
            </span>
            <button type="button" onClick={() => setOpen(false)} className="cursor-pointer text-label hover:text-white">
              <X size={14} />
            </button>
          </div>

          {/* Symbol input */}
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-mute" />
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && symbol && loadQuote(symbol)}
                placeholder="Symbol (e.g. AAPL, BTC/USD)..."
                className="w-full rounded border border-border bg-[#0a0a0a] pl-7 pr-2 py-1.5 font-mono text-[10px] text-white placeholder:text-mute focus:border-[#555] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => symbol && loadQuote(symbol)}
              disabled={loading || !symbol}
              className="cursor-pointer rounded bg-white px-3 py-1.5 text-[9px] font-semibold text-black disabled:opacity-40"
            >
              {loading ? '...' : 'Fetch'}
            </button>
          </div>

          {/* Presets */}
          {presets.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {presets.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => loadQuote(s)}
                  className="cursor-pointer rounded border border-border px-2 py-1 font-mono text-[8px] text-label transition-colors hover:border-[#555] hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded border border-red/30 bg-red/10 px-3 py-2 font-mono text-[9px] text-red">
              {error}
            </div>
          )}

          {/* Tabs */}
          {quote && (
            <div className="mb-3 flex gap-1">
              {(['quote', 'options'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`cursor-pointer rounded px-3 py-1.5 text-[9px] font-medium transition-colors ${
                    tab === t ? 'bg-white text-black' : 'text-label hover:text-white'
                  }`}
                >
                  {t === 'quote' ? 'Quote' : `Options (${chain.length})`}
                </button>
              ))}
            </div>
          )}

          {/* Quote display */}
          {quote && tab === 'quote' && (
            <div className="space-y-3">
              <div className="rounded border border-border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[18px] font-bold text-white">{quote.symbol}</div>
                    <div className="text-[9px] text-label">{quote.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[22px] font-bold text-green">${quote.price.toFixed(2)}</div>
                    <div className="font-mono text-[9px] text-mute">
                      Bid ${quote.bid.toFixed(2)} / Ask ${quote.ask.toFixed(2)}
                    </div>
                  </div>
                </div>
                {iv !== null && (
                  <div className="mt-3 flex items-center gap-4 border-t border-line pt-2">
                    <div>
                      <span className="text-[8px] uppercase tracking-wider text-label">ATM IV</span>
                      <div className="font-mono text-[13px] font-medium text-cyan">{(iv * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Load buttons */}
              <div className="flex flex-wrap gap-2">
                {onLoadQuote && (
                  <button
                    type="button"
                    onClick={() => onLoadQuote(quote)}
                    className="flex cursor-pointer items-center gap-1.5 rounded border border-green/40 bg-green/10 px-3 py-1.5 text-[9px] font-medium text-green transition-colors hover:bg-green/20"
                  >
                    <Download size={10} />
                    Load S0 = ${quote.price.toFixed(2)}
                  </button>
                )}
                {onLoadVol && iv !== null && (
                  <button
                    type="button"
                    onClick={() => onLoadVol(iv)}
                    className="flex cursor-pointer items-center gap-1.5 rounded border border-cyan/40 bg-cyan/10 px-3 py-1.5 text-[9px] font-medium text-cyan transition-colors hover:bg-cyan/20"
                  >
                    <Download size={10} />
                    Load IV = {(iv * 100).toFixed(1)}%
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options chain */}
          {tab === 'options' && chain.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto">
              <div className="mb-2 flex items-center gap-2 text-[8px] uppercase tracking-wider text-label">
                <span className="w-[80px]">Ticker</span>
                <span className="w-[60px] text-right">Strike</span>
                <span className="w-[50px] text-right">Type</span>
                <span className="w-[50px] text-right">IV</span>
                <span className="w-[50px] text-right">Delta</span>
                <span className="w-[50px] text-right">Price</span>
              </div>
              {chain.slice(0, 40).map((c) => (
                <div
                  key={c.ticker}
                  className="flex items-center gap-2 border-b border-[#131313] py-1 font-mono text-[9px]"
                >
                  <span className="w-[80px] truncate text-white">{c.ticker}</span>
                  <span className="w-[60px] text-right text-label">${c.strike.toFixed(0)}</span>
                  <span className={`w-[50px] text-right ${c.type === 'call' ? 'text-green' : 'text-red'}`}>
                    {c.type.toUpperCase()}
                  </span>
                  <span className="w-[50px] text-right text-label">{(c.iv * 100).toFixed(1)}%</span>
                  <span className="w-[50px] text-right text-label">{c.delta.toFixed(3)}</span>
                  <span className="w-[50px] text-right text-white">${c.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {quote && tab === 'options' && chain.length === 0 && (
            <div className="py-6 text-center font-mono text-[9px] text-mute">No options data available</div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
