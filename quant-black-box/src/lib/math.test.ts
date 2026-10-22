import { describe, expect, it } from 'vitest'
import { aptRet, blSolve, bs, hestonPrice, hestonSimStats, kalmanFilter, mcStats, normCdf, simulateHeston, simulateMc, HESTON_STEPS } from './math'
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

describe('mcStats', () => {
  const sim = simulateMc({ S0: 100, mu: 0.08, sig: 0.2, T: 1, npaths: 5000, gam: 2 })
  const st = mcStats(sim, 2)

  it('matches the seeded reference run', () => {
    expect(st.mean).toBeCloseTo(107.8393, 3)
    expect(st.median).toBeCloseTo(105.7507, 3)
    expect(st.ci95).toBeCloseTo(0.5947, 3)
    expect(st.util).toBeCloseTo(0.9904, 3)
  })

  it('is internally consistent', () => {
    expect(st.min).toBeLessThanOrEqual(st.median)
    expect(st.median).toBeLessThanOrEqual(st.max)
    expect(st.var5).toBeLessThan(st.mean)
    expect(st.losses).toBeGreaterThanOrEqual(0)
    expect(st.losses).toBeLessThanOrEqual(1)
    expect(st.ci95).toBeCloseTo((1.96 * st.sd) / Math.sqrt(sim.N), 12)
  })

  it('reports the tail percentiles, shape and drawdown consistently', () => {
    expect(st.p95).toBeGreaterThanOrEqual(st.median)
    expect(st.p95).toBeLessThanOrEqual(st.max)
    // terminal wealth is lognormal, so it must skew right
    expect(st.skew).toBeGreaterThan(0)
    expect(st.kurt).toBeGreaterThan(-3)
    // drawdowns are measured from a running peak, so both are non-positive,
    // and the95% drawdown-at-Risk sits between the worst and zero
    expect(st.maxDD).toBeLessThanOrEqual(0)
    expect(st.dd95).toBeLessThanOrEqual(0)
    expect(st.maxDD).toBeLessThanOrEqual(st.dd95)
    expect(st.maxDD).toBeCloseTo(Math.min(...sim.dd), 12)
  })
})

describe('simulateMc paths', () => {
  const sim = simulateMc({ S0: 100, mu: 0.08, sig: 0.2, T: 1, npaths: 300, gam: 3 })

  it('keeps a path id behind every sorted path', () => {
    expect(sim.order).toHaveLength(sim.N)
    expect([...sim.order].sort((a, b) => a - b)).toEqual(sim.order.map((_, i) => i))
    for (let i = 1; i < sim.term.length; i++) {
      expect(sim.term[i]).toBeGreaterThanOrEqual(sim.term[i - 1])
    }
  })

  it('measures a max drawdown for every path', () => {
    expect(sim.dd).toHaveLength(sim.N)
    for (const d of sim.dd) expect(d).toBeLessThanOrEqual(0)
  })

  it('reproduces the default run and re-samples on a new seed', () => {
    const base = { S0: 100, mu: 0.08, sig: 0.2, T: 1, npaths: 200, gam: 3 } as const
    expect(simulateMc({ ...base }).term).toEqual(simulateMc({ ...base }).term)
    expect(simulateMc({ ...base, seed: 7 }).term).not.toEqual(simulateMc({ ...base }).term)
  })
})

describe('simulateHeston paths', () => {
  const base = { S0: 100, T: 1, r: 0.05, v0: 0.04, kappa: 2, theta: 0.04, sigv: 0.3, rho: -0.5, npaths: 3000 }

  it('returns finite, index-aligned price/vol pairs sorted by terminal price', () => {
    const sim = simulateHeston(base)
    expect(sim.price).toHaveLength(sim.N)
    expect(sim.vol).toHaveLength(sim.N)
    expect(sim.order).toHaveLength(sim.N)
    expect([...sim.order].sort((a, b) => a - b)).toEqual(sim.order.map((_, i) => i))
    for (let i = 1; i < sim.term.length; i++) {
      expect(sim.term[i]).toBeGreaterThanOrEqual(sim.term[i - 1])
    }
    expect(sim.price[0].length).toBe(HESTON_STEPS + 1)
    expect(sim.vol[0].length).toBe(HESTON_STEPS + 1)
    for (let k = 0; k < sim.N; k++) {
      for (const v of sim.price[k]) expect(Number.isFinite(v)).toBe(true)
      for (const v of sim.vol[k]) expect(Number.isFinite(v) && v >= 0).toBe(true)
    }
  })

  it('full truncation keeps variance non-negative: no NaN anywhere', () => {
    // aggressive vol-of-vol + long horizon stress-tests the Euler scheme
    const sim = simulateHeston({ ...base, sigv: 1.0, T: 2 })
    for (let k = 0; k < sim.N; k++) {
      for (const v of sim.vol[k]) expect(Number.isFinite(v) && v >= 0).toBe(true)
      expect(sim.dd[k]).toBeLessThanOrEqual(0)
    }
  })

  it('reproduces the drift: E[S_T] ~ S0 * exp(r * T)', () => {
    const sim = simulateHeston(base)
    const mean = sim.term.reduce((a, b) => a + b, 0) / sim.N
    const expected = base.S0 * Math.exp(base.r * base.T)
    expect(mean).toBeGreaterThan(expected * 0.99)
    expect(mean).toBeLessThan(expected * 1.01)
  })

  it('reproduces the default run and re-samples on a new seed', () => {
    expect(simulateHeston(base).term).toEqual(simulateHeston(base).term)
    expect(simulateHeston({ ...base, seed: 7 }).term).not.toEqual(simulateHeston(base).term)
  })

  it('hestonSimStats stays in sane ranges', () => {
    const sim = simulateHeston(base)
    const st = hestonSimStats(sim)
    expect(st.mean).toBeGreaterThan(0)
    expect(st.losses).toBeGreaterThanOrEqual(0)
    expect(st.losses).toBeLessThanOrEqual(1)
    expect(st.maxDD).toBeLessThanOrEqual(0)
    expect(st.eVol).toBeGreaterThan(0)
  })
})
