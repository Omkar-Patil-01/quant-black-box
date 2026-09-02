import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import ScenarioPanel from './ScenarioPanel'
import ScenarioCompare from './ScenarioCompare'
import PresetManager from './PresetManager'
import RecentRuns from './RecentRuns'
import { Scale } from './ui'

type RightTab = 'metrics' | 'scenarios' | 'recent'

const TABS: { value: RightTab; label: string }[] = [
  { value: 'metrics', label: 'METRICS' },
  { value: 'scenarios', label: 'SCENARIOS' },
  { value: 'recent', label: 'RECENT RUNS' },
]

interface RightSidebarProps {
  metricsContent: ReactNode
  scaleLabel?: string
  mobile?: boolean
}

export default function RightSidebar({ metricsContent, scaleLabel, mobile }: RightSidebarProps) {
  const [tab, setTab] = useState<RightTab>('metrics')

  if (mobile) {
    return (
      <div className="p-3 pt-2">
        <div className="mb-3 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`relative shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] transition-colors min-h-[32px] ${
                tab === t.value ? 'border-white bg-white text-black' : 'border-border text-label'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'metrics' && (
          <div>
            {metricsContent}
            {scaleLabel && <Scale label={scaleLabel} />}
          </div>
        )}

        {tab === 'scenarios' && (
          <div className="space-y-3">
            <ScenarioPanel />
            <ScenarioCompare />
            <PresetManager />
          </div>
        )}

        {tab === 'recent' && (
          <div>
            <RecentRuns />
          </div>
        )}
      </div>
    )
  }

  return (
    <aside className="flex h-full w-[340px] shrink-0 flex-col overflow-hidden border-l border-border bg-black">
      <div className="flex shrink-0 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`relative flex-1 cursor-pointer px-2 py-2.5 text-[9px] font-semibold tracking-[0.12em] transition-colors ${
              tab === t.value ? 'text-white' : 'text-label hover:text-[#c0c0c0]'
            }`}
          >
            {t.label}
            {tab === t.value && (
              <motion.span
                layoutId="right-tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 bg-white"
              />
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'metrics' && (
          <div className="p-3.5 pt-3">
            {metricsContent}
            {scaleLabel && <Scale label={scaleLabel} />}
          </div>
        )}

        {tab === 'scenarios' && (
          <div className="p-3.5 pt-3 space-y-4">
            <ScenarioPanel />
            <ScenarioCompare />
            <PresetManager />
          </div>
        )}

        {tab === 'recent' && (
          <div className="p-3.5 pt-3">
            <RecentRuns />
          </div>
        )}
      </div>
    </aside>
  )
}
