const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export interface KfApiParams {
  n: number
  m: number
  Q: number
  R: number
  nDays: number
  seed: number
}

export interface KfTickResult {
  step: number
  trueState: number[]
  observation: number[]
  filteredState: number[]
  stateCovDiag: number[]
  innovation: number[]
  kalmanGain: number[][]
  traceP: number
}

export async function fetchKf(params: KfApiParams): Promise<KfTickResult[]> {
  const res = await fetch(`${API_BASE}/kf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    throw new Error(`KF API error: ${res.status}`)
  }
  const data = await res.json()
  return data.ticks
}
