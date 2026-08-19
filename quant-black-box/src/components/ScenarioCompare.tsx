import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { GitCompareArrows, X } from 'lucide-react'
import { useWorkspace } from '../store/workspace'
import type { ModelId } from '../types/workspace'
import { isModelId } from '../types/workspace'
import { useApp } from '../store/app'

export default function ScenarioCompare() {
  const view = useApp((s) => s.view)
  const scenarios = useWorkspace((s) => s.scenarios)
  const [open, setOpen] = useState(false)
  const [leftId, setLeftId] = useState<string>('')
  const [rightId, setRightId] = useState<string>('')

  const modelId = isModelId(view) ? view : 'bs' as ModelId
  const modelScenarios = Object.values(scenarios).filter((s) => s.modelId === modelId)

  const diff = useMemo(() => {
    const left = scenarios[leftId]
    const right = scenarios[rightId]
    if (!left || !right) return null
    const allKeys = new Set([...Object.keys(left.parameters), ...Object.keys(right.parameters)])
    const rows: { key: string; left: string; right: string; changed: boolean }[] = []
    for (const key of allKeys) {
      const lv = left.parameters[key]
      const rv = right.parameters[key]
      const lStr = lv === undefined ? '—' : String(lv)
      const rStr = rv === undefined ? '—' : String(rv)
      rows.push({ key, left: lStr, right: rStr, changed: lStr !== rStr })
    }
    return { left, right, rows }
  }, [scenarios, leftId, rightId])

  if (modelScenarios.length < 2) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center gap-1.5 rounded border border-border px-2 py-1.5 text-[9px] font-medium text-label transition-colors hover:border-[#555] hover:text-white"
      >
        <GitCompareArrows size={10} />
        Compare
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-md border border-border bg-panel p-5 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white">Compare Scenarios</span>
                <button type="button" onClick={() => setOpen(false)} className="cursor-pointer text-label hover:text-white">
                  <X size={14} />
                </button>
              </div>

              <div className="mb-4 flex gap-3">
                <div className="flex-1">
                  <div className="mb-1.5 text-[8px] font-medium uppercase tracking-[0.14em] text-label">Scenario A</div>
                  <select
                    value={leftId}
                    onChange={(e) => setLeftId(e.target.value)}
                    className="w-full rounded border border-border bg-[#0a0a0a] px-2 py-1.5 font-mono text-[10px] text-white"
                  >
                    <option value="">Select...</option>
                    {modelScenarios.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <div className="mb-1.5 text-[8px] font-medium uppercase tracking-[0.14em] text-label">Scenario B</div>
                  <select
                    value={rightId}
                    onChange={(e) => setRightId(e.target.value)}
                    className="w-full rounded border border-border bg-[#0a0a0a] px-2 py-1.5 font-mono text-[10px] text-white"
                  >
                    <option value="">Select...</option>
                    {modelScenarios.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {diff && (
                <div className="rounded border border-border">
                  <div className="flex border-b border-border px-3 py-2">
                    <span className="flex-1 text-[8px] font-medium uppercase tracking-[0.14em] text-label">Parameter</span>
                    <span className="w-[120px] text-right text-[8px] font-medium uppercase tracking-[0.14em] text-label">{diff.left.name}</span>
                    <span className="w-[120px] text-right text-[8px] font-medium uppercase tracking-[0.14em] text-label">{diff.right.name}</span>
                  </div>
                  {diff.rows.map((row) => (
                    <div
                      key={row.key}
                      className={`flex border-b border-[#131313] px-3 py-1.5 last:border-b-0 ${row.changed ? 'bg-white/[0.02]' : ''}`}
                    >
                      <span className="flex-1 font-mono text-[9px] text-label">{row.key}</span>
                      <span className={`w-[120px] text-right font-mono text-[10px] ${row.changed ? 'text-white' : 'text-mute'}`}>
                        {row.left}
                      </span>
                      <span className={`w-[120px] text-right font-mono text-[10px] ${row.changed ? 'text-white' : 'text-mute'}`}>
                        {row.right}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
