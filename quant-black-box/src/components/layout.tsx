import { useState, type ReactNode } from 'react'
import { ArrowLeft, RotateCcw, Save } from 'lucide-react'
import type { View } from '../store/app'
import { useApp } from '../store/app'
import { useWorkspace, extractModelParams } from '../store/workspace'
import { isModelId } from '../types/workspace'
import { IconBtn } from './ui'

const TIER1 = ['Models', 'Risk', 'Research', 'Support']

export const TIER2: { view: View; label: string }[] = [
  { view: 'bs', label: 'Black-Scholes Option Pricing' },
  { view: 'heston', label: 'Heston Stochastic Volatility' },
  { view: 'bl', label: 'Black-Litterman Model' },
  { view: 'mc', label: 'Monte Carlo Portfolio Simulation' },
  { view: 'apt', label: 'Arbitrage Pricing Theory' },
]

export function Tier1Nav() {
  const setView = useApp((s) => s.setView)

  return (
    <div className="flex h-[38px] shrink-0 items-center justify-between border-b border-line px-[18px]">
      <nav className="flex gap-[22px] text-[10px] font-medium uppercase tracking-[0.08em]">
        <button type="button" onClick={() => setView('index')} className="cursor-pointer text-label transition-colors hover:text-white">
          Platform
        </button>
        {TIER1.map((l) => (
          <span key={l} className="text-label">
            {l}
          </span>
        ))}
      </nav>
      <div className="flex items-center gap-3 font-mono text-[9px] text-mute">
        <span className="live-dot" />
        LSE · DESK 09 · SESSION LIVE
      </div>
    </div>
  )
}

export function Tier2Nav() {
  const view = useApp((s) => s.view)
  const setView = useApp((s) => s.setView)

  return (
    <nav className="flex h-10 shrink-0 items-stretch overflow-x-auto border-b border-line px-2">
      {TIER2.map((t) => (
        <button
          key={t.view}
          type="button"
          onClick={() => setView(t.view)}
          className={`relative flex cursor-pointer items-center whitespace-nowrap px-4 text-[10px] font-medium transition-colors ${
            view === t.view ? 'text-white' : 'text-label hover:text-[#c0c0c0]'
          }`}
        >
          {t.label}
          {view === t.view && <span className="absolute bottom-0 left-3.5 right-3.5 h-0.5 bg-white" />}
        </button>
      ))}
    </nav>
  )
}

export function Header({
  title,
  badge,
  badgeTone = 'green',
  onInfo,
  onBack,
  onReset,
}: {
  title: string
  badge: string
  badgeTone?: 'green' | 'red'
  onInfo: () => void
  onBack: () => void
  onReset: () => void
}) {
  const view = useApp((s) => s.view)
  const activeScenarioId = useWorkspace((s) => s.activeScenarioId)
  const scenarios = useWorkspace((s) => s.scenarios)
  const createScenario = useWorkspace((s) => s.createScenario)
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [scenarioName, setScenarioName] = useState('')

  const modelId = isModelId(view) ? view : null

  const handleQuickSave = async () => {
    if (!scenarioName.trim() || !modelId) return
    const params = await extractModelParams(modelId)
    createScenario(scenarioName.trim(), modelId, params)
    setScenarioName('')
    setShowSaveInput(false)
  }

  return (
    <div className="relative z-[6] flex h-[46px] shrink-0 items-center justify-between border-b border-line px-[18px]">
      <div className="flex items-center gap-2.5 text-[12px] font-bold tracking-[0.12em] text-white">
        {title}
        <button
          type="button"
          onClick={onInfo}
          className="flex h-3.5 w-3.5 cursor-pointer items-center justify-center rounded-full border border-[#555555] text-[8px] font-normal text-[#777777]"
        >
          i
        </button>
        <span
          className={`rounded px-[7px] py-0.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-black ${
            badgeTone === 'green' ? 'bg-green' : 'bg-red'
          }`}
        >
          {badge}
        </span>
        {activeScenarioId && scenarios[activeScenarioId] && (
          <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[8px] text-label">
            {scenarios[activeScenarioId].name}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {showSaveInput ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickSave()}
              placeholder="Scenario name..."
              autoFocus
              className="w-[140px] rounded border border-border bg-[#0a0a0a] px-2 py-1 font-mono text-[9px] text-white placeholder:text-mute focus:border-[#555] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleQuickSave}
              className="cursor-pointer rounded bg-white px-2 py-1 text-[9px] font-semibold text-black"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setShowSaveInput(false); setScenarioName('') }}
              className="cursor-pointer px-1 text-[9px] text-label hover:text-white"
            >
              ×
            </button>
          </div>
        ) : (
          <IconBtn icon={<Save size={13} />} onClick={() => setShowSaveInput(true)}>
            Save Scenario
          </IconBtn>
        )}
        <IconBtn icon={<ArrowLeft size={13} />} onClick={onBack}>
          Back
        </IconBtn>
        <IconBtn icon={<RotateCcw size={13} />} onClick={onReset}>
          Reset View
        </IconBtn>
      </div>
    </div>
  )
}

export function ModelShell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 overflow-hidden">{children}</div>
}

export function LeftPanel({ children }: { children: ReactNode }) {
  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col overflow-y-auto border-r border-border bg-black">
      <div className="p-3.5 pt-3 space-y-0">
        {children}
      </div>
    </aside>
  )
}
