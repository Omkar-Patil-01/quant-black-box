"""Quantitative engines for the Black Box API.

Ported 1:1 from the frontend's `src/lib/math.ts` so the API returns the same
math as the browser: BSM, Heston (characteristic-function pricing), the
Black-Litterman matrix update, a seeded Monte Carlo GBM simulation and the
APT linear factor model.
"""

import cmath
import math
from dataclasses import dataclass
from typing import Callable

# ═══════════════ BSM ═══════════════


def norm_cdf(x: float) -> float:
    if not math.isfinite(x):
        return 1.0 if x > 0 else 0.0
    t = 1.0 / (1.0 + 0.2316419 * abs(x))
    d = 0.3989422804014327 * math.exp(-0.5 * x * x)
    poly = (
        0.319381530 * t
        - 0.356563782 * t * t
        + 1.781477937 * t * t * t
        - 1.821255978 * t * t * t * t
        + 1.330274429 * t * t * t * t * t
    )
    c = 1.0 - d * poly
    return c if x >= 0 else 1.0 - c


def norm_pdf(x: float) -> float:
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


@dataclass
class BsResult:
    C: float
    P: float
    delta: float
    deltaP: float
    gamma: float
    vega: float
    theta: float
    rho: float
    d1: float
    d2: float


def bs(S0: float, K: float, T: float, r: float, s: float) -> BsResult | None:
    if not (T > 0 and s > 0 and S0 > 0 and K > 0):
        return None
    d1 = (math.log(S0 / K) + (r + s * s / 2.0) * T) / (s * math.sqrt(T))
    d2 = d1 - s * math.sqrt(T)
    N = norm_cdf
    d = N(d1)
    dN = N(d2)
    pd = norm_pdf(d1)
    rt = math.sqrt(T)
    e = math.exp(-r * T)
    return BsResult(
        C=S0 * d - K * e * dN,
        P=K * e * N(-d2) - S0 * N(-d1),
        delta=d,
        deltaP=d - 1.0,
        gamma=pd / (S0 * s * rt),
        vega=S0 * pd * rt,
        theta=-S0 * pd * s / (2.0 * rt) - r * K * e * dN,
        rho=K * T * e * dN,
        d1=d1,
        d2=d2,
    )


# ═══════════════ HESTON (Lord-Kahale-Jackel CF) ═══════════════


@dataclass
class HestonParams:
    r: float
    v0: float
    kappa: float
    theta: float
    sigv: float
    rho: float


@dataclass
class HestonResult:
    C: float
    P: float
    delta: float
    deltaP: float


def _cf(z: complex, S0: float, K: float, T: float, p: HestonParams) -> complex:
    v0, kappa, theta, sigv, rho = p.v0, p.kappa, p.theta, p.sigv, p.rho
    sv = max(sigv, 1e-6)
    iz = complex(-z.imag, z.real)
    A = kappa - rho * sv * iz
    B = sv * sv * (z * z + iz)
    d = cmath.sqrt(A * A + B)
    x = math.log(S0) + p.r * T
    if abs(d) < 1e-9:
        return cmath.exp(iz * x)
    E = cmath.exp(-d * T)
    Apd = A + d
    Amd = A - d
    den = A * (1.0 - E) + d * (1.0 + E)
    if abs(den) < 1e-12:
        return cmath.exp(iz * x)
    D = Amd * Apd * ((1.0 - E) / (sv * sv * den))
    C = (kappa * theta / (sv * sv)) * (Amd * T - 2.0 * cmath.log(den / (2.0 * d)))
    return cmath.exp(C + D * v0 + iz * x)


def _cf1(u: float, S0: float, K: float, T: float, p: HestonParams) -> complex:
    return _cf(complex(u, -1.0), S0, K, T, p) / _cf(complex(0.0, -1.0), S0, K, T, p)


def _cf2(u: float, S0: float, K: float, T: float, p: HestonParams) -> complex:
    return _cf(complex(u, 0.0), S0, K, T, p)


def _integrand(u: float, fn: Callable[[float], complex], K: float) -> float:
    if u == 0.0:
        return 0.0
    phi = fn(u)
    iu = phi / complex(0.0, u)
    e = complex(math.cos(-u * math.log(K)), math.sin(-u * math.log(K)))
    return (e * iu).real


def _simpson(fn: Callable[[float], float], a: float, b: float, n: int) -> float:
    h = (b - a) / n
    s = fn(a) + fn(b)
    for i in range(1, n):
        s += fn(a + i * h) * (4 if i % 2 else 2)
    return s * h / 3.0


