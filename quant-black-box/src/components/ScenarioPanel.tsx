import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, Copy, Trash2, Tag, Pencil, RotateCcw } from 'lucide-react'
import { useWorkspace, applyModelParams } from '../store/workspace'
import type { ModelId } from '../types/workspace'
import { isModelId } from '../types/workspace'
import { useApp } from '../store/app'

const MODEL_LABELS: Record<ModelId, string> = {
  bs: 'BSM',
  heston: 'HESTON',
  bl: 'BL',
  mc: 'MC',
  apt: 'APT',
  kf: 'KF',
}

export default function ScenarioPanel() {
  const view = useApp((s) => s.view)
  const scenarios = useWorkspace((s) => s.scenarios)
  const activeScenarioId = useWorkspace((s) => s.activeScenarioId)
  const createScenario = useWorkspace((s) => s.createScenario)
  const duplicateScenario = useWorkspace((s) => s.duplicateScenario)
  const deleteScenario = useWorkspace((s) => s.deleteScenario)
  const undoDelete = useWorkspace((s) => s.undoDelete)
  const renameScenario = useWorkspace((s) => s.renameScenario)
  const loadScenario = useWorkspace((s) => s.loadScenario)
  const _deleteUndoId = useWorkspace((s) => s._deleteUndoId)

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const modelId = isModelId(view) ? view : 'bs' as ModelId
  const modelScenarios = Object.values(scenarios).filter((s) => s.modelId === modelId)

  const handleCreate = () => {
    if (!newName.trim()) return
    createScenario(newName.trim(), modelId, {})
    setNewName('')
    setCreating(false)
  }

  const handleLoad = (id: string) => {
    const scenario = loadScenario(id)
    if (!scenario) return
    applyModelParams(modelId, scenario.parameters)
  }

  const handleRename = (id: string) => {
    if (!editName.trim()) return
    renameScenario(id, editName.trim())
    setEditingId(null)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-label">Scenarios</span>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex cursor-pointer items-center gap-1 rounded border border-border px-2 py-1 text-[9px] font-medium text-label transition-colors hover:border-[#555] hover:text-white"
        >
          <Plus size={10} />
          New
        </button>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-2 overflow-hidden"
          >
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Scenario name..."
                autoFocus
                className="flex-1 rounded border border-border bg-[#0a0a0a] px-2 py-1.5 font-mono text-[10px] text-white placeholder:text-mute focus:border-[#555] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCreate}
                className="cursor-pointer rounded bg-white px-2 py-1 text-[9px] font-semibold text-black"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { setCreating(false); setNewName('') }}
                className="cursor-pointer px-2 py-1 text-[9px] text-label hover:text-white"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {modelScenarios.length === 0 && !creating && (
        <div className="py-4 text-center font-mono text-[9px] text-mute">No scenarios yet</div>
      )}

      <div className="space-y-1.5">
        {modelScenarios.map((s) => (
          <div
            key={s.id}
            className={`group flex items-center gap-2 rounded border px-2.5 py-2 transition-colors ${
              activeScenarioId === s.id
                ? 'border-white bg-white/5'
                : 'border-transparent hover:border-border hover:bg-[#0a0a0a]'
            }`}
          >
            <div className="min-w-0 flex-1" onClick={() => handleLoad(s.id)}>
              {editingId === s.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename(s.id)}
                  onBlur={() => handleRename(s.id)}
                  autoFocus
                  className="w-full bg-transparent font-mono text-[10px] text-white outline-none"
                />
              ) : (
                <>
                  <div className="truncate font-mono text-[10px] text-white">{s.name}</div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-[8px] text-mute">{MODEL_LABELS[s.modelId]}</span>
                    <span className="font-mono text-[8px] text-mute">
                      {new Date(s.updatedAt).toLocaleDateString()}
                    </span>
                    {s.tags.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[8px] text-mute">
                        <Tag size={7} />
                        {s.tags.length}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setEditingId(s.id); setEditName(s.name) }}
                className="cursor-pointer p-1 text-mute hover:text-white"
              >
                <Pencil size={10} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); duplicateScenario(s.id) }}
                className="cursor-pointer p-1 text-mute hover:text-white"
              >
                <Copy size={10} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); deleteScenario(s.id) }}
                className="cursor-pointer p-1 text-mute hover:text-red"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {_deleteUndoId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-3 flex items-center justify-between rounded border border-border bg-[#0a0a0a] px-2.5 py-2"
          >
            <span className="font-mono text-[9px] text-label">Scenario deleted</span>
            <button
              type="button"
              onClick={undoDelete}
              className="flex cursor-pointer items-center gap-1 rounded border border-border px-2 py-1 text-[9px] font-medium text-white transition-colors hover:border-[#555]"
            >
              <RotateCcw size={9} />
              Undo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
