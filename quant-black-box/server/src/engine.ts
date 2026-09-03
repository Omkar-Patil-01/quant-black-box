/* eslint-disable @typescript-eslint/no-unused-vars */
// Ported 1:1 from backend/app/engine.py (Python) — BSM, Heston, BL, MC, APT

// ═══════════════ BSM ═══════════════

export function normCdf(x: number): number {
  if (!Number.isFinite(x)) return x > 0 ? 1 : 0;
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-0.5 * x * x);
  const poly =
    0.319381530 * t -
    0.356563782 * t * t +
    1.781477937 * t * t * t -
    1.821255978 * t * t * t * t +
    1.330274429 * t * t * t * t * t;
  const c = 1 - d * poly;
  return x >= 0 ? c : 1 - c;
}

export function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export interface BsResult {
  C: number; P: number; delta: number; deltaP: number;
  gamma: number; vega: number; theta: number; rho: number;
  d1: number; d2: number;
}

export function bs(S0: number, K: number, T: number, r: number, s: number): BsResult | null {
  if (!(T > 0 && s > 0 && S0 > 0 && K > 0)) return null;
  const d1 = (Math.log(S0 / K) + (r + s * s / 2) * T) / (s * Math.sqrt(T));
  const d2 = d1 - s * Math.sqrt(T);
  const N = normCdf;
  const d = N(d1);
  const dN = N(d2);
  const pd = normPdf(d1);
  const rt = Math.sqrt(T);
  const e = Math.exp(-r * T);
  return {
    C: S0 * d - K * e * dN,
    P: K * e * N(-d2) - S0 * N(-d1),
    delta: d,
    deltaP: d - 1,
    gamma: pd / (S0 * s * rt),
    vega: S0 * pd * rt,
    theta: -S0 * pd * s / (2 * rt) - r * K * e * dN,
    rho: K * T * e * dN,
    d1, d2,
  };
}

// ═══════════════ HESTON (Lord-Kahale-Jackel CF) ═══════════════

export interface HestonEngineParams {
  r: number; v0: number; kappa: number; theta: number; sigv: number; rho: number;
}

export interface HestonResult {
  C: number; P: number; delta: number; deltaP: number;
}

function cx(re: number, im: number) {
  return { re, im };
}
function cxMul(a: { re: number; im: number }, b: { re: number; im: number }) {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}
function cxAdd(a: { re: number; im: number }, b: { re: number; im: number }) {
  return { re: a.re + b.re, im: a.im + b.im };
}
function cxSub(a: { re: number; im: number }, b: { re: number; im: number }) {
  return { re: a.re - b.re, im: a.im - b.im };
}
function cxDiv(a: { re: number; im: number }, b: { re: number; im: number }) {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
}
function cxExp(z: { re: number; im: number }) {
  const e = Math.exp(z.re);
  return { re: e * Math.cos(z.im), im: e * Math.sin(z.im) };
}
function cxLog(z: { re: number; im: number }) {
  return { re: Math.log(Math.hypot(z.re, z.im)), im: Math.atan2(z.im, z.re) };
}
function cxSqrt(z: { re: number; im: number }) {
  const r = Math.hypot(z.re, z.im);
  const sr = Math.sqrt(r);
  const theta = Math.atan2(z.im, z.re) / 2;
  return { re: sr * Math.cos(theta), im: sr * Math.sin(theta) };
}
function cxAbs(z: { re: number; im: number }) {
  return Math.hypot(z.re, z.im);
}

function _cf(z: { re: number; im: number }, S0: number, K: number, T: number, p: HestonEngineParams) {
  const { v0, kappa, theta: th, sigv, rho } = p;
  const sv = Math.max(sigv, 1e-6);
  const iz = cx(-z.im, z.re);
  const A = kappa - rho * sv;
  const Am = { re: A * iz.re, im: A * iz.im };
  const zz = cxMul(z, z);
  const iziz = cxMul(iz, iz);
  const B = sv * sv;
  const Bm = { re: B * (zz.re + iziz.re), im: B * (zz.im + iziz.im) };
  const d = cxSqrt(cxAdd(cxMul(Am, Am), Bm));
  const x = Math.log(S0) + p.r * T;
  if (cxAbs(d) < 1e-9) return cxExp({ re: iz.re * x, im: iz.im * x });
  const E = cxExp({ re: -d.re * T, im: -d.im * T });
  const Apd = cxAdd(Am, d);
  const Amd = cxSub(Am, d);
  const den = cxAdd(cxMul(Am, cxSub({ re: 1, im: 0 }, E)), cxMul(d, cxAdd({ re: 1, im: 0 }, E)));
  if (cxAbs(den) < 1e-12) return cxExp({ re: iz.re * x, im: iz.im * x });
  const oneMinusE = cxSub({ re: 1, im: 0 }, E);
  const svDen = cxMul({ re: sv * sv, im: 0 }, den);
  const D = cxMul(cxMul(Amd, Apd), { re: oneMinusE.re / svDen.re, im: 0 });
  const logDenOver2d = cxLog(cxDiv(den, cxMul({ re: 2, im: 0 }, d)));
  const Cc = kappa * th / (sv * sv);
  const Cterm = cxSub(cxMul(Amd, { re: T, im: 0 }), cxMul({ re: 2, im: 0 }, logDenOver2d));
  const Cval = { re: Cc * Cterm.re, im: Cc * Cterm.im };
  const Dv0 = { re: D.re * v0, im: D.im * v0 };
  const izx = { re: iz.re * x, im: iz.im * x };
  return cxExp(cxAdd(cxAdd(Cval, Dv0), izx));
}

