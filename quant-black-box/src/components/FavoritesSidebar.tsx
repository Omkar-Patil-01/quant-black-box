import { useRef, useState } from 'react'
import { Star, GripVertical, Plus } from 'lucide-react'
import { useWorkspace } from '../store/workspace'
import type { ModelId } from '../types/workspace'
import { useApp, type View } from '../store/app'

const ALL_MODELS: ModelId[] = ['bs', 'heston', 'bl', 'mc', 'apt']

const MODEL_META: Record<ModelId, { label: string; short: string; accent: string }> = {
  bs: { label: 'Black-Scholes', short: 'BSM', accent: '#16c784' },
  heston: { label: 'Heston Stoch Vol', short: 'HEST', accent: '#22d3ee' },
  bl: { label: 'Black-Litterman', short: 'BL', accent: '#a78bfa' },
  mc: { label: 'Monte Carlo', short: 'MC', accent: '#fbbf24' },
  apt: { label: 'Arbitrage Pricing', short: 'APT', accent: '#f472b6' },
}

export default function FavoritesSidebar() {
  const favorites = useWorkspace((s) => s.favorites)
  const addFavorite = useWorkspace((s) => s.addFavorite)
  const removeFavorite = useWorkspace((s) => s.removeFavorite)
  const reorderFavorites = useWorkspace((s) => s.reorderFavorites)
  const view = useApp((s) => s.view)
  const setView = useApp((s) => s.setView)

  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const dragItem = useRef<ModelId | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx)
    dragItem.current = favorites.modelIds[idx]
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setOverIdx(idx)
  }

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === dropIdx) return
    const ids = [...favorites.modelIds]
    const [moved] = ids.splice(dragIdx, 1)
    ids.splice(dropIdx, 0, moved)
    reorderFavorites(ids)
    setDragIdx(null)
    setOverIdx(null)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setOverIdx(null)
  }

  const removedModels = ALL_MODELS.filter((m) => !favorites.modelIds.includes(m))

  return (
    <div className="flex flex-col gap-0.5">
      <div className="mb-1 flex items-center gap-1.5 px-1">
        <Star size={9} className="text-label" />
        <span className="text-[8px] font-medium uppercase tracking-[0.14em] text-label">Favorites</span>
      </div>
      {favorites.modelIds.map((modelId, idx) => {
        const meta = MODEL_META[modelId]
        const isActive = view === modelId
        return (
          <div
            key={modelId}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            onClick={() => setView(modelId as View)}
            onContextMenu={(e) => {
              e.preventDefault()
              removeFavorite(modelId)
            }}
            className={`group flex cursor-pointer items-center gap-1.5 rounded px-2 py-1.5 transition-all ${
              isActive ? 'bg-white/10' : 'hover:bg-white/5'
            } ${dragIdx === idx ? 'opacity-50' : ''} ${overIdx === idx && dragIdx !== null ? 'border-t-2 border-white' : ''}`}
            title={`${meta.label} — right-click to unfavorite`}
          >
            <GripVertical size={8} className="shrink-0 text-mute opacity-0 transition-opacity group-hover:opacity-100" />
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: isActive ? meta.accent : 'transparent', border: `1.5px solid ${meta.accent}` }}
            />
            <span className={`truncate font-mono text-[9px] ${isActive ? 'text-white' : 'text-label'}`}>
              {meta.short}
            </span>
          </div>
        )
      })}

      {removedModels.length > 0 && (
        <div className="mt-1 border-t border-white/10 pt-1">
          <button
            type="button"
            onClick={() => setShowAdd(!showAdd)}
            className="flex w-full cursor-pointer items-center gap-1 rounded px-2 py-1 text-[8px] text-mute transition-colors hover:text-label"
          >
            <Plus size={8} />
            <span>Add favorite</span>
          </button>
          {showAdd && (
            <div className="mt-0.5 space-y-0.5">
              {removedModels.map((modelId) => {
                const meta = MODEL_META[modelId]
                return (
                  <button
                    key={modelId}
                    type="button"
                    onClick={() => {
                      addFavorite(modelId)
                      if (removedModels.length <= 1) setShowAdd(false)
                    }}
                    className="flex w-full cursor-pointer items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-white/5"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ border: `1.5px solid ${meta.accent}` }}
                    />
                    <span className="font-mono text-[9px] text-label">{meta.short}</span>
                    <span className="text-[7px] text-mute">{meta.label}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
