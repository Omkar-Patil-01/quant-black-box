"""Workspace persistence router — scenarios, presets, runs, favorites."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from .. import database
from ..schemas import (
    FavoritesUpdateRequest,
    ModelExecutionSnapshot,
    ParameterPreset,
    PresetCreateRequest,
    RunRecordRequest,
    ScenarioConfig,
    ScenarioCreateRequest,
    ScenarioUpdateRequest,
    WorkspaceState,
)

router = APIRouter()

MAX_RECENT_RUNS = 50


def _uid() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S") + uuid.uuid4().hex[:8]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Full state ─────────────────────────────────────────


@router.get("")
async def load_workspace() -> dict:
    return await database.load_workspace()


@router.put("")
async def save_workspace(state: WorkspaceState) -> dict:
    await database.save_workspace(state.model_dump())
    return {"status": "ok"}


@router.delete("")
async def clear_workspace() -> dict:
    await database.clear_workspace()
    return {"status": "ok"}


# ─── Scenarios ──────────────────────────────────────────


@router.post("/scenarios")
async def create_scenario(req: ScenarioCreateRequest) -> dict:
    now = _now()
    scenario = ScenarioConfig(
        id=_uid(),
        name=req.name,
        modelId=req.modelId,
        description=req.description,
        createdAt=now,
        updatedAt=now,
        parameters=req.parameters,
        tags=req.tags,
    )
    state = await database.load_workspace()
    state["scenarios"][scenario.id] = scenario.model_dump()
    state["activeScenarioId"] = scenario.id
    state["lastUpdated"] = now
    await database.save_workspace(state)
    return scenario.model_dump()


@router.put("/scenarios/{scenario_id}")
async def update_scenario(scenario_id: str, req: ScenarioUpdateRequest) -> dict:
    state = await database.load_workspace()
    if scenario_id not in state["scenarios"]:
        raise HTTPException(status_code=404, detail="Scenario not found")
    s = state["scenarios"][scenario_id]
    now = _now()
    if req.name is not None:
        s["name"] = req.name
    if req.tags is not None:
        s["tags"] = req.tags
    if req.parameters is not None:
        s["parameters"] = req.parameters
    if req.description is not None:
        s["description"] = req.description
    s["updatedAt"] = now
    state["lastUpdated"] = now
    await database.save_workspace(state)
    return s


@router.delete("/scenarios/{scenario_id}")
async def delete_scenario(scenario_id: str) -> dict:
    state = await database.load_workspace()
    if scenario_id not in state["scenarios"]:
        raise HTTPException(status_code=404, detail="Scenario not found")
    removed = state["scenarios"].pop(scenario_id)
    state["deletedScenarios"][scenario_id] = removed
    if state.get("activeScenarioId") == scenario_id:
        state["activeScenarioId"] = None
    state["lastUpdated"] = _now()
    await database.save_workspace(state)
    return {"status": "deleted", "id": scenario_id}


@router.post("/scenarios/{scenario_id}/restore")
async def restore_scenario(scenario_id: str) -> dict:
    state = await database.load_workspace()
    if scenario_id not in state.get("deletedScenarios", {}):
        raise HTTPException(status_code=404, detail="Deleted scenario not found")
    restored = state["deletedScenarios"].pop(scenario_id)
    state["scenarios"][scenario_id] = restored
    state["lastUpdated"] = _now()
    await database.save_workspace(state)
    return restored


# ─── Presets ────────────────────────────────────────────


@router.post("/presets")
async def create_preset(req: PresetCreateRequest) -> dict:
    preset = ParameterPreset(
        id=_uid(),
        name=req.name,
        modelId=req.modelId,
        parameters=req.parameters,
        tags=req.tags,
        createdAt=_now(),
    )
    state = await database.load_workspace()
    state["presets"][preset.id] = preset.model_dump()
    state["lastUpdated"] = _now()
    await database.save_workspace(state)
    return preset.model_dump()


@router.delete("/presets/{preset_id}")
async def delete_preset(preset_id: str) -> dict:
    state = await database.load_workspace()
    if preset_id not in state["presets"]:
        raise HTTPException(status_code=404, detail="Preset not found")
    del state["presets"][preset_id]
    state["lastUpdated"] = _now()
    await database.save_workspace(state)
    return {"status": "deleted", "id": preset_id}


# ─── Recent runs ────────────────────────────────────────


@router.post("/runs")
async def record_run(req: RunRecordRequest) -> dict:
    entry = ModelExecutionSnapshot(
        runId=_uid(),
        timestamp=_now(),
        runtimeMs=req.runtimeMs,
        modelId=req.modelId,
        scenarioName=req.scenarioName,
        inputs=req.inputs,
        outputsSummary=req.outputsSummary,
    )
    state = await database.load_workspace()
    runs = [entry.model_dump()] + state.get("recentRuns", [])
    state["recentRuns"] = runs[:MAX_RECENT_RUNS]
    state["lastUpdated"] = _now()
    await database.save_workspace(state)
    return entry.model_dump()


@router.delete("/runs")
async def clear_history() -> dict:
    state = await database.load_workspace()
    state["recentRuns"] = []
    state["lastUpdated"] = _now()
    await database.save_workspace(state)
    return {"status": "cleared"}


# ─── Favorites ──────────────────────────────────────────


@router.put("/favorites")
async def update_favorites(req: FavoritesUpdateRequest) -> dict:
    state = await database.load_workspace()
    state["favorites"] = {"modelIds": req.modelIds}
    state["lastUpdated"] = _now()
    await database.save_workspace(state)
    return {"modelIds": req.modelIds}