function _cf1(u: number, S0: number, K: number, T: number, p: HestonEngineParams) {
  return cxDiv(_cf(cx(u, -1), S0, K, T, p), _cf(cx(0, -1), S0, K, T, p));
}

function _cf2(u: number, S0: number, K: number, T: number, p: HestonEngineParams) {
  return _cf(cx(u, 0), S0, K, T, p);
}

function _integrand(u: number, fn: (u: number) => { re: number; im: number }, K: number): number {
  if (u === 0) return 0;
  const phi = fn(u);
  const iu = cxDiv(phi, cx(0, u));
  const e = cx(Math.cos(-u * Math.log(K)), Math.sin(-u * Math.log(K)));
  const prod = cxMul(e, iu);
  return prod.re;
}

function _simpson(fn: (u: number) => number, a: number, b: number, n: number): number {
  const h = (b - a) / n;
  let s = fn(a) + fn(b);
  for (let i = 1; i < n; i++) {
    s += fn(a + i * h) * (i % 2 ? 4 : 2);
  }
  return s * h / 3;
}

function _integrate(U: number, N: number, mode: string, S0: number, K: number, T: number, p: HestonEngineParams): number | HestonResult {
  const P1 = 0.5 + _simpson(
    (u) => _integrand(u, (uu) => _cf1(uu, S0, K, T, p), K), 0, U, N
  ) / Math.PI;
  if (mode === 'p1') return P1;
  const P2 = 0.5 + _simpson(
    (u) => _integrand(u, (uu) => _cf2(uu, S0, K, T, p), K), 0, U, N
  ) / Math.PI;
  const disc = Math.exp(-p.r * T);
  const C = S0 * P1 - K * disc * P2;
  const P = C - S0 + K * disc;
  return { C, P, delta: P1, deltaP: P1 - 1 };
}

export function hestonP1(S: number, K: number, T: number, p: HestonEngineParams): number {
  return _integrate(120, 96, 'p1', S, K, T, p) as number;
}

export function hestonPrice(S: number, K: number, T: number, p: HestonEngineParams): HestonResult {
  return _integrate(120, 96, 'both', S, K, T, p) as HestonResult;
}

// ═══════════════ BLACK-LITTERMAN ═══════════════

const BL_NAMES = ['EQUITY', 'BOND', 'GOLD', 'CRYPTO'];
const BL_SIGMA = [
  [0.04, 0.006, 0.004, 0.01],
  [0.006, 0.01, 0.002, -0.004],
  [0.004, 0.002, 0.025, 0.005],
  [0.01, -0.004, 0.005, 0.16],
];
const BL_WMKT = [0.45, 0.35, 0.15, 0.05];
const BL_PVIEW = [
  [1, -1, 0, 0],
  [0, 0, 1, 0],
];

function _trans(A: number[][]): number[][] {
  return A[0].map((_, i) => A.map((row) => row[i]));
}
function _mul(A: number[][], B: number[][]): number[][] {
  const n = A.length, m = B[0].length, k = B.length;
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: m }, (_, j) =>
      A[i].reduce((s, _, p) => s + A[i][p] * B[p][j], 0)));
}
function _scale(A: number[][], c: number): number[][] {
  return A.map((row) => row.map((x) => x * c));
}
function _add(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((x, j) => x + B[i][j]));
}
function _diag(v: number[]): number[][] {
  return v.map((val, i) => v.map((_, j) => (i === j ? val : 0)));
}
function _inv(A: number[][]): number[][] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    }
    if (Math.abs(M[piv][col]) < 1e-14) return null;
    if (piv !== col) [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col];
    for (let j = 0; j < 2 * n; j++) M[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[col][j];
    }
  }
  return M.map((row) => row.slice(n));
}