def _integrate(
    U: float, N: int, mode: str, S0: float, K: float, T: float, p: HestonParams
) -> float | HestonResult:
    P1 = 0.5 + _simpson(
        lambda u: _integrand(u, lambda uu: _cf1(uu, S0, K, T, p), K), 0.0, U, N
    ) / math.pi
    if mode == "p1":
        return P1
    P2 = 0.5 + _simpson(
        lambda u: _integrand(u, lambda uu: _cf2(uu, S0, K, T, p), K), 0.0, U, N
    ) / math.pi
    disc = math.exp(-p.r * T)
    C = S0 * P1 - K * disc * P2
    P = C - S0 + K * disc
    return HestonResult(C=C, P=P, delta=P1, deltaP=P1 - 1.0)


def heston_p1(S: float, K: float, T: float, p: HestonParams) -> float:
    result = _integrate(120, 96, "p1", S, K, T, p)
    assert isinstance(result, float)
    return result


def heston_price(S: float, K: float, T: float, p: HestonParams) -> HestonResult:
    result = _integrate(120, 96, "both", S, K, T, p)
    assert isinstance(result, HestonResult)
    return result


# ═══════════════ BLACK-LITTERMAN ═══════════════

BL_NASSET = 4
BL_NAMES = ["EQUITY", "BOND", "GOLD", "CRYPTO"]
BL_SIGMA: list[list[float]] = [
    [0.04, 0.006, 0.004, 0.01],
    [0.006, 0.01, 0.002, -0.004],
    [0.004, 0.002, 0.025, 0.005],
    [0.01, -0.004, 0.005, 0.16],
]
BL_WMKT = [0.45, 0.35, 0.15, 0.05]
BL_PVIEW: list[list[float]] = [
    [1.0, -1.0, 0.0, 0.0],
    [0.0, 0.0, 1.0, 0.0],
]


@dataclass
class BlResult:
    Pi: list[float]
    ER: list[float]
    SigP: list[list[float]]
    wStar: list[float]
    res1: float
    res2: float


def _trans(A: list[list[float]]) -> list[list[float]]:
    return [list(col) for col in zip(*A)]


def _mul(A: list[list[float]], B: list[list[float]]) -> list[list[float]]:
    n, m, k = len(A), len(B[0]), len(B)
    return [
        [sum(A[i][p] * B[p][j] for p in range(k)) for j in range(m)] for i in range(n)
    ]


def _scale(A: list[list[float]], c: float) -> list[list[float]]:
    return [[x * c for x in row] for row in A]


def _add(A: list[list[float]], B: list[list[float]]) -> list[list[float]]:
    return [[x + B[i][j] for j, x in enumerate(row)] for i, row in enumerate(A)]


def _diag(v: list[float]) -> list[list[float]]:
    return [[v[i] if i == j else 0.0 for j in range(len(v))] for i in range(len(v))]


