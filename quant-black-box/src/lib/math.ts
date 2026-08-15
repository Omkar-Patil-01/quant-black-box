/* ═════════ BSM ENGINE ═════════ */

export function normCdf(x: number): number {
  if (!Number.isFinite(x)) return x > 0 ? 1 : 0
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989422804014327 * Math.exp(-0.5 * x * x)
  const poly =
    0.31938153 * t -
    0.356563782 * t * t +
    1.781477937 * t * t * t -
    1.821255978 * t * t * t * t +
    1.330274429 * t * t * t * t * t
  const c = 1 - d * poly
  return x >= 0 ? c : 1 - c
}

export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

export interface BsResult {
  C: number
  P: number
  delta: number
  deltaP: number
  gamma: number
  vega: number
  theta: number
  rho: number
  d1: number
  d2: number
}

export function bs(S0: number, K: number, T: number, r: number, s: number): BsResult | null {
  if (!(T > 0) || !(s > 0) || !(S0 > 0) || !(K > 0)) return null
  const d1 = (Math.log(S0 / K) + (r + (s * s) / 2) * T) / (s * Math.sqrt(T))
  const d2 = d1 - s * Math.sqrt(T)
  const N = normCdf
  const d = N(d1)
  const dN = N(d2)
  const pd = normPdf(d1)
  const rt = Math.sqrt(T)
  const e = Math.exp(-r * T)
  return {
    C: S0 * d - K * e * dN,
    P: K * e * normCdf(-d2) - S0 * normCdf(-d1),
    delta: d,
    deltaP: d - 1,
    gamma: pd / (S0 * s * rt),
    vega: S0 * pd * rt,
    theta: -S0 * pd * s / (2 * rt) - r * K * e * dN,
    rho: K * T * e * dN,
    d1,
    d2,
  }
}

/* ═════════ HESTON ENGINE (LORD–KAHALE–JACKEL CF) ═════════ */

export interface HestonParams {
  r: number
  v0: number
  kappa: number
  theta: number
  sigv: number
  rho: number
}

export interface HestonResult {
  C: number
  P: number
  delta: number
  deltaP: number
}

type Complex = [number, number]

const ca = (a: Complex, b: Complex): Complex => [a[0] + b[0], a[1] + b[1]]
const cs = (a: Complex, b: Complex): Complex => [a[0] - b[0], a[1] - b[1]]
const cm = (a: Complex, b: Complex): Complex => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]
const cd = (a: Complex, b: Complex): Complex => {
  const d = b[0] * b[0] + b[1] * b[1]
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]
}
const ce = (z: Complex): Complex => {
  const e = Math.exp(z[0])
  return [e * Math.cos(z[1]), e * Math.sin(z[1])]
}
const cl = (z: Complex): Complex => [Math.log(Math.hypot(z[0], z[1])), Math.atan2(z[1], z[0])]
const csq = (z: Complex): Complex => {
  const r = Math.hypot(z[0], z[1])
  return [
    Math.sqrt(Math.max(0, (r + z[0]) / 2)),
    Math.sign(z[1] || 0) * Math.sqrt(Math.max(0, (r - z[0]) / 2)),
  ]
}

interface HestonArgs extends HestonParams {
  S0: number
  K: number
  T: number
}

function hestonCf(z: Complex, a: HestonArgs): Complex {
  const { v0, kappa, theta, sigv, rho } = a
  const sv = Math.max(sigv, 1e-6)
  const iz: Complex = [-z[1], z[0]]
  const A = cs([kappa, 0], cm([rho * sv, 0], iz))
  const B = cm([sv * sv, 0], ca(cm(z, z), iz))
  const d = csq(ca(cm(A, A), B))
  const x = Math.log(a.S0) + a.r * a.T
  if (Math.hypot(d[0], d[1]) < 1e-9) return ce([iz[0] * x, iz[1] * x])
  const E = ce([-d[0] * a.T, -d[1] * a.T])
  const Apd = ca(A, d)
  const Amd = cs(A, d)
  const den = ca(cm(A, cs([1, 0], E)), cm(d, ca([1, 0], E)))
  const D = cm(cm(Amd, Apd), cd(cs([1, 0], E), cm([sv * sv, 0], den)))
  const C = cm(
    [kappa * theta / (sv * sv), 0],
    cs(cm(Amd, [a.T, 0]), cm([2, 0], cl(cd(den, cm([2, 0], d))))),
  )
  const arg = ca(ca(C, cm(D, [v0, 0])), [iz[0] * x, iz[1] * x])
  return ce(arg)
}

function hestonCf1(u: number, a: HestonArgs): Complex {
  return cd(hestonCf([u, -1], a), hestonCf([0, -1], a))
}

function hestonCf2(u: number, a: HestonArgs): Complex {
  return hestonCf([u, 0], a)
}

