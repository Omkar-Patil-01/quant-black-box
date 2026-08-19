import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { History, RotateCcw, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useWorkspace, applyModelParams } from '../store/workspace'
import type { ModelId, ModelExecutionSnapshot } from '../types/workspace'
import { useApp } from '../store/app'

const VALID_MODEL_IDS: ModelId[] = ['bs', 'heston', 'bl', 'mc', 'apt']

const MODEL_LABELS: Record<ModelId, string> = {
  bs: 'BSM',
  heston: 'HESTON',
  bl: 'BL',
  mc: 'MC',
  apt: 'APT',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatMs(ms: number): string {
  if (ms < 1) return '<1ms'
  if (ms < 1000) return ms.toFixed(0) + 'ms'
  return (ms / 1000).toFixed(2) + 's'
}

function runInputsAreSafe(inputs: Record<string, unknown>): inputs is Record<string, number | string | boolean> {
  return Object.values(inputs).every((v) => typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean')
}

export default function RecentRuns() {
  const view = useApp((s) => s.view)
  const recentRuns = useWorkspace((s) => s.recentRuns)
  const clearHistory = useWorkspace((s) => s.clearHistory)
  const [expanded, setExpanded] = useState(true)
  const [selectedRun, setSelectedRun] = useState<string | null>(null)

  const modelId = (VALID_MODEL_IDS.includes(view as ModelId) ? view : null) as ModelId | null
  const modelRuns = modelId ? recentRuns.filter((r) => r.modelId === modelId) : []

  const handleRestore = (run: ModelExecutionSnapshot) => {
    if (!modelId) return
    if (!runInputsAreSafe(run.inputs)) return
    applyModelParams(modelId, run.inputs)
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mb-3 flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <History size={11} className="text-label" />
          <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-label">
            Recent Runs ({modelRuns.length})
          </span>
        </div>
        {expanded ? <ChevronUp size={10} className="text-mute" /> : <ChevronDown size={10} className="text-mute" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {modelRuns.length === 0 && (
              <div className="py-4 text-center font-mono text-[9px] text-mute">No runs yet</div>
            )}

            <div className="max-h-[260px] space-y-1 overflow-y-auto">
              {modelRuns.map((run) => {
                const isSelected = selectedRun === run.runId
                return (
                  <div
                    key={run.runId}
                    className={`group rounded border px-2 py-1.5 transition-colors ${
                      isSelected ? 'border-white/20 bg-white/5' : 'border-transparent hover:border-border hover:bg-[#0a0a0a]'
                    }`}
                  >
                    <div
                      className="flex cursor-pointer items-center gap-2"
                      onClick={() => setSelectedRun(isSelected ? null : run.runId)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[8px] text-mute">{MODEL_LABELS[run.modelId]}</span>
                          <span className="font-mono text-[8px] text-mute">{formatTime(run.timestamp)}</span>
                          {run.runtimeMs > 0 && (
                            <span className="font-mono text-[7px] text-mute">{formatMs(run.runtimeMs)}</span>
                          )}
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[9px] text-label">{run.scenarioName}</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRestore(run)
                        }}
                        className="shrink-0 cursor-pointer p-1 text-mute opacity-0 transition-all hover:text-green group-hover:opacity-100"
                        title="Restore this run"
                      >
                        <RotateCcw size={10} />
                      </button>
                    </div>

                    {isSelected && (
                      <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2">
                        <div>
                          <span className="text-[7px] font-medium uppercase tracking-wider text-mute">Inputs</span>
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {Object.entries(run.inputs).map(([k, v]) => (
                              <span key={k} className="rounded bg-white/5 px-1 py-0.5 font-mono text-[7px] text-label">
                                {k}: {String(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span className="text-[7px] font-medium uppercase tracking-wider text-mute">Outputs</span>
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {Object.entries(run.outputsSummary).map(([k, v]) => (
                              <span key={k} className="rounded bg-white/5 px-1 py-0.5 font-mono text-[7px] text-label">
                                {k}: {typeof v === 'number' ? v.toFixed(4) : String(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {modelRuns.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="mt-2 flex cursor-pointer items-center gap-1 text-[8px] text-mute hover:text-red"
              >
                <Trash2 size={8} />
                Clear history
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
