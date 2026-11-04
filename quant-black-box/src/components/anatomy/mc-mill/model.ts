import { MC_STEPS, type McSimulation } from '../../../lib/math'
import type { Point3 } from '../../iso/iso-kit'
import { BIN_MAX_H, COL_CENTER_Y, COL_Y, EXIT_Y, EXIT_Z, LAND_Y, LAND_Z, RACK_Z } from './view'

/** The machine reads the simulation: bins = the histogram, threads = sampled paths. */
export const NBINS = 15
export const THREADS = 7
export const SAMPLE_PTS = 22
/** half-width of the price axis in world units */
export const X_REACH = 132
export const X_CLAMP = 134

export interface MillBin {
  x0: number
  x1: number
  count: number
  frac: number
}

export interface MillThread {
  /** mouth → deck → tip over the rack edge → onto its bin's grain column */
  pts: Point3[]
  bin: number
}

export interface MillModel {
  bins: MillBin[]
  threads: MillThread[]
  lo: number
  hi: number
  mid: number
  span: number
  maxCount: number
  total: number
}

const binOf = (v: number, lo: number, span: number) =>
  Math.min(NBINS - 1, Math.max(0, Math.floor(((v - lo) / span) * NBINS)))

export function buildMill(sim: McSimulation): MillModel {
  const term = sim.term
  let lo = Infinity
  let hi = -Infinity
  for (const v of term) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  const span = hi - lo || 1
  const mid = (lo + hi) / 2
  const scale = X_REACH / (span / 2)
  const xOf = (p: number) => Math.max(-X_CLAMP, Math.min(X_CLAMP, (p - mid) * scale))

  const counts = new Array<number>(NBINS).fill(0)
  for (const v of term) counts[binOf(v, lo, span)]++
  const maxCount = Math.max(1, ...counts)

  const bins: MillBin[] = Array.from({ length: NBINS }, (_, i) => {
    const a = lo + (span * i) / NBINS
    const b = lo + (span * (i + 1)) / NBINS
    return { x0: xOf(a), x1: xOf(b), count: counts[i], frac: counts[i] / sim.N }
  })

  // Sample the distribution, not the ordering: one thread per percentile.
  const threads: MillThread[] = []
  for (let k = 0; k < THREADS; k++) {
    const idx = Math.round((k / (THREADS - 1)) * (sim.N - 1))
    const path = sim.sorted[idx]
    const pts: Point3[] = []
    for (let j = 0; j < SAMPLE_PTS; j++) {
      const u = j / (SAMPLE_PTS - 1)
      const step = Math.round(u * MC_STEPS)
      pts.push([xOf(path[step]), EXIT_Y + (LAND_Y - EXIT_Y) * u, EXIT_Z + (LAND_Z - EXIT_Z) * u])
    }
    const bin = binOf(term[idx], lo, span)
    const x = xOf(term[idx])
    const top = RACK_Z + (counts[bin] / maxCount) * BIN_MAX_H
    // over the lip of the rack, then straight down onto the pile its own bin holds
    pts.push([x, COL_Y - 4, LAND_Z - 3])
    pts.push([x, COL_CENTER_Y, top + 2])
    threads.push({ pts, bin })
  }

  return { bins, threads, lo, hi, mid, span, maxCount, total: sim.N }
}
