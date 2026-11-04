import { describe, expect, it } from 'vitest'
import { simulateMc } from '../../../lib/math'
import { buildMill, NBINS, THREADS, X_CLAMP } from './model'

const sim = simulateMc({ S0: 100, mu: 0.08, sig: 0.2, T: 10, npaths: 100, gam: 3, seed: 42 })
const model = buildMill(sim)

describe('buildMill', () => {
  it('bins account for every simulated path', () => {
    const counted = model.bins.reduce((sum, b) => sum + b.count, 0)
    expect(model.bins).toHaveLength(NBINS)
    expect(counted).toBe(sim.N)
    expect(model.total).toBe(sim.N)
  })

  it('every thread lands inside the bin its terminal price claims', () => {
    expect(model.threads).toHaveLength(THREADS)
    for (const thread of model.threads) {
      const bin = model.bins[thread.bin]
      const tip = thread.pts[thread.pts.length - 1]
      expect(tip).toBeDefined()
      expect(tip![0]).toBeGreaterThanOrEqual(bin.x0 - 1e-9)
      expect(tip![0]).toBeLessThanOrEqual(bin.x1 + 1e-9)
    }
  })

  it('keeps every plotted point inside the price clamp', () => {
    for (const thread of model.threads) {
      for (const [x] of thread.pts) {
        expect(Math.abs(x)).toBeLessThanOrEqual(X_CLAMP + 1e-9)
      }
    }
  })

  it('bin edges are ordered and span the terminal range', () => {
    expect(model.bins[0].x0).toBeLessThan(model.bins[NBINS - 1].x1)
    for (let i = 1; i < NBINS; i++) {
      expect(model.bins[i].x0).toBeCloseTo(model.bins[i - 1].x1, 9)
    }
    expect(model.hi).toBeGreaterThan(model.lo)
  })
})