def _inv(A: list[list[float]]) -> list[list[float]] | None:
    n = len(A)
    M = [row[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, row in enumerate(A)]
    for col in range(n):
        piv = col
        for r in range(col + 1, n):
            if abs(M[r][col]) > abs(M[piv][col]):
                piv = r
        if abs(M[piv][col]) < 1e-14:
            return None
        if piv != col:
            M[col], M[piv] = M[piv], M[col]
        d = M[col][col]
        for j in range(2 * n):
            M[col][j] /= d
        for r in range(n):
            if r == col:
                continue
            f = M[r][col]
            for j in range(2 * n):
                M[r][j] -= f * M[col][j]
    return [row[n:] for row in M]


def bl_solve(tau: float, lam: float, del_: float, q1: float, q2: float) -> BlResult:
    Q: list[list[float]] = [[q1], [q2]]
    SigTau = _scale(BL_SIGMA, tau)
    Pi = _mul(BL_SIGMA, [[lam * w] for w in BL_WMKT])
    SigTauInv = _inv(SigTau)
    assert SigTauInv is not None
    PSp = _mul(BL_PVIEW, BL_SIGMA)
    diag = [row[i] for i, row in enumerate(PSp)]
    omega = _scale(_diag(diag), del_)
    OmInv = _inv(omega)
    assert OmInv is not None
    PtOm = _mul(_trans(BL_PVIEW), OmInv)
    tauInvPi = _mul(SigTauInv, Pi)
    PtOmQ = _mul(PtOm, Q)
    M = _add(_mul(PtOm, BL_PVIEW), SigTauInv)
    Minv = _inv(M)
    assert Minv is not None
    ER = _mul(Minv, _add(tauInvPi, PtOmQ))
    SigP = _add(BL_SIGMA, Minv)
    wStar = _mul(_inv(_scale(SigP, lam)), ER)
    assert wStar is not None
    res1 = sum(BL_PVIEW[0][j] * ER[j][0] for j in range(4)) - Q[0][0]
    res2 = sum(BL_PVIEW[1][j] * ER[j][0] for j in range(4)) - Q[1][0]
    return BlResult(
        Pi=[x[0] for x in Pi],
        ER=[x[0] for x in ER],
        SigP=SigP,
        wStar=[x[0] for x in wStar],
        res1=res1,
        res2=res2,
    )


# ═══════════════ MONTE CARLO (seeded) ═══════════════

MC_STEPS = 60


@dataclass
class McParams:
    S0: float
    mu: float
    sig: float
    T: float
    npaths: int
    gam: float


@dataclass
class McSimulation:
    S0: float
    T: float
    N: int
    sorted: list[list[float]]
    term: list[float]


def _mulberry32(seed: int) -> Callable[[], float]:
    state = seed & 0xFFFFFFFF

    def next_float() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        a = state
        t = ((a ^ (a >> 15)) * (1 | a)) & 0xFFFFFFFF
        old = t
        prod = ((old ^ (old >> 7)) * (61 | old)) & 0xFFFFFFFF
        t = ((old + prod) & 0xFFFFFFFF) ^ old
        return (t ^ (t >> 14)) / 4294967296.0

    return next_float


def _next_gauss(rng: Callable[[], float]) -> float:
    u = rng()
    while u == 0.0:
        u = rng()
    v = rng()
    while v == 0.0:
        v = rng()
    return math.sqrt(-2.0 * math.log(u)) * math.cos(2.0 * math.pi * v)


def simulate_mc(p: McParams) -> McSimulation:
    dt = p.T / MC_STEPS
    drift = (p.mu - p.sig * p.sig / 2.0) * dt
    vol = p.sig * math.sqrt(dt)
    rng = _mulberry32(20240711)
    paths: list[list[float]] = []
    for _ in range(p.npaths):
        S = p.S0
        row = [S]
        for _ in range(1, MC_STEPS + 1):
            S *= math.exp(drift + vol * _next_gauss(rng))
            row.append(S)
        paths.append(row)
    term = [row[MC_STEPS] for row in paths]
    order = sorted(range(p.npaths), key=lambda i: term[i])
    sorted_paths = [paths[i] for i in order]
    sorted_term = [term[i] for i in order]
    return McSimulation(S0=p.S0, T=p.T, N=p.npaths, sorted=sorted_paths, term=sorted_term)


@dataclass
class McStats:
    mean: float
    median: float
    sd: float
    var5: float
    max: float
    min: float
    losses: float
    mlr: float
    util: float
    ci95: float


def mc_stats(sim: McSimulation, gam: float) -> McStats:
    t = sim.term
    n = len(t)
    mean = sum(t) / n
    s = sorted(t)
    med = (s[(n - 1) // 2] + s[n // 2]) / 2.0
    sd = math.sqrt(sum((v - mean) ** 2 for v in t) / n)
    var5 = s[min(int(n * 0.05), n - 1)]
    mx = s[-1]
    mn = s[0]
    losses = sum(1 for v in t if v < sim.S0) / n
    logr = [math.log(v / sim.S0) for v in t]
    mlr = sum(logr) / len(logr)
    if abs(gam - 1.0) < 0.05:
        util = sum(math.log(v) for v in t) / n
    else:
        util = sum((math.pow(v, 1.0 - gam) - 1.0) / (1.0 - gam) for v in t) / n
    ci95 = 1.96 * sd / math.sqrt(n)
    return McStats(
        mean=mean,
        median=med,
        sd=sd,
        var5=var5,
        max=mx,
        min=mn,
        losses=losses,
        mlr=mlr,
        util=util,
        ci95=ci95,
    )


# ═══════════════ APT ═══════════════


@dataclass
class AptParams:
    r: float
    lam: float
    lams: float
    lamv: float
    b3: float
    al: float


def apt_ret(b1: float, b2: float, with_alpha: bool, p: AptParams) -> float:
    return p.r + b1 * p.lam + b2 * p.lams + p.b3 * p.lamv + (p.al if with_alpha else 0.0)


# ═══════════════ KALMAN FILTER ═══════════════


@dataclass
class KfParams:
    n: int = 2
    m: int = 1
    Q: float = 0.01
    R: float = 0.1
    nDays: int = 20
    seed: int = 42


@dataclass
class KfTickResult:
    step: int
    trueState: list[float]
    observation: list[float]
    filteredState: list[float]
    stateCovDiag: list[float]
    innovation: list[float]
    kalmanGain: list[list[float]]
    traceP: float


def _kf_identity(n: int) -> list[list[float]]:
    return [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]


def _kf_mul(A: list[list[float]], B: list[list[float]]) -> list[list[float]]:
    n, m, k = len(A), len(B[0]), len(B)
    return [[sum(A[i][p] * B[p][j] for p in range(k)) for j in range(m)] for i in range(n)]


def _kf_trans(A: list[list[float]]) -> list[list[float]]:
    return [list(row) for row in zip(*A)]


def _kf_scale(A: list[list[float]], c: float) -> list[list[float]]:
    return [[x * c for x in row] for row in A]


def _kf_add(A: list[list[float]], B: list[list[float]]) -> list[list[float]]:
    return [[A[i][j] + B[i][j] for j in range(len(A[0]))] for i in range(len(A))]


def _kf_inv(A: list[list[float]]) -> list[list[float]] | None:
    n = len(A)
    M = [row[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, row in enumerate(A)]
    for col in range(n):
        piv = max(range(col, n), key=lambda r: abs(M[r][col]))
        if abs(M[piv][col]) < 1e-14:
            return None
        M[col], M[piv] = M[piv], M[col]
        d = M[col][col]
        for j in range(2 * n):
            M[col][j] /= d
        for r in range(n):
            if r == col:
                continue
            f = M[r][col]
            for j in range(2 * n):
                M[r][j] -= f * M[col][j]
    return [row[n:] for row in M]


def _kf_trace(A: list[list[float]]) -> float:
    return sum(A[i][i] for i in range(len(A)))


def kalman_filter(p: KfParams) -> list[KfTickResult]:
    import math

    n, m, Q, R, nDays, seed = p.n, p.m, p.Q, p.R, p.nDays, p.seed

    rng_state = seed & 0xFFFFFFFF

    def rng() -> float:
        nonlocal rng_state
        rng_state = (rng_state + 0x6D2B79F5) & 0xFFFFFFFF
        t = rng_state
        t = ((t ^ (t >> 15)) * (1 | t)) & 0xFFFFFFFF
        old = t
        prod = ((old ^ (old >> 7)) * (61 | old)) & 0xFFFFFFFF
        t = ((old + prod) & 0xFFFFFFFF) ^ old
        return ((t ^ (t >> 14)) >>> 0) / 4294967296

    def gauss() -> float:
        u, v = 0.0, 0.0
        while u == 0:
            u = rng()
        while v == 0:
            v = rng()
        return math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * v)

    F = _kf_identity(n)
    H = [[1.0 if j == i else 0.0 for j in range(n)] for i in range(m)]
    Qmat = _kf_scale(_kf_identity(n), Q)
    Rmat = _kf_scale(_kf_identity(m), R)

    x_true = [100.0 if i == 0 else 0.0 for i in range(n)]
    x_est = [100.0] * n
    P = _kf_scale(_kf_identity(n), 10.0)

    results: list[KfTickResult] = []

    for t in range(nDays + 1):
        K = [[0.0] * m for _ in range(n)]

        if t > 0:
            w = [math.sqrt(Q) * gauss() for _ in range(n)]
            x_true = [_kf_mul(F, [[v] for v in x_true])[i][0] + w[i] for i in range(n)]

            v_noise = [math.sqrt(R) * gauss() for _ in range(m)]
            y_true = [_kf_mul(H, [[v] for v in x_true])[i][0] for i in range(m)]
            y_obs = [y_true[i] + v_noise[i] for i in range(m)]

            x_pred = [_kf_mul(F, [[v] for v in x_est])[i][0] for i in range(n)]
            P_pred = _kf_add(_kf_mul(_kf_mul(F, P), _kf_trans(F)), Qmat)

            pred_obs = [_kf_mul(H, [[v] for v in x_pred])[i][0] for i in range(m)]
            innovation = [y_obs[i] - pred_obs[i] for i in range(m)]

            S = _kf_add(_kf_mul(_kf_mul(H, P_pred), _kf_trans(H)), Rmat)
            Sinv = _kf_inv(S)
            if Sinv:
                K = _kf_mul(_kf_mul(P_pred, _kf_trans(H)), Sinv)

            innov_vec = [[v] for v in innovation]
            kinnov = [_kf_mul(K, innov_vec)[i][0] for i in range(n)]
            x_est = [x_pred[i] + kinnov[i] for i in range(n)]

            KH = _kf_mul(K, H)
            IminusKH = _kf_add(_kf_identity(n), _kf_scale(KH, -1.0))
            P = _kf_mul(IminusKH, P_pred)

        obs = [_kf_mul(H, [[v] for v in x_true])[i][0] for i in range(m)]
        pred_obs_final = [_kf_mul(H, [[v] for v in x_est])[i][0] for i in range(m)]

        results.append(KfTickResult(
            step=t,
            trueState=list(x_true),
            observation=[0.0] * m if t == 0 else obs,
            filteredState=list(x_est),
            stateCovDiag=[math.sqrt(max(0, P[i][i])) * 2 for i in range(n)],
            innovation=[0.0] * m if t == 0 else [obs[i] - pred_obs_final[i] for i in range(m)],
            kalmanGain=[row[:] for row in K],
            traceP=_kf_trace(P),
        ))

    return results
