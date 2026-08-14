"""API-level tests for the FastAPI backend."""

import math

from fastapi.testclient import TestClient

from app import engine
from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "bs" in body["models"]


def test_models():
    res = client.get("/api/models")
    assert res.status_code == 200
    ids = [m["id"] for m in res.json()]
    assert ids == ["bs", "heston", "bl", "mc", "apt"]


def test_bs_matches_engine():
    payload = {"S0": 100, "K": 100, "T": 1, "r": 0.05, "sig": 0.2, "opt": "call"}
    res = client.post("/api/bs", json=payload)
    assert res.status_code == 200
    m = engine.bs(100, 100, 1, 0.05, 0.2)
    body = res.json()
    assert body["opt"] == "call"
    assert abs(body["C"] - m.C) < 1e-9
    assert abs(body["delta"] - m.delta) < 1e-9


def test_bs_rejects_nonpositive_strike():
    res = client.post(
        "/api/bs", json={"S0": 100, "K": 0, "T": 1, "r": 0.05, "sig": 0.2}
    )
    assert res.status_code == 422


def test_bs_grid():
    payload = {
        "S0": 100, "K": 100, "T": 1, "r": 0.05, "sig": 0.2,
        "grid": {"n": 10, "metric": "delta"},
    }
    res = client.post("/api/bs", json=payload)
    assert res.status_code == 200
    grid = res.json()["grid"]
    assert grid["shape"] == [10, 10]
    assert len(grid["points"]) == 100
    assert all("z" in p for p in grid["points"])


def test_heston_parity():
    payload = {
        "S0": 100, "K": 100, "T": 1, "r": 0.05,
        "v0": 0.04, "kappa": 1, "theta": 0.04, "sigv": 0.2, "rho": 0,
    }
    res = client.post("/api/heston", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert abs(body["C"] - body["P"] - (100 - 100 * math.exp(-0.05))) < 1e-6


def test_bl():
    payload = {"tau": 0.05, "lam": 2.5, "del": 0.1, "q1": 0.05, "q2": 0.08}
    res = client.post("/api/bl", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["names"] == ["EQUITY", "BOND", "GOLD", "CRYPTO"]
    assert len(body["ER"]) == 4
    assert abs(body["res1"]) < 0.02


def test_mc():
    payload = {"S0": 100, "mu": 0.1, "sig": 0.25, "T": 1, "npaths": 500, "gam": 3}
    res = client.post("/api/mc", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["steps"] == engine.MC_STEPS
    assert len(body["paths"]) == 500
    assert body["stats"]["mean"] > 0
    assert len(body["term"]) == 500


def test_mc_omit_paths():
    payload = {
        "S0": 100, "mu": 0.1, "sig": 0.25, "T": 1,
        "npaths": 100, "gam": 3, "include_paths": False,
    }
    res = client.post("/api/mc", json=payload)
    assert res.status_code == 200
    assert res.json()["paths"] is None


def test_apt():
    payload = {
        "r": 0.05, "lam": 0.08, "lams": 0.03, "lamv": 0.05,
        "b3": 0.5, "al": 0.02, "b1": 1, "b2": 0.5,
    }
    res = client.post("/api/apt", json=payload)
    assert res.status_code == 200
    body = res.json()
    expected = engine.apt_ret(
        1, 0.5, False,
        engine.AptParams(r=0.05, lam=0.08, lams=0.03, lamv=0.05, b3=0.5, al=0.02),
    )
    assert abs(body["ret"] - expected) < 1e-9


def test_apt_grid():
    payload = {
        "r": 0.05, "lam": 0.08, "lams": 0.03, "lamv": 0.05,
        "b3": 0.5, "al": 0, "grid": {"n": 10},
    }
    res = client.post("/api/apt", json=payload)
    assert res.status_code == 200
    grid = res.json()["grid"]
    assert grid["shape"] == [10, 10]
    assert len(grid["points"]) == 100


def test_unknown_route_returns_404():
    res = client.get("/api/nope")
    assert res.status_code == 404