function hestonIntegrand(u: number, fn: (u: number) => Complex, a: HestonArgs): number {
  if (u === 0) return 0
  const phi = fn(u)
  const iu = cd(phi, [0, u])
  const e: Complex = [Math.cos(-u * Math.log(a.K)), Math.sin(-u * Math.log(a.K))]
  const prod = cm(e, iu)
  return prod[0]
}

function adaptiveSimpson(fn: (x: number) => number, a: number, b: number, tol: number): number {
  const m = (a + b) / 2
  const fa = fn(a)
  const fm = fn(m)
  const fb = fn(b)
  const whole = ((b - a) / 6) * (fa + 4 * fm + fb)
  const rec = (lo: number, hi: number, flo: number, fmid: number, fhi: number, est: number): number => {
    const mid = (lo + hi) / 2
    const lmid = (lo + mid) / 2
    const rmid = (mid + hi) / 2
    const fl = fn(lmid)
    const fr = fn(rmid)
    const hh = (hi - lo) / 12
    const left = hh * (flo + 4 * fl + fmid)
    const right = hh * (fmid + 4 * fr + fhi)
    const delta = left + right - est
    if (Math.abs(delta) <= 15 * tol) return left + right + delta / 15
    return rec(lo, mid, flo, fl, fmid, left) + rec(mid, hi, fmid, fr, fhi, right)
  }
  return rec(a, b, fa, fm, fb, whole)
}

function hestonIntegrate(opts: Required<HestonIntegralOpts>, mode: 'p1' | 'both', a: HestonArgs): number | HestonResult {
  const { U, panels, tol } = opts
  const integrate = (fn: (u: number) => Complex): number => {
    const width = U / panels
    let total = 0
    for (let p = 0; p < panels; p++) {
      total += adaptiveSimpson((u) => hestonIntegrand(u, fn, a), p * width, (p + 1) * width, tol)
    }
    return total
  }
  const P1 = 0.5 + integrate((u) => hestonCf1(u, a)) / Math.PI
  if (mode === 'p1') return P1
  const P2 = 0.5 + integrate((u) => hestonCf2(u, a)) / Math.PI
  const disc = Math.exp(-a.r * a.T)
  const C = a.S0 * P1 - a.K * disc * P2
  const P = C - a.S0 + a.K * disc
  return { C, P, delta: P1, deltaP: P1 - 1 }
}

export function hestonP1(S: number, K: number, T: number, p: HestonParams, opts?: HestonIntegralOpts): number {
  const a: HestonArgs = { S0: S, K, T, ...p }
  return hestonIntegrate({ U: opts?.U ?? 300, panels: opts?.panels ?? 24, tol: opts?.tol ?? 1e-6 }, 'p1', a) as number
}

export interface HestonIntegralOpts {
  U?: number
  panels?: number
  tol?: number
}

export function hestonPrice(S: number, K: number, T: number, p: HestonParams, opts?: HestonIntegralOpts): HestonResult {
  const a: HestonArgs = { S0: S, K, T, ...p }
  return hestonIntegrate({ U: opts?.U ?? 300, panels: opts?.panels ?? 24, tol: opts?.tol ?? 1e-6 }, 'both', a) as HestonResult
}

/* ═════════ BLACK-LITTERMAN ENGINE ═════════ */

export const BL_NASSET = 4
export const BL_NAMES = ['EQUITY', 'BOND', 'GOLD', 'CRYPTO']
export const BL_SIGMA: number[][] = [
  [0.04, 0.006, 0.004, 0.01],
  [0.006, 0.01, 0.002, -0.004],
  [0.004, 0.002, 0.025, 0.005],
  [0.01, -0.004, 0.005, 0.16],
]
export const BL_WMKT = [0.45, 0.35, 0.15, 0.05]
export const BL_PVIEW: number[][] = [
  [1, -1, 0, 0],
  [0, 0, 1, 0],
]

export interface BlParams {
  lam: number
  del: number
  q1: number
  q2: number
}

export interface BlResult {
  Pi: number[]
  ER: number[]
  SigP: number[][]
  wStar: number[]
  res1: number
  res2: number
}

function mTrans(A: number[][]): number[][] {
  const n = A.length
  const m = A[0].length
  const T: number[][] = Array.from({ length: m }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) T[j][i] = A[i][j]
  return T
}

function mMul(A: number[][], B: number[][]): number[][] {
  const n = A.length
  const m = B[0].length
  const k = B.length
  const C: number[][] = Array.from({ length: n }, () => Array(m).fill(0))
  for (let i = 0; i < n; i++)
    for (let j = 0; j < m; j++) {
      let s = 0
      for (let p = 0; p < k; p++) s += A[i][p] * B[p][j]
      C[i][j] = s
    }
  return C
}

