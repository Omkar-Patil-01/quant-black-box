import { motion } from 'motion/react'
import Background3D from '../components/Background3D'
import { useApp } from '../store/app'
import type { View } from '../store/app'

const MODELS: { view: View; label: string }[] = [
  { view: 'bs', label: 'Black-Scholes-Merton (BSM)' },
  { view: 'heston', label: 'Heston Stochastic Volatility Model' },
  { view: 'bl', label: 'Black-Litterman Model' },
  { view: 'mc', label: 'Monte Carlo Portfolio Simulation' },
  { view: 'apt', label: 'Arbitrage Pricing Theory (APT)' },
]

const ROWS: View[][] = [
  ['bs', 'heston', 'bl'],
  ['mc', 'apt'],
]

export default function IndexPage() {
  const setView = useApp((s) => s.setView)

  return (
    <div className="flex h-screen flex-col">
      <div className="flex h-10 shrink-0 items-center gap-2.5 border-b border-line bg-panel px-4">
        <span className="live-dot" />
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white">Black Box</span>
      </div>

      <Background3D />

      <div className="relative flex flex-1 flex-col justify-center gap-4 overflow-y-auto p-8">
        {ROWS.map((row, ri) => (
          <motion.div
            key={ri}
            className="flex justify-center gap-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ri * 0.12, duration: 0.4 }}
          >
            {row.map((view) => {
              const model = MODELS.find((m) => m.view === view)!
              return (
                <motion.button
                  key={view}
                  type="button"
                  onClick={() => setView(view)}
                  whileHover={{ borderColor: 'rgba(22,199,132,0.25)', color: '#16c784' }}
                  className="flex max-w-[380px] flex-1 min-h-[200px] cursor-pointer items-center justify-center rounded border border-white/10 bg-panel p-4 text-center text-[10px] font-semibold uppercase leading-relaxed tracking-[0.1em] text-white/15"
                >
                  {model.label}
                </motion.button>
              )
            })}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
