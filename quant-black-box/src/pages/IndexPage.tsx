import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import Background3D from '../components/Background3D'
import QuantCard from '../components/QuantCard'
import { useApp } from '../store/app'
import type { View } from '../store/app'

interface ModelMeta {
  view: View
  code: string
  short: string
  label: string
  tagline: string
  metrics: string[]
  accent: string
}

const MODELS: ModelMeta[] = [
  {
    view: 'bs',
    code: '01',
    short: 'BSM',
    label: 'Black-Scholes-Merton',
    tagline: 'Closed-form European pricing with live Greeks across spot and time.',
    metrics: ['DELTA', 'GAMMA', 'VEGA', 'THETA', 'RHO'],
    accent: '#10b981',
  },
  {
    view: 'heston',
    code: '02',
    short: 'HESTON',
    label: 'Stochastic Volatility',
    tagline: 'Mean-reverting variance process priced through complex CF integration.',
    metrics: ['STOCH VOL', 'CF INTEGRAL', 'FELLER'],
    accent: '#22d3ee',
  },
  {
    view: 'bl',
    code: '03',
    short: 'BLACK-LITTERMAN',
    label: 'Bayesian Allocation',
    tagline: 'Merges implied equilibrium returns with investor views into a posterior.',
    metrics: ['IMPLIED EQM', 'POSTERIOR', 'OPT WEIGHTS'],
    accent: '#8b5cf6',
  },
  {
    view: 'mc',
    code: '04',
    short: 'MONTE CARLO',
    label: 'Portfolio Simulation',
    tagline: 'Seeded GBM path engine with terminal VaR, CVaR and CRRA utility.',
    metrics: ['GBM PATHS', 'VAR / CVAR', 'CRRA UTILITY'],
    accent: '#f59e0b',
  },
  {
    view: 'apt',
    code: '05',
    short: 'APT',
    label: 'Arbitrage Pricing Theory',
    tagline: 'Linear multi-factor return plane from market, size and value premia.',
    metrics: ['MULTI-FACTOR', 'BETA LOADINGS', 'PREMIA'],
    accent: '#ec4899',
  },
  {
    view: 'kf',
    code: '06',
    short: 'KALMAN',
    label: 'Kalman Filter',
    tagline: 'Recursive denoiser. Recovers the unknown true price from noisy ticks without lagging.',
    metrics: ['DENOISING', 'STATE SPACE', 'Q & R TUNING'],
    accent: '#FF5E00',
  },
]

function LiveClock() {
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const hh = String(time.getHours()).padStart(2, '0')
  const mm = String(time.getMinutes()).padStart(2, '0')
  const ss = String(time.getSeconds()).padStart(2, '0')

  return (
    <span className="font-mono text-[10px] tabular-nums tracking-[0.06em] text-zinc-500">
      {hh}:{mm}:{ss}
    </span>
  )
}

export default function IndexPage() {
  const setView = useApp((s) => s.setView)

  return (
    <div className="relative flex h-screen flex-col bg-[#050505]">
      {/* ── Top Utility Bar ──────────────────────── */}
      <div className="relative z-10 flex h-11 shrink-0 items-center justify-between border-b border-zinc-800/60 bg-[#09090b]/80 px-5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="live-dot" />
          <span className="font-mono text-[10px] font-medium tracking-[0.1em] text-zinc-300">
            DESK 09 <span className="text-zinc-600">·</span> SESSION LIVE
          </span>
        </div>

        <div className="flex items-center gap-4">
          <LiveClock />
          <div className="h-3 w-px bg-zinc-800" />
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/50 px-2.5 py-1 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50"
          >
            <span className="font-mono text-[9px] text-zinc-500">⌘K</span>
          </button>
        </div>
      </div>

      {/* ── Background layers ────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute inset-0 bg-radial-glow" />
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute inset-0 bg-noise" />
        <Background3D />
      </div>

      {/* ── Main content ─────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col overflow-y-auto">
        {/* Title section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="pt-10 text-center"
        >
          <span className="font-mono text-[9px] font-medium uppercase tracking-[0.45em] text-zinc-600">
            Quant Intelligence Terminal
          </span>
          <h1 className="mt-3 font-mono text-[42px] font-bold tracking-[0.16em] text-white">
            BLACK BOX
          </h1>
          <p className="mt-2 font-mono text-[10px] tracking-[0.08em] text-zinc-500">
            Six classic models · 3D surfaces · Live Greeks · Drag, orbit, explore
          </p>
        </motion.div>

        {/* Card grid */}
        <div className="flex flex-1 flex-wrap content-center items-center justify-center gap-5 px-6 pb-2 pt-4 [perspective:1800px]">
          {MODELS.map((m, i) => (
            <QuantCard key={m.view} {...m} delay={0.08 + i * 0.07} onOpen={() => setView(m.view)} />
          ))}
        </div>

        {/* Bottom status pill */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="flex justify-center pb-5"
        >
          <div className="inline-flex items-center gap-3 rounded-full border border-zinc-800/60 bg-zinc-900/40 px-4 py-1.5 backdrop-blur-sm">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">
              Hover to tilt
            </span>
            <span className="text-zinc-700">·</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">
              Click to launch
            </span>
            <div className="ml-1 flex gap-1">
              <span className="keycap">HOVER</span>
              <span className="keycap">CLICK</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
