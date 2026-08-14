"""Engine-level tests, mirroring the frontend's src/lib/math.test.ts."""

import math

from app import engine


def test_norm_cdf_known_values():
    assert math.isclose(engine.norm_cdf(0), 0.5, abs_tol=1e-9)
    assert math.isclose(engine.norm_cdf(1.96), 0.975, abs_tol=1e-3)
    assert math.isclose(engine.norm_cdf(-1), 1 - engine.norm_cdf(1), rel_tol=1e-9)


def test_bs_prices_atm_call():
    m = engine.bs(100, 100, 1, 0.05, 0.2)
    assert m is not None
    assert m.C > 0
    assert math.isclose(m.C, 10.45, abs_tol=0.05)


def test_bs_put_call_parity():
    m = engine.bs(100, 100, 1, 0.05, 0.2)
    assert m is not None
    assert math.isclose(m.C - m.P, 100 - 100 * math.exp(-0.05), abs_tol=1e-9)


def test_bs_delta_bounds():
    m = engine.bs(100, 100, 1, 0.05, 0.2)
    assert 0 < m.delta < 1
    assert -1 < m.deltaP < 0


def test_bs_degenerate_inputs():
    assert engine.bs(0, 100, 1, 0.05, 0.2) is None
    assert engine.bs(100, 100, 0, 0.05, 0.2) is None


def test_heston_approaches_bs_for_small_vol_of_vol():
    p = engine.HestonParams(r=0.05, v0=0.04, kappa=1, theta=0.04, sigv=0.05, rho=0)
    m = engine.heston_price(100, 100, 1, p)
    b = engine.bs(100, 100, 1, 0.05, 0.2)
    assert abs(m.C - b.C) < 0.7
    assert abs(m.P - b.P) < 0.7


def test_heston_parity_across_extremes():
    cases = [
        dict(r=0.05, v0=0.04, kappa=0.3, theta=0.15, sigv=0.8, rho=0.9),
        dict(r=0.05, v0=0.0, kappa=2, theta=0.1, sigv=0.5, rho=-0.3),
        dict(r=0.05, v0=0.04, kappa=0, theta=0.04, sigv=0, rho=0),
        dict(r=0.05, v0=0.25, kappa=2.5, theta=0.25, sigv=2, rho=0.7),
    ]
    for c in cases:
        p = engine.HestonParams(**c)
        m = engine.heston_price(100, 100, 1, p)
        assert math.isfinite(m.C) and math.isfinite(m.P)
        assert m.C > 0 and m.P > 0
        assert 0 < m.delta < 1
        assert math.isclose(m.C - m.P, 100 - 100 * math.exp(-0.05), abs_tol=1e-6)


def test_bl_reproduces_views():
    r = engine.bl_solve(0.05, 2.5, 0.1, 0.05, 0.08)
    assert abs(r.res1) < 0.02
    assert abs(r.res2) < 0.02


def test_bl_tighter_views_match_closer():
    wide = engine.bl_solve(0.05, 2.5, 0.1, 0.05, 0.08)
    tight = engine.bl_solve(0.05, 2.5, 0.001, 0.05, 0.08)
    assert abs(tight.res1) < abs(wide.res1)
    assert abs(tight.res2) < abs(wide.res2)


def test_bl_empty_views_reduce_to_equilibrium():
    r = engine.bl_solve(0.05, 2.5, 0.1, 0, 0)
    assert len(r.Pi) == 4
    assert all(math.isfinite(v) for v in r.Pi)


def test_mc_converges_to_geometric_mean():
    sim = engine.simulate_mc(
        engine.McParams(S0=100, mu=0.1, sig=0.25, T=1, npaths=2000, gam=3)
    )
    mlr = sum(math.log(v / 100) for v in sim.term) / len(sim.term)
    assert abs(mlr - (0.1 - 0.25 * 0.25 / 2)) < 0.05


def test_apt_is_linear_in_factor_exposures():
    p = engine.AptParams(r=0.05, lam=0.08, lams=0.03, lamv=0.05, b3=0.5, al=0.02)
    a = engine.apt_ret(1, 0.5, True, p)
    b = engine.apt_ret(0, 0, False, p)
    c = engine.apt_ret(1, 0.5, False, p)
    assert math.isclose(a - c, p.al, abs_tol=1e-12)
    assert math.isclose(c - b, 1 * p.lam + 0.5 * p.lams, abs_tol=1e-12)
