"""SQLite persistence layer for workspace state, via aiosqlite."""

import json
from datetime import datetime, timezone

import aiosqlite

DB_PATH = "workspace.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model_id TEXT NOT NULL,
    description TEXT,
    parameters TEXT NOT NULL DEFAULT '{}',
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model_id TEXT NOT NULL,
    parameters TEXT NOT NULL DEFAULT '{}',
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recent_runs (
    run_id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    runtime_ms REAL NOT NULL DEFAULT 0,
    model_id TEXT NOT NULL,
    scenario_name TEXT NOT NULL DEFAULT '',
    inputs TEXT NOT NULL DEFAULT '{}',
    outputs_summary TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    model_ids TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS deleted_scenarios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model_id TEXT NOT NULL,
    description TEXT,
    parameters TEXT NOT NULL DEFAULT '{}',
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""

MAX_RECENT_RUNS = 50


async def _get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db() -> None:
    db = await _get_db()
    try:
        await db.executescript(SCHEMA)
        # Ensure favorites row exists
        await db.execute(
            "INSERT OR IGNORE INTO favorites (id, model_ids) VALUES (1, ?)",
            [json.dumps(["bs", "heston", "bl", "mc", "apt"])],
        )
        await db.commit()
    finally:
        await db.close()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Full state load/save ───────────────────────────────


async def load_workspace() -> dict:
    db = await _get_db()
    try:
        # Scenarios
        rows = await db.execute_fetchall("SELECT * FROM scenarios")
        scenarios = {}
        for r in rows:
            scenarios[r["id"]] = {
                "id": r["id"],
                "name": r["name"],
                "modelId": r["model_id"],
                "description": r["description"],
                "createdAt": r["created_at"],
                "updatedAt": r["updated_at"],
                "parameters": json.loads(r["parameters"]),
                "tags": json.loads(r["tags"]),
            }

        # Deleted scenarios (stored in a separate table or as a flag)
        # For simplicity, we don't persist deleted scenarios beyond the undo window

        # Presets
        rows = await db.execute_fetchall("SELECT * FROM presets")
        presets = {}
        for r in rows:
            presets[r["id"]] = {
                "id": r["id"],
                "name": r["name"],
                "modelId": r["model_id"],
                "parameters": json.loads(r["parameters"]),
                "tags": json.loads(r["tags"]),
                "createdAt": r["created_at"],
            }

        # Recent runs
        rows = await db.execute_fetchall(
            "SELECT * FROM recent_runs ORDER BY timestamp DESC LIMIT ?",
            [MAX_RECENT_RUNS],
        )
        recent_runs = []
        for r in rows:
            recent_runs.append({
                "runId": r["run_id"],
                "timestamp": r["timestamp"],
                "runtimeMs": r["runtime_ms"],
                "modelId": r["model_id"],
                "scenarioName": r["scenario_name"],
                "inputs": json.loads(r["inputs"]),
                "outputsSummary": json.loads(r["outputs_summary"]),
            })

        # Favorites
        row = await db.execute_fetchall("SELECT model_ids FROM favorites WHERE id = 1")
        fav_ids = json.loads(row[0]["model_ids"]) if row else ["bs", "heston", "bl", "mc", "apt"]

        # Deleted scenarios
        rows = await db.execute_fetchall("SELECT * FROM deleted_scenarios")
        deleted = {}
        for r in rows:
            deleted[r["id"]] = {
                "id": r["id"],
                "name": r["name"],
                "modelId": r["model_id"],
                "description": r["description"],
                "createdAt": r["created_at"],
                "updatedAt": r["updated_at"],
                "parameters": json.loads(r["parameters"]),
                "tags": json.loads(r["tags"]),
            }

        # Meta
        rows = await db.execute_fetchall("SELECT key, value FROM workspace_meta")
        meta = {r["key"]: r["value"] for r in rows}

        return {
            "version": meta.get("version", "1.0.0"),
            "activeModelId": meta.get("activeModelId"),
            "activeScenarioId": meta.get("activeScenarioId"),
            "lastUpdated": meta.get("lastUpdated", _now_iso()),
            "favorites": {"modelIds": fav_ids},
            "scenarios": scenarios,
            "recentRuns": recent_runs,
            "presets": presets,
            "deletedScenarios": deleted,
            "lastModelParams": json.loads(meta["lastModelParams"]) if "lastModelParams" in meta else None,
        }
    finally:
        await db.close()


async def save_workspace(state: dict) -> None:
    db = await _get_db()
    try:
        # Clear existing data
        await db.execute("DELETE FROM scenarios")
        await db.execute("DELETE FROM presets")
        await db.execute("DELETE FROM recent_runs")
        await db.execute("DELETE FROM deleted_scenarios")
        await db.execute("DELETE FROM workspace_meta")

        # Scenarios
        for sid, s in state.get("scenarios", {}).items():
            await db.execute(
                "INSERT INTO scenarios (id, name, model_id, description, parameters, tags, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    s["id"], s["name"], s["modelId"], s.get("description"),
                    json.dumps(s["parameters"]), json.dumps(s["tags"]),
                    s["createdAt"], s["updatedAt"],
                ],
            )

        # Presets
        for pid, p in state.get("presets", {}).items():
            await db.execute(
                "INSERT INTO presets (id, name, model_id, parameters, tags, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                [
                    p["id"], p["name"], p["modelId"],
                    json.dumps(p["parameters"]), json.dumps(p["tags"]),
                    p["createdAt"],
                ],
            )

        # Deleted scenarios
        for sid, s in state.get("deletedScenarios", {}).items():
            await db.execute(
                "INSERT INTO deleted_scenarios (id, name, model_id, description, parameters, tags, created_at, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    s["id"], s["name"], s["modelId"], s.get("description"),
                    json.dumps(s["parameters"]), json.dumps(s["tags"]),
                    s["createdAt"], s["updatedAt"],
                ],
            )

        # Recent runs
        for run in state.get("recentRuns", []):
            await db.execute(
                "INSERT INTO recent_runs (run_id, timestamp, runtime_ms, model_id, scenario_name, inputs, outputs_summary) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    run["runId"], run["timestamp"], run["runtimeMs"],
                    run["modelId"], run["scenarioName"],
                    json.dumps(run["inputs"]), json.dumps(run["outputsSummary"]),
                ],
            )

        # Favorites
        fav_ids = state.get("favorites", {}).get("modelIds", ["bs", "heston", "bl", "mc", "apt"])
        await db.execute("DELETE FROM favorites")
        await db.execute(
            "INSERT INTO favorites (id, model_ids) VALUES (1, ?)",
            [json.dumps(fav_ids)],
        )

        # Meta
        meta = {
            "version": state.get("version", "1.0.0"),
            "activeModelId": state.get("activeModelId") or "",
            "activeScenarioId": state.get("activeScenarioId") or "",
            "lastUpdated": state.get("lastUpdated", _now_iso()),
        }
        if state.get("lastModelParams") is not None:
            meta["lastModelParams"] = json.dumps(state["lastModelParams"])

        for k, v in meta.items():
            await db.execute(
                "INSERT OR REPLACE INTO workspace_meta (key, value) VALUES (?, ?)",
                [k, v],
            )

        await db.commit()
    finally:
        await db.close()


async def clear_workspace() -> None:
    db = await _get_db()
    try:
        await db.execute("DELETE FROM scenarios")
        await db.execute("DELETE FROM presets")
        await db.execute("DELETE FROM recent_runs")
        await db.execute("DELETE FROM deleted_scenarios")
        await db.execute("DELETE FROM workspace_meta")
        await db.execute(
            "INSERT OR REPLACE INTO favorites (id, model_ids) VALUES (1, ?)",
            [json.dumps(["bs", "heston", "bl", "mc", "apt"])],
        )
        await db.commit()
    finally:
        await db.close()
