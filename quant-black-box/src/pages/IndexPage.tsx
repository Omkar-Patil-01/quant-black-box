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
    metrics: ['CALL / PUT', 'DELTA', 'GAMMA', 'VEGA', 'THETA', 'RHO'],
    accent: '#16c784',
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
    accent: '#a78bfa',
  },
  {
    view: 'mc',
    code: '04',
    short: 'MONTE CARLO',
    label: 'Portfolio Simulation',
    tagline: 'Seeded GBM path engine with terminal VaR, CVaR and CRRA utility.',
    metrics: ['GBM PATHS', 'VAR / CVAR', 'CRRA UTILITY'],
    accent: '#fbbf24',
  },
  {
    view: 'apt',
    code: '05',
    short: 'APT',
    label: 'Arbitrage Pricing Theory',
    tagline: 'Linear multi-factor return plane from market, size and value premia.',
    metrics: ['MULTI-FACTOR', 'BETA LOADINGS', 'PREMIA'],
    accent: '#f472b6',
  },
]

export default function IndexPage() {
  const setView = useApp((s) => s.setView)

  return (
    <div className="flex h-screen flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2.5 border-b border-line bg-panel px-4">
        <span className="live-dot" />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white">Black Box</span>
        <span className="ml-auto font-mono text-[9px] text-mute">MODELS :: 5 · DESK 09 · SESSION LIVE</span>
      </div>

      <Background3D />

      <div className="relative flex flex-1 flex-col overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="pt-8 text-center"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.4em] text-mute">Quant Intelligence Terminal</span>
          <h1 className="mt-3 font-mono text-[36px] font-bold tracking-[0.12em] text-white">BLACK BOX</h1>
          <p className="mt-2 font-mono text-[10px] tracking-[0.08em] text-label">
            Five classic models · 3D surfaces · Live Greeks · Drag, orbit, explore
          </p>
        </motion.div>

        <div className="flex flex-1 flex-wrap content-center items-center justify-center gap-5 p-6 [perspective:1600px]">
          {MODELS.map((m, i) => (
            <QuantCard key={m.view} {...m} delay={0.08 + i * 0.07} onOpen={() => setView(m.view)} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="pb-4 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-mute"
        >
          Hover to tilt · Click to launch
        </motion.div>
      </div>
    </div>
  )
}
