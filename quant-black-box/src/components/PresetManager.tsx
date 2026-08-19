import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Bookmark, Trash2, ArrowDownToLine } from 'lucide-react'
import { useWorkspace, extractModelParams, applyModelParams } from '../store/workspace'
import type { ModelId } from '../types/workspace'
import { isModelId } from '../types/workspace'
import { useApp } from '../store/app'

export default function PresetManager() {
  const view = useApp((s) => s.view)
  const presets = useWorkspace((s) => s.presets)
  const savePreset = useWorkspace((s) => s.savePreset)
  const deletePreset = useWorkspace((s) => s.deletePreset)
  const applyPreset = useWorkspace((s) => s.applyPreset)

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTags, setNewTags] = useState('')

  const modelId = isModelId(view) ? view : 'bs' as ModelId
  const modelPresets = Object.values(presets).filter((p) => p.modelId === modelId)

  const handleCreate = async () => {
    if (!newName.trim()) return
    const params = await extractModelParams(modelId)
    const tags = newTags.split(',').map((t) => t.trim()).filter(Boolean)
    savePreset(newName.trim(), modelId, params, tags)
    setNewName('')
    setNewTags('')
    setCreating(false)
  }

  const handleApply = (id: string) => {
    const preset = applyPreset(id)
    if (!preset) return
    applyModelParams(modelId, preset.parameters)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-label">Presets</span>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex cursor-pointer items-center gap-1 rounded border border-border px-2 py-1 text-[9px] font-medium text-label transition-colors hover:border-[#555] hover:text-white"
        >
          <Bookmark size={9} />
          Save Current
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
            <div className="space-y-1.5">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Preset name..."
                autoFocus
                className="w-full rounded border border-border bg-[#0a0a0a] px-2 py-1.5 font-mono text-[10px] text-white placeholder:text-mute focus:border-[#555] focus:outline-none"
              />
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="Tags (comma separated)..."
                className="w-full rounded border border-border bg-[#0a0a0a] px-2 py-1.5 font-mono text-[10px] text-white placeholder:text-mute focus:border-[#555] focus:outline-none"
              />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleCreate}
                  className="cursor-pointer rounded bg-white px-2 py-1 text-[9px] font-semibold text-black"
                >
                  Save Preset
                </button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setNewName(''); setNewTags('') }}
                  className="cursor-pointer px-2 py-1 text-[9px] text-label hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {modelPresets.length === 0 && !creating && (
        <div className="py-4 text-center font-mono text-[9px] text-mute">No presets saved</div>
      )}

      <div className="space-y-1">
        {modelPresets.map((p) => (
          <div
            key={p.id}
            className="group flex items-center gap-2 rounded border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-[#0a0a0a]"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-mono text-[10px] text-white">{p.name}</div>
              {p.tags.length > 0 && (
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {p.tags.map((t) => (
                    <span key={t} className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[7px] text-mute">{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => handleApply(p.id)}
                className="cursor-pointer p-1 text-mute hover:text-green"
                title="Apply preset"
              >
                <ArrowDownToLine size={10} />
              </button>
              <button
                type="button"
                onClick={() => deletePreset(p.id)}
                className="cursor-pointer p-1 text-mute hover:text-red"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
