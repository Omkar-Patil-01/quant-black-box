"""Tests for the workspace persistence endpoints."""

import asyncio
import os
import tempfile

import pytest
from fastapi.testclient import TestClient

from app import database
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _tmp_db(tmp_path, monkeypatch):
    """Use a temporary database for each test."""
    monkeypatch.setattr(database, "DB_PATH", str(tmp_path / "test.db"))
    loop = asyncio.new_event_loop()
    loop.run_until_complete(database.init_db())
    loop.close()


def test_load_workspace_default():
    res = client.get("/api/workspace")
    assert res.status_code == 200
    body = res.json()
    assert body["version"] == "1.0.0"
    assert body["activeModelId"] is None
    assert body["favorites"]["modelIds"] == ["bs", "heston", "bl", "mc", "apt"]
    assert body["scenarios"] == {}
    assert body["presets"] == {}
    assert body["recentRuns"] == []


def test_save_and_load_workspace():
    state = {
        "version": "1.0.0",
        "activeModelId": "bs",
        "activeScenarioId": None,
        "lastUpdated": "2026-01-01T00:00:00",
        "favorites": {"modelIds": ["bs", "mc"]},
        "scenarios": {},
        "recentRuns": [],
        "presets": {},
        "deletedScenarios": {},
        "lastModelParams": None,
    }
    res = client.put("/api/workspace", json=state)
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    res = client.get("/api/workspace")
    assert res.status_code == 200
    body = res.json()
    assert body["activeModelId"] == "bs"
    assert body["favorites"]["modelIds"] == ["bs", "mc"]


def test_create_scenario():
    payload = {"name": "Test Scenario", "modelId": "bs", "parameters": {"S0": 100}, "tags": ["test"]}
    res = client.post("/api/workspace/scenarios", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["name"] == "Test Scenario"
    assert body["modelId"] == "bs"
    assert body["parameters"]["S0"] == 100
    assert body["tags"] == ["test"]
    assert "id" in body

    # Verify it appears in workspace
    res = client.get("/api/workspace")
    scenarios = res.json()["scenarios"]
    assert len(scenarios) == 1
    sid = list(scenarios.keys())[0]
    assert scenarios[sid]["name"] == "Test Scenario"


def test_update_scenario():
    # Create
    res = client.post("/api/workspace/scenarios", json={"name": "Orig", "modelId": "bs"})
    sid = res.json()["id"]

    # Update
    res = client.put(f"/api/workspace/scenarios/{sid}", json={"name": "Updated", "tags": ["new"]})
    assert res.status_code == 200
    assert res.json()["name"] == "Updated"

    # Verify
    res = client.get("/api/workspace")
    assert res.json()["scenarios"][sid]["name"] == "Updated"
    assert res.json()["scenarios"][sid]["tags"] == ["new"]


def test_delete_scenario():
    res = client.post("/api/workspace/scenarios", json={"name": "Del", "modelId": "bs"})
    sid = res.json()["id"]

    res = client.delete(f"/api/workspace/scenarios/{sid}")
    assert res.status_code == 200

    # Gone from scenarios
    res = client.get("/api/workspace")
    assert sid not in res.json()["scenarios"]


def test_restore_scenario():
    res = client.post("/api/workspace/scenarios", json={"name": "Restore Me", "modelId": "bs"})
    sid = res.json()["id"]

    client.delete(f"/api/workspace/scenarios/{sid}")
    res = client.post(f"/api/workspace/scenarios/{sid}/restore")
    assert res.status_code == 200

    res = client.get("/api/workspace")
    assert sid in res.json()["scenarios"]
    assert res.json()["scenarios"][sid]["name"] == "Restore Me"


def test_create_preset():
    payload = {"name": "My Preset", "modelId": "bs", "parameters": {"K": 120}, "tags": ["iv"]}
    res = client.post("/api/workspace/presets", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["name"] == "My Preset"
    assert body["parameters"]["K"] == 120

    res = client.get("/api/workspace")
    assert len(res.json()["presets"]) == 1


def test_delete_preset():
    res = client.post("/api/workspace/presets", json={"name": "Del", "modelId": "bs"})
    pid = res.json()["id"]

    res = client.delete(f"/api/workspace/presets/{pid}")
    assert res.status_code == 200

    res = client.get("/api/workspace")
    assert len(res.json()["presets"]) == 0


def test_record_run():
    payload = {
        "modelId": "bs",
        "scenarioName": "Live",
        "inputs": {"S0": 100, "K": 100},
        "outputsSummary": {"price": 10.45, "delta": 0.5},
        "runtimeMs": 1.23,
    }
    res = client.post("/api/workspace/runs", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["modelId"] == "bs"
    assert body["inputs"]["S0"] == 100

    res = client.get("/api/workspace")
    assert len(res.json()["recentRuns"]) == 1


def test_clear_history():
    client.post("/api/workspace/runs", json={"modelId": "bs"})
    res = client.delete("/api/workspace/runs")
    assert res.status_code == 200

    res = client.get("/api/workspace")
    assert res.json()["recentRuns"] == []


def test_update_favorites():
    res = client.put("/api/workspace/favorites", json={"modelIds": ["mc", "apt"]})
    assert res.status_code == 200

    res = client.get("/api/workspace")
    assert res.json()["favorites"]["modelIds"] == ["mc", "apt"]


def test_clear_workspace():
    client.post("/api/workspace/scenarios", json={"name": "X", "modelId": "bs"})
    client.post("/api/workspace/runs", json={"modelId": "bs"})

    res = client.delete("/api/workspace")
    assert res.status_code == 200

    res = client.get("/api/workspace")
    assert res.json()["scenarios"] == {}
    assert res.json()["recentRuns"] == []


def test_scenario_not_found():
    res = client.put("/api/workspace/scenarios/nonexistent", json={"name": "X"})
    assert res.status_code == 404


def test_preset_not_found():
    res = client.delete("/api/workspace/presets/nonexistent")
    assert res.status_code == 404