function mScale(A: number[][], c: number): number[][] {
  return A.map((r) => r.map((x) => x * c))
}

function mAdd(A: number[][], B: number[][]): number[][] {
  return A.map((r, i) => r.map((x, j) => x + B[i][j]))
}

function mDiag(v: number[]): number[][] {
  return v.map((x, i) => v.map((_, j) => (i === j ? x : 0)))
}

function mInv(A: number[][]): number[][] | null {
  const n = A.length
  const M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r
    if (Math.abs(M[piv][col]) < 1e-14) return null
    if (piv !== col) {
      const t = M[col]
      M[col] = M[piv]
      M[piv] = t
    }
    const d = M[col][col]
    for (let j = 0; j < 2 * n; j++) M[col][j] /= d
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = M[r][col]
      for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[col][j]
    }
  }
  return M.map((r) => r.slice(n))
}

export function blSolve(tau: number, p: BlParams): BlResult {
  const Q: number[][] = [[p.q1], [p.q2]]
  const SigTau = mScale(BL_SIGMA, tau)
  const Pi = mMul(BL_SIGMA, BL_WMKT.map((w) => [p.lam * w]))
  const SigTauInv = mInv(SigTau)!
  const PSp = mMul(BL_PVIEW, BL_SIGMA)
  const diag = PSp.map((r, i) => r[i])
  const omega = mScale(mDiag(diag), p.del)
  const OmInv = mInv(omega)!
  const PtOm = mMul(mTrans(BL_PVIEW), OmInv)
  const tauInvPi = mMul(SigTauInv, Pi)
  const PtOmQ = mMul(PtOm, Q)
  const M = mAdd(mMul(PtOm, BL_PVIEW), SigTauInv)
  const Minv = mInv(M)!
  const ER = mMul(Minv, mAdd(tauInvPi, PtOmQ))
  const SigP = mAdd(BL_SIGMA, Minv)
  const wStar = mMul(mInv(mScale(SigP, p.lam))!, ER)
  const res1 =
    BL_PVIEW[0][0] * ER[0][0] + BL_PVIEW[0][1] * ER[1][0] + BL_PVIEW[0][2] * ER[2][0] + BL_PVIEW[0][3] * ER[3][0] - Q[0][0]
  const res2 =
    BL_PVIEW[1][0] * ER[0][0] + BL_PVIEW[1][1] * ER[1][0] + BL_PVIEW[1][2] * ER[2][0] + BL_PVIEW[1][3] * ER[3][0] - Q[1][0]
  return { Pi: Pi.map((r) => r[0]), ER: ER.map((r) => r[0]), SigP, wStar: wStar.map((r) => r[0]), res1, res2 }
}

/* ═════════ MONTE CARLO ENGINE (SEEDED) ═════════ */

export interface McParams {
  S0: number
  mu: number
  sig: number
  T: number
  npaths: number
  gam: number
}

export interface McSimulation {
  S0: number
  T: number
  N: number
  sorted: number[][]
  term: number[]
}

export const MC_STEPS = 60

function mulberry32(a: number): () => number {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function nextGauss(rng: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rng()
  while (v === 0) v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export function simulateMc(p: McParams): McSimulation {
  const { S0, mu, sig, T, npaths } = p
  const dt = T / MC_STEPS
  const drift = (mu - (sig * sig) / 2) * dt
  const vol = sig * Math.sqrt(dt)
  const paths: number[][] = Array.from({ length: npaths }, () => new Array<number>(MC_STEPS + 1))
  const rng = mulberry32(20240711)
  for (let k = 0; k < npaths; k++) {
    let S = S0
    paths[k][0] = S
    for (let t = 1; t <= MC_STEPS; t++) {
      S *= Math.exp(drift + vol * nextGauss(rng))
      paths[k][t] = S
    }
  }
  const term = paths.map((pth) => pth[MC_STEPS])
  const order = term
    .map((v, i) => [v, i] as [number, number])
    .sort((a, b) => a[0] - b[0])
    .map((x) => x[1])
  const sorted = order.map((i) => paths[i])
  const sortedTerm = order.map((i) => paths[i][MC_STEPS])
  return { S0, T, N: npaths, sorted, term: sortedTerm }
}

export const metricVal = (price: number, S0: number, mode: 'price' | 'ret'): number =>
  mode === 'ret' ? price / S0 - 1 : price

/* ═════════ APT ENGINE ═════════ */

export interface AptParams {
  r: number
  lam: number
  lams: number
  lamv: number
  b3: number
  al: number
}

export function aptRet(b1: number, b2: number, withAlpha: boolean, p: AptParams): number {
  return p.r + b1 * p.lam + b2 * p.lams + p.b3 * p.lamv + (withAlpha ? p.al : 0)
}
