export const SCHEMA_VERSION = '1.0.0'

export type ModelId = 'bs' | 'heston' | 'bl' | 'mc' | 'apt'

const VALID_MODEL_IDS: ModelId[] = ['bs', 'heston', 'bl', 'mc', 'apt']

export function isModelId(value: string): value is ModelId {
  return (VALID_MODEL_IDS as string[]).includes(value)
}

export interface ScenarioConfig {
  id: string
  name: string
  modelId: ModelId
  description?: string
  createdAt: string
  updatedAt: string
  parameters: Record<string, number | string | boolean>
  calibrationSettings?: {
    optimizer: string
    targetTolerance: number
  }
  tags: string[]
}

export interface ModelExecutionSnapshot {
  runId: string
  timestamp: string
  runtimeMs: number
  modelId: ModelId
  scenarioName: string
  inputs: Record<string, unknown>
  outputsSummary: Record<string, number>
}

export interface ParameterPreset {
  id: string
  name: string
  modelId: ModelId
  parameters: Record<string, number | string | boolean>
  tags: string[]
  createdAt: string
}

export interface FavoriteConfig {
  modelIds: ModelId[]
}

export interface WorkspaceState {
  version: string
  activeModelId: ModelId | null
  activeScenarioId: string | null
  lastUpdated: string

  favorites: FavoriteConfig
  scenarios: Record<string, ScenarioConfig>
  recentRuns: ModelExecutionSnapshot[]
  presets: Record<string, ParameterPreset>

  deletedScenarios: Record<string, ScenarioConfig>
  lastModelParams: Record<string, number | string | boolean> | null
}
