import type { WorkspaceState } from '../types/workspace'
import { SCHEMA_VERSION } from '../types/workspace'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api') + '/workspace'

export interface StorageProvider {
  load(): Promise<WorkspaceState | null>
  save(state: WorkspaceState): Promise<void>
  clear(): Promise<void>
}

function defaultState(): WorkspaceState {
  return {
    version: SCHEMA_VERSION,
    activeModelId: null,
    activeScenarioId: null,
    lastUpdated: new Date().toISOString(),
    favorites: { modelIds: ['bs', 'heston', 'bl', 'mc', 'apt'] },
    scenarios: {},
    recentRuns: [],
    presets: {},
    deletedScenarios: {},
    lastModelParams: null,
  }
}

class ApiProvider implements StorageProvider {
  async load(): Promise<WorkspaceState | null> {
    try {
      const res = await fetch(API_BASE)
      if (!res.ok) return null
      const data = await res.json()
      return migrate(data as WorkspaceState)
    } catch {
      return null
    }
  }

  async save(state: WorkspaceState): Promise<void> {
    try {
      await fetch(API_BASE, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })
    } catch {
      // Backend unavailable — silent fail
    }
  }

  async clear(): Promise<void> {
    try {
      await fetch(API_BASE, { method: 'DELETE' })
    } catch {
      // Backend unavailable — silent fail
    }
  }
}

type Migration = (old: WorkspaceState) => WorkspaceState

const migrations: Record<string, Migration> = {
  '0.9.0': (old) => {
    const s = { ...old }
    if (!s.deletedScenarios) s.deletedScenarios = {}
    if (!s.presets) s.presets = {}
    s.version = '1.0.0'
    return s
  },
}

function migrate(raw: WorkspaceState): WorkspaceState {
  let state = { ...raw }
  const versions = Object.keys(migrations).sort(compareVersions)
  for (const v of versions) {
    if (compareVersions(state.version, v) < 0) {
      state = migrations[v](state)
    }
  }
  state.version = SCHEMA_VERSION
  return state
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

let providerPromise: Promise<StorageProvider> | null = null

export function getStorageProvider(): Promise<StorageProvider> {
  if (!providerPromise) {
    providerPromise = Promise.resolve(new ApiProvider())
  }
  return providerPromise
}

export { defaultState }