export interface BlResult {
  names: string[]; Pi: number[]; ER: number[];
  SigP: number[][]; wStar: number[]; res1: number; res2: number;
}

export function blSolve(tau: number, lam: number, del_: number, q1: number, q2: number): BlResult {
  const Q = [[q1], [q2]];
  const SigTau = _scale(BL_SIGMA, tau);
  const Pi = _mul(BL_SIGMA, BL_WMKT.map((w) => [lam * w]));
  const SigTauInv = _inv(SigTau)!;
  const PSp = _mul(BL_PVIEW, BL_SIGMA);
  const diag = PSp.map((row, i) => row[i]);
  const omega = _scale(_diag(diag), del_);
  const OmInv = _inv(omega)!;
  const PtOm = _mul(_trans(BL_PVIEW), OmInv);
  const tauInvPi = _mul(SigTauInv, Pi);
  const PtOmQ = _mul(PtOm, Q);
  const M = _add(_mul(PtOm, BL_PVIEW), SigTauInv);
  const Minv = _inv(M)!;
  const ER = _mul(Minv, _add(tauInvPi, PtOmQ));
  const SigP = _add(BL_SIGMA, Minv);
  const wStar = _mul(_inv(_scale(SigP, lam))!, ER);
  const res1 = BL_PVIEW[0].reduce((s, _, j) => s + BL_PVIEW[0][j] * ER[j][0], 0) - Q[0][0];
  const res2 = BL_PVIEW[1].reduce((s, _, j) => s + BL_PVIEW[1][j] * ER[j][0], 0) - Q[1][0];
  return {
    names: BL_NAMES,
    Pi: Pi.map((x) => x[0]),
    ER: ER.map((x) => x[0]),
    SigP,
    wStar: wStar.map((x) => x[0]),
    res1, res2,
  };
}

// ═══════════════ MONTE CARLO (seeded) ═══════════════

const MC_STEPS = 60;

