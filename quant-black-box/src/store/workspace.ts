import { create } from 'zustand'
import type { ModelExecutionSnapshot, ModelId, ParameterPreset, ScenarioConfig, WorkspaceState } from '../types/workspace'
import type { BsState, HestonState, BlState, McState, AptState } from './models'
import { defaultState, getStorageProvider } from '../lib/storage'

const MAX_RECENT_RUNS = 50
const UNDO_WINDOW_MS = 5000

let saveTimer: ReturnType<typeof setTimeout> | null = null
let undoTimer: ReturnType<typeof setTimeout> | null = null
let pendingUndoId: string | null = null

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function persistDebounced(state: WorkspaceState) {
  if (saveTimer) clearTimeout(saveTimer)
  useWorkspace.setState({ _saveStatus: 'saving' })
  saveTimer = setTimeout(async () => {
    const provider = await getStorageProvider()
    await provider.save(state)
    useWorkspace.setState({ _saveStatus: 'saved' })
    setTimeout(() => {
      useWorkspace.setState({ _saveStatus: 'idle' })
    }, 1500)
  }, 300)
}

interface WorkspaceActions {
  _hydrate: (state: WorkspaceState) => void
  _snapshot: () => WorkspaceState
  _saveStatus: 'idle' | 'saving' | 'saved'
  _deleteUndoId: string | null
  lastModelParams: Record<string, number | string | boolean> | null

  setActiveModel: (id: ModelId | null) => void

  createScenario: (name: string, modelId: ModelId, parameters: Record<string, number | string | boolean>, tags?: string[], description?: string) => string
  duplicateScenario: (id: string) => string | null
  deleteScenario: (id: string) => void
  undoDelete: () => void
  renameScenario: (id: string, name: string) => void
  updateScenarioTags: (id: string, tags: string[]) => void
  saveToScenario: (id: string, parameters: Record<string, number | string | boolean>) => void
  loadScenario: (id: string) => ScenarioConfig | null
  setActiveScenario: (id: string | null) => void

  addFavorite: (modelId: ModelId) => void
  removeFavorite: (modelId: ModelId) => void
  reorderFavorites: (modelIds: ModelId[]) => void

  recordRun: (snapshot: Omit<ModelExecutionSnapshot, 'runId' | 'timestamp'>) => void
  restoreRun: (runId: string) => ModelExecutionSnapshot | null
  clearHistory: () => void

  savePreset: (name: string, modelId: ModelId, parameters: Record<string, number | string | boolean>, tags?: string[]) => string
  deletePreset: (id: string) => void
  applyPreset: (id: string) => ParameterPreset | null
  getModelPresets: (modelId: ModelId) => ParameterPreset[]
}

type WorkspaceStore = WorkspaceState & WorkspaceActions

function snapshotState(state: WorkspaceState): WorkspaceState {
  return {
    version: state.version,
    activeModelId: state.activeModelId,
    activeScenarioId: state.activeScenarioId,
    lastUpdated: state.lastUpdated,
    favorites: { modelIds: [...state.favorites.modelIds] },
    scenarios: { ...state.scenarios },
    recentRuns: [...state.recentRuns],
    presets: { ...state.presets },
    deletedScenarios: { ...state.deletedScenarios },
    lastModelParams: state.lastModelParams,
  }
}

