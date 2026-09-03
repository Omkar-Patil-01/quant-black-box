import { describe, expect, it } from 'vitest'
import { aptRet, blSolve, bs, hestonPrice, kalmanFilter, normCdf, simulateMc } from './math'

describe('normCdf', () => {
  it('matches known values', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6)
    expect(normCdf(1.96)).toBeCloseTo(0.975, 3)
    expect(normCdf(-1)).toBeCloseTo(1 - normCdf(1), 10)
  })
})

describe('Black-Scholes', () => {
  const S0 = 100
  const K = 100
  const T = 1
  const r = 0.05
  const s = 0.2

  it('prices an ATM call around intrinsic+time value', () => {
    const m = bs(S0, K, T, r, s)!
    expect(m.C).toBeGreaterThan(0)
    expect(m.C).toBeCloseTo(10.45, 1)
  })

  it('satisfies put-call parity C - P = S0 - K e^{-rT}', () => {
    const m = bs(S0, K, T, r, s)!
    expect(m.C - m.P).toBeCloseTo(S0 - K * Math.exp(-r * T), 8)
  })

  it('has delta in [0,1] for calls and [-1,0] for puts', () => {
    const m = bs(S0, K, T, r, s)!
    expect(m.delta).toBeGreaterThan(0)
    expect(m.delta).toBeLessThan(1)
    expect(m.deltaP).toBeGreaterThan(-1)
    expect(m.deltaP).toBeLessThan(0)
  })

  it('returns null for degenerate inputs', () => {
    expect(bs(0, 100, 1, 0.05, 0.2)).toBeNull()
    expect(bs(100, 100, 0, 0.05, 0.2)).toBeNull()
  })
})

describe('Heston', () => {
  it('approximates Black-Scholes when vol-of-vol is small', () => {
    const params = { r: 0.05, v0: 0.04, kappa: 1, theta: 0.04, sigv: 0.05, rho: 0 }
    const m = hestonPrice(100, 100, 1, params)
    const bsM = bs(100, 100, 1, 0.05, 0.2)!
    expect(Math.abs(m.C - bsM.C)).toBeLessThan(0.7)
    expect(Math.abs(m.P - bsM.P)).toBeLessThan(0.7)
  })

  it('satisfies put-call parity and stays in bounds across parameter extremes', () => {
    const cases = [
      { r: 0.05, v0: 0.04, kappa: 0.3, theta: 0.15, sigv: 0.8, rho: 0.9 },
      { r: 0.05, v0: 0, kappa: 2, theta: 0.1, sigv: 0.5, rho: -0.3 },
      { r: 0.05, v0: 0.04, kappa: 0, theta: 0.04, sigv: 0, rho: 0 },
      { r: 0.05, v0: 0.25, kappa: 2.5, theta: 0.25, sigv: 2, rho: 0.7 },
    ]
    for (const p of cases) {
      const m = hestonPrice(100, 100, 1, p)
      for (const v of Object.values(m)) expect(Number.isFinite(v)).toBe(true)
      expect(m.C).toBeGreaterThan(0)
      expect(m.P).toBeGreaterThan(0)
      expect(m.delta).toBeGreaterThan(0)
      expect(m.delta).toBeLessThan(1)
      expect(m.C - m.P).toBeCloseTo(100 - 100 * Math.exp(-0.05), 8)
    }
  })
})

describe('Black-Litterman', () => {
  it('reproduces the views closely at the reference tau', () => {
    const tau = 0.05
    const res = blSolve(tau, { lam: 2.5, del: 0.1, q1: 0.05, q2: 0.08 })
    expect(Math.abs(res.res1)).toBeLessThan(0.02)
    expect(Math.abs(res.res2)).toBeLessThan(0.02)
  })

  it('matches views more tightly as view uncertainty shrinks', () => {
    const wide = blSolve(0.05, { lam: 2.5, del: 0.1, q1: 0.05, q2: 0.08 })
    const tight = blSolve(0.05, { lam: 2.5, del: 0.001, q1: 0.05, q2: 0.08 })
    expect(Math.abs(tight.res1)).toBeLessThan(Math.abs(wide.res1))
    expect(Math.abs(tight.res2)).toBeLessThan(Math.abs(wide.res2))
  })

  it('reduces to the equilibrium when views are absent', () => {
    const res = blSolve(0.05, { lam: 2.5, del: 0.1, q1: 0, q2: 0 })
    expect(res.Pi).toHaveLength(4)
    res.Pi.forEach((v) => expect(Number.isFinite(v)).toBe(true))
  })
})

describe('Monte Carlo', () => {
  it('converges towards the geometric mean S0 e^{(mu - sigma^2/2) T}', () => {
    const sim = simulateMc({ S0: 100, mu: 0.1, sig: 0.25, T: 1, npaths: 2000, gam: 3 })
    const mlr = sim.term.reduce((a, b) => a + Math.log(b / 100), 0) / sim.term.length
    expect(Math.abs(mlr - (0.1 - 0.25 * 0.25 / 2))).toBeLessThan(0.05)
  })
})

describe('APT', () => {
  it('is linear in factor exposures', () => {
    const p = { r: 0.05, lam: 0.08, lams: 0.03, lamv: 0.05, b3: 0.5, al: 0.02 }
    const a = aptRet(1, 0.5, true, p)
    const b = aptRet(0, 0, false, p)
    const c = aptRet(1, 0.5, false, p)
    expect(a - c).toBeCloseTo(p.al, 12)
    expect(c - b).toBeCloseTo(1 * p.lam + 0.5 * p.lams, 12)
  })
})

describe('Kalman Filter', () => {
  it('returns correct number of ticks', () => {
    const result = kalmanFilter({ n: 2, m: 1, Q: 0.01, R: 0.1, nDays: 20, seed: 42 })
    expect(result).toHaveLength(21)
  })

  it('has Kalman gain bounded in [0, 1]', () => {
    const result = kalmanFilter({ n: 2, m: 1, Q: 0.01, R: 0.1, nDays: 30, seed: 42 })
    for (const tick of result) {
      for (const row of tick.kalmanGain) {
        for (const v of row) {
          expect(v).toBeGreaterThanOrEqual(-0.01)
          expect(v).toBeLessThanOrEqual(1.01)
        }
      }
    }
  })

  it('converges: trace(P) decreases for fully observed system', () => {
    const result = kalmanFilter({ n: 1, m: 1, Q: 0.01, R: 0.1, nDays: 40, seed: 42 })
    const early = result[5].traceP
    const late = result[35].traceP
    expect(late).toBeLessThan(early)
  })

  it('first tick has zero observations', () => {
    const result = kalmanFilter({ n: 2, m: 1, Q: 0.01, R: 0.1, nDays: 10, seed: 42 })
    expect(result[0].observation[0]).toBe(0)
    expect(result[0].innovation[0]).toBe(0)
  })

  it('handles 1D case (n=1, m=1)', () => {
    const result = kalmanFilter({ n: 1, m: 1, Q: 0.05, R: 0.5, nDays: 15, seed: 99 })
    expect(result).toHaveLength(16)
    expect(result[0].filteredState).toHaveLength(1)
    expect(result[0].stateCovDiag).toHaveLength(1)
  })

  it('produces deterministic results for same seed', () => {
    const a = kalmanFilter({ n: 2, m: 1, Q: 0.01, R: 0.1, nDays: 10, seed: 42 })
    const b = kalmanFilter({ n: 2, m: 1, Q: 0.01, R: 0.1, nDays: 10, seed: 42 })
    expect(a).toEqual(b)
  })
})