function mulberry32(seed: number): () => number {
  let state = seed & 0xffffffff;
  return () => {
    state = (state + 0x6d2b79f5) & 0xffffffff;
    let t = state;
    t = ((t ^ (t >>> 15)) * (1 | t)) & 0xffffffff;
    const old = t;
    const prod = ((old ^ (old >>> 7)) * (61 | old)) & 0xffffffff;
    t = ((old + prod) & 0xffffffff) ^ old;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nextGauss(rng: () => number): number {
  let u = rng(); while (u === 0) u = rng();
  let v = rng(); while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface McParams {
  S0: number; mu: number; sig: number; T: number; npaths: number; gam: number;
}

export interface McSimulation {
  S0: number; T: number; N: number; sorted: number[][]; term: number[];
}

export function simulateMc(p: McParams): McSimulation {
  const dt = p.T / MC_STEPS;
  const drift = (p.mu - p.sig * p.sig / 2) * dt;
  const vol = p.sig * Math.sqrt(dt);
  const rng = mulberry32(20240711);
  const paths: number[][] = [];
  for (let i = 0; i < p.npaths; i++) {
    let S = p.S0;
    const row = [S];
    for (let j = 1; j <= MC_STEPS; j++) {
      S *= Math.exp(drift + vol * nextGauss(rng));
      row.push(S);
    }
    paths.push(row);
  }
  const term = paths.map((row) => row[MC_STEPS]);
  const order = term.map((_, i) => i).sort((a, b) => term[a] - term[b]);
  return {
    S0: p.S0, T: p.T, N: p.npaths,
    sorted: order.map((i) => paths[i]),
    term: order.map((i) => term[i]),
  };
}

export interface McStats {
  mean: number; median: number; sd: number; var5: number;
  max: number; min: number; losses: number; mlr: number; util: number; ci95: number;
}

export function mcStats(sim: McSimulation, gam: number): McStats {
  const t = sim.term;
  const n = t.length;
  const mean = t.reduce((a, b) => a + b, 0) / n;
  const s = [...t].sort((a, b) => a - b);
  const med = (s[Math.floor((n - 1) / 2)] + s[Math.floor(n / 2)]) / 2;
  const sd = Math.sqrt(t.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
  const var5 = s[Math.min(Math.floor(n * 0.05), n - 1)];
  const mx = s[n - 1], mn = s[0];
  const losses = t.filter((v) => v < sim.S0).length / n;
  const logr = t.map((v) => Math.log(v / sim.S0));
  const mlr = logr.reduce((a, b) => a + b, 0) / n;
  let util: number;
  if (Math.abs(gam - 1) < 0.05) {
    util = t.reduce((a, v) => a + Math.log(v), 0) / n;
  } else {
    util = t.reduce((a, v) => a + (Math.pow(v, 1 - gam) - 1) / (1 - gam), 0) / n;
  }
  const ci95 = 1.96 * sd / Math.sqrt(n);
  return { mean, median: med, sd, var5, max: mx, min: mn, losses, mlr, util, ci95 };
}

// ═══════════════ APT ═══════════════

export interface AptParams {
  r: number; lam: number; lams: number; lamv: number; b3: number; al: number;
}

export function aptRet(b1: number, b2: number, withAlpha: boolean, p: AptParams): number {
  return p.r + b1 * p.lam + b2 * p.lams + p.b3 * p.lamv + (withAlpha ? p.al : 0);
}

// ═══════════════ KALMAN FILTER ═══════════════

export interface KfParams {
  n: number; m: number; Q: number; R: number; nDays: number; seed: number;
}

export interface KfTickResult {
  step: number;
  trueState: number[];
  observation: number[];
  filteredState: number[];
  stateCovDiag: number[];
  innovation: number[];
  kalmanGain: number[][];
  traceP: number;
}

function _kfIdentity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

function _kfTrace(A: number[][]): number {
  let s = 0;
  for (let i = 0; i < A.length; i++) s += A[i][i];
  return s;
}

export function kalmanFilter(p: KfParams): KfTickResult[] {
  const { n, m, Q, R, nDays, seed } = p;
  const rng = mulberry32(seed);

  const F = _kfIdentity(n);
  const H: number[][] = Array.from({ length: m }, (_, i) =>
    Array.from({ length: n }, (_, j) => (j === i ? 1 : 0)));
  const Qmat = _scale(_kfIdentity(n), Q);
  const Rmat = _scale(_kfIdentity(m), R);

  let xTrue = Array.from({ length: n }, (_, i) => (i === 0 ? 100 : 0));
  let xEst = Array.from({ length: n }, () => 100);
  let P = _scale(_kfIdentity(n), 10);

  const results: KfTickResult[] = [];

  for (let t = 0; t <= nDays; t++) {
    if (t > 0) {
      const w = Array.from({ length: n }, () => Math.sqrt(Q) * nextGauss(rng));
      xTrue = _mul(F, xTrue.map((v) => [v])).map((r) => r[0]).map((v, i) => v + w[i]);

      const v = Array.from({ length: m }, () => Math.sqrt(R) * nextGauss(rng));
      const yTrue = _mul(H, xTrue.map((v) => [v])).map((r) => r[0]);
      const yObsArr = yTrue.map((v, i) => v + v[i]);

      const xPred = _mul(F, xEst.map((v) => [v])).map((r) => r[0]);
      const PPred = _add(_mul(_mul(F, P), _trans(F)), Qmat);

      const predObs = _mul(H, xPred.map((s) => [s])).map((r) => r[0]);
      const innovation = yObsArr.map((v, i) => v - predObs[i]);

      const S = _add(_mul(_mul(H, PPred), _trans(H)), Rmat);
      const Sinv = _inv(S);
      let K: number[][];
      if (Sinv) {
        K = _mul(_mul(PPred, _trans(H)), Sinv);
      } else {
        K = Array.from({ length: n }, () => Array(m).fill(0));
      }

      const innovVec = innovation.map((v) => [v]);
      const Kinnov = _mul(K, innovVec).map((r) => r[0]);
      xEst = xPred.map((v, i) => v + Kinnov[i]);

      const KH = _mul(K, H);
      const IminusKH = _add(_kfIdentity(n), _scale(KH, -1));
      P = _mul(IminusKH, PPred);
    }

    const obs = _mul(H, xTrue.map((v) => [v])).map((r) => r[0]);

    results.push({
      step: t,
      trueState: [...xTrue],
      observation: t === 0 ? Array(m).fill(0) : obs,
      filteredState: [...xEst],
      stateCovDiag: Array.from({ length: n }, (_, i) => Math.sqrt(Math.max(0, P[i][i])) * 2),
      innovation: t === 0 ? Array(m).fill(0) : obs.map((v, i) => v - (_mul(H, xEst.map((s) => [s]))[i]?.[0] ?? 0)),
      kalmanGain: K.map((r) => [...r]),
      traceP: _kfTrace(P),
    });
  }

  return results;
}