export const useWorkspace = create<WorkspaceStore>((set, get) => ({
  ...defaultState(),
  _saveStatus: 'idle',
  _deleteUndoId: null,

  _hydrate: (state) => {
    set({
      version: state.version,
      activeModelId: state.activeModelId,
      activeScenarioId: state.activeScenarioId,
      lastUpdated: state.lastUpdated,
      favorites: state.favorites,
      scenarios: state.scenarios,
      recentRuns: state.recentRuns,
      presets: state.presets,
      deletedScenarios: state.deletedScenarios,
    })
  },

  _snapshot: () => snapshotState(get()),

  setActiveModel: (id) => {
    set({ activeModelId: id, lastUpdated: new Date().toISOString() })
    persistDebounced(snapshotState({ ...get(), activeModelId: id }))
  },

  createScenario: (name, modelId, parameters, tags = [], description) => {
    const id = uid()
    const now = new Date().toISOString()
    const scenario: ScenarioConfig = {
      id,
      name,
      modelId,
      description,
      createdAt: now,
      updatedAt: now,
      parameters: { ...parameters },
      tags,
    }
    set((s) => ({
      scenarios: { ...s.scenarios, [id]: scenario },
      activeScenarioId: id,
      lastUpdated: now,
    }))
    persistDebounced(snapshotState(get()))
    return id
  },

  duplicateScenario: (id) => {
    const orig = get().scenarios[id]
    if (!orig) return null
    const newId = uid()
    const now = new Date().toISOString()
    const dup: ScenarioConfig = {
      ...orig,
      id: newId,
      name: orig.name + ' (copy)',
      createdAt: now,
      updatedAt: now,
      parameters: { ...orig.parameters },
      tags: [...orig.tags],
    }
    set((s) => ({
      scenarios: { ...s.scenarios, [newId]: dup },
      activeScenarioId: newId,
      lastUpdated: now,
    }))
    persistDebounced(snapshotState(get()))
    return newId
  },

  deleteScenario: (id) => {
    const scenario = get().scenarios[id]
    if (!scenario) return
    const now = new Date().toISOString()
    set((s) => {
      const { [id]: removed, ...rest } = s.scenarios
      return {
        scenarios: rest,
        deletedScenarios: { ...s.deletedScenarios, [id]: removed },
        activeScenarioId: s.activeScenarioId === id ? null : s.activeScenarioId,
        lastUpdated: now,
      }
    })
    persistDebounced(snapshotState(get()))
    pendingUndoId = id
    useWorkspace.setState({ _deleteUndoId: id })
    if (undoTimer) clearTimeout(undoTimer)
    undoTimer = setTimeout(() => {
      const currentUndoId = pendingUndoId
      pendingUndoId = null
      useWorkspace.setState({ _deleteUndoId: null })
      if (currentUndoId) {
        set((s) => {
          const { [currentUndoId]: _, ...rest } = s.deletedScenarios
          return { deletedScenarios: rest }
        })
      }
    }, UNDO_WINDOW_MS)
  },

  undoDelete: () => {
    const undoId = useWorkspace.getState()._deleteUndoId
    if (!undoId) return
    const scenario = get().deletedScenarios[undoId]
    if (!scenario) return
    if (undoTimer) clearTimeout(undoTimer)
    pendingUndoId = null
    const now = new Date().toISOString()
    set((s) => {
      const { [undoId]: restored, ...rest } = s.deletedScenarios
      return {
        scenarios: { ...s.scenarios, [undoId]: restored },
        deletedScenarios: rest,
        _deleteUndoId: null,
        lastUpdated: now,
      }
    })
    persistDebounced(snapshotState(get()))
  },

  renameScenario: (id, name) => {
    set((s) => ({
      scenarios: {
        ...s.scenarios,
        [id]: s.scenarios[id] ? { ...s.scenarios[id], name, updatedAt: new Date().toISOString() } : s.scenarios[id],
      },
      lastUpdated: new Date().toISOString(),
    }))
    persistDebounced(snapshotState(get()))
  },

  updateScenarioTags: (id, tags) => {
    set((s) => ({
      scenarios: {
        ...s.scenarios,
        [id]: s.scenarios[id] ? { ...s.scenarios[id], tags, updatedAt: new Date().toISOString() } : s.scenarios[id],
      },
      lastUpdated: new Date().toISOString(),
    }))
    persistDebounced(snapshotState(get()))
  },

  saveToScenario: (id, parameters) => {
    set((s) => ({
      scenarios: {
        ...s.scenarios,
        [id]: s.scenarios[id] ? { ...s.scenarios[id], parameters: { ...parameters }, updatedAt: new Date().toISOString() } : s.scenarios[id],
      },
      lastUpdated: new Date().toISOString(),
    }))
    persistDebounced(snapshotState(get()))
  },

  loadScenario: (id) => {
    const scenario = get().scenarios[id]
    if (!scenario) return null
    set({ activeScenarioId: id, lastUpdated: new Date().toISOString() })
    persistDebounced(snapshotState(get()))
    return scenario
  },

  setActiveScenario: (id) => {
    set({ activeScenarioId: id, lastUpdated: new Date().toISOString() })
    persistDebounced(snapshotState(get()))
  },

  addFavorite: (modelId) => {
    const current = get().favorites.modelIds
    if (current.includes(modelId)) return
    set({
      favorites: { modelIds: [...current, modelId] },
      lastUpdated: new Date().toISOString(),
    })
    persistDebounced(snapshotState(get()))
  },

  removeFavorite: (modelId) => {
    set((s) => ({
      favorites: { modelIds: s.favorites.modelIds.filter((m) => m !== modelId) },
      lastUpdated: new Date().toISOString(),
    }))
    persistDebounced(snapshotState(get()))
  },

  reorderFavorites: (modelIds) => {
    set({
      favorites: { modelIds },
      lastUpdated: new Date().toISOString(),
    })
    persistDebounced(snapshotState(get()))
  },

  recordRun: (snap) => {
    const entry: ModelExecutionSnapshot = {
      ...snap,
      runId: uid(),
      timestamp: new Date().toISOString(),
    }
    set((s) => {
      const runs = [entry, ...s.recentRuns].slice(0, MAX_RECENT_RUNS)
      return { recentRuns: runs, lastUpdated: new Date().toISOString() }
    })
    persistDebounced(snapshotState(get()))
  },

  restoreRun: (runId) => {
    const run = get().recentRuns.find((r) => r.runId === runId)
    return run ?? null
  },

  clearHistory: () => {
    set({ recentRuns: [], lastUpdated: new Date().toISOString() })
    persistDebounced(snapshotState(get()))
  },

  savePreset: (name, modelId, parameters, tags = []) => {
    const id = uid()
    const preset: ParameterPreset = {
      id,
      name,
      modelId,
      parameters: { ...parameters },
      tags,
      createdAt: new Date().toISOString(),
    }
    set((s) => ({
      presets: { ...s.presets, [id]: preset },
      lastUpdated: new Date().toISOString(),
    }))
    persistDebounced(snapshotState(get()))
    return id
  },

  deletePreset: (id) => {
    set((s) => {
      const { [id]: _, ...rest } = s.presets
      return { presets: rest, lastUpdated: new Date().toISOString() }
    })
    persistDebounced(snapshotState(get()))
  },

  applyPreset: (id) => {
    const preset = get().presets[id]
    return preset ?? null
  },

  getModelPresets: (modelId) => {
    return Object.values(get().presets).filter((p) => p.modelId === modelId)
  },
}))

