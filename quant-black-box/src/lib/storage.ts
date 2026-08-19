import type { WorkspaceState } from '../types/workspace'
import { SCHEMA_VERSION } from '../types/workspace'

const DB_NAME = 'quant-bb-workspace'
const DB_VERSION = 1
const STORE_NAME = 'state'
const LS_KEY = 'quant-bb-workspace'
const STATE_KEY = 'workspace'

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

class IndexedDBProvider implements StorageProvider {
  private dbPromise: Promise<IDBDatabase> | null = null

  private open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME)
          }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    }
    return this.dbPromise
  }

  async load(): Promise<WorkspaceState | null> {
    try {
      const db = await this.open()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(STATE_KEY)
        req.onsuccess = () => {
          const raw = req.result as WorkspaceState | undefined
          resolve(raw ? migrate(raw) : null)
        }
        req.onerror = () => reject(req.error)
      })
    } catch {
      return null
    }
  }

  async save(state: WorkspaceState): Promise<void> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(state, STATE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async clear(): Promise<void> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}

class LocalStorageProvider implements StorageProvider {
  async load(): Promise<WorkspaceState | null> {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as WorkspaceState
      return migrate(parsed)
    } catch {
      return null
    }
  }

  async save(state: WorkspaceState): Promise<void> {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  }

  async clear(): Promise<void> {
    localStorage.removeItem(LS_KEY)
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
    providerPromise = detectProvider()
  }
  return providerPromise
}

async function detectProvider(): Promise<StorageProvider> {
  if (typeof indexedDB === 'undefined') {
    return new LocalStorageProvider()
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('__provider_test__')
      req.onsuccess = () => {
        req.result.close()
        indexedDB.deleteDatabase('__provider_test__')
        resolve()
      }
      req.onerror = () => reject(req.error)
      req.onblocked = () => reject(new Error('blocked'))
    })
    return new IndexedDBProvider()
  } catch {
    return new LocalStorageProvider()
  }
}

export { defaultState }