export async function extractModelParams(modelId: ModelId): Promise<Record<string, number | string | boolean>> {
  const m = await import('../store/models')
  const extractors: Record<ModelId, () => Record<string, number | string | boolean>> = {
    bs: () => {
      const s = m.useBs.getState()
      return { opt: s.opt, metric: s.metric, S0: s.S0, K: s.K, T: s.T, r: s.r, sig: s.sig, scheme: s.scheme, wire: s.wire, grid: s.grid, axes: s.axes, rot: s.rot }
    },
    heston: () => {
      const s = m.useHeston.getState()
      return { opt: s.opt, metric: s.metric, S0: s.S0, K: s.K, T: s.T, r: s.r, v0: s.v0, kappa: s.kappa, theta: s.theta, sigv: s.sigv, rho: s.rho, scheme: s.scheme, wire: s.wire, grid: s.grid, axes: s.axes, rot: s.rot }
    },
    bl: () => {
      const s = m.useBl.getState()
      return { metric: s.metric, src: s.src, lam: s.lam, tau: s.tau, del: s.del, q1: s.q1, q2: s.q2, scheme: s.scheme, wire: s.wire, grid: s.grid, axes: s.axes, rot: s.rot }
    },
    mc: () => {
      const s = m.useMc.getState()
      return { metric: s.metric, S0: s.S0, mu: s.mu, sig: s.sig, T: s.T, r: s.r, npaths: s.npaths, gam: s.gam, scheme: s.scheme, wire: s.wire, grid: s.grid, axes: s.axes, rot: s.rot }
    },
    apt: () => {
      const s = m.useApt.getState()
      return { metric: s.metric, r: s.r, lam: s.lam, lams: s.lams, lamv: s.lamv, b3: s.b3, al: s.al, scheme: s.scheme, wire: s.wire, grid: s.grid, axes: s.axes, rot: s.rot }
    },
  }
  return extractors[modelId]()
}

export async function applyModelParams(modelId: ModelId, params: Record<string, number | string | boolean>) {
  const m = await import('../store/models')
  const safeParams: Record<string, number | string | boolean> = {}
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') {
      safeParams[k] = v
    }
  }
  const setters: Record<ModelId, () => void> = {
    bs: () => m.useBs.getState().set(safeParams as Partial<BsState>),
    heston: () => m.useHeston.getState().set(safeParams as Partial<HestonState>),
    bl: () => m.useBl.getState().set(safeParams as Partial<BlState>),
    mc: () => m.useMc.getState().set(safeParams as Partial<McState>),
    apt: () => m.useApt.getState().set(safeParams as Partial<AptState>),
  }
  setters[modelId]()
}
