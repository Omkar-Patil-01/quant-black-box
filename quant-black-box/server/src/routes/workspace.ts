import { Router } from 'express';
import { db } from '../db.js';

const router = Router();
const MAX_RECENT_RUNS = 50;

function _uid(): string {
  return new Date().toISOString().replace(/[-T:\.Z]/g, '').slice(0, 14) + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}
function _now(): string {
  return new Date().toISOString();
}

async function loadWorkspace() {
  const scenarios: Record<string, unknown> = {};
  for (const r of (await db.execute('SELECT * FROM scenarios')).rows) {
    scenarios[r.id as string] = {
      id: r.id, name: r.name, modelId: r.model_id, description: r.description,
      createdAt: r.created_at, updatedAt: r.updated_at,
      parameters: JSON.parse(r.parameters as string), tags: JSON.parse(r.tags as string),
    };
  }
  const presets: Record<string, unknown> = {};
  for (const r of (await db.execute('SELECT * FROM presets')).rows) {
    presets[r.id as string] = {
      id: r.id, name: r.name, modelId: r.model_id,
      parameters: JSON.parse(r.parameters as string), tags: JSON.parse(r.tags as string),
      createdAt: r.created_at,
    };
  }
  const runs = (await db.execute({ sql: 'SELECT * FROM recent_runs ORDER BY timestamp DESC LIMIT ?', args: [MAX_RECENT_RUNS] })).rows.map((r) => ({
    runId: r.run_id, timestamp: r.timestamp, runtimeMs: r.runtime_ms, modelId: r.model_id,
    scenarioName: r.scenario_name, inputs: JSON.parse(r.inputs as string), outputsSummary: JSON.parse(r.outputs_summary as string),
  }));
  const favRow = (await db.execute('SELECT model_ids FROM favorites WHERE id = 1')).rows;
  const favIds = favRow.length ? JSON.parse(favRow[0].model_ids as string) : ['bs', 'heston', 'bl', 'mc', 'apt'];
  const deleted: Record<string, unknown> = {};
  for (const r of (await db.execute('SELECT * FROM deleted_scenarios')).rows) {
    deleted[r.id as string] = {
      id: r.id, name: r.name, modelId: r.model_id, description: r.description,
      createdAt: r.created_at, updatedAt: r.updated_at,
      parameters: JSON.parse(r.parameters as string), tags: JSON.parse(r.tags as string),
    };
  }
  const metaRows = (await db.execute('SELECT key, value FROM workspace_meta')).rows;
  const meta: Record<string, string> = {};
  for (const r of metaRows) meta[r.key as string] = r.value as string;
  return {
    version: meta.version || '1.0.0', activeModelId: meta.activeModelId || null,
    activeScenarioId: meta.activeScenarioId || null, lastUpdated: meta.lastUpdated || _now(),
    favorites: { modelIds: favIds }, scenarios, recentRuns: runs, presets,
    deletedScenarios: deleted,
    lastModelParams: meta.lastModelParams ? JSON.parse(meta.lastModelParams) : null,
  };
}

async function saveWorkspace(state: Record<string, unknown>) {
  await db.execute('DELETE FROM scenarios');
  await db.execute('DELETE FROM presets');
  await db.execute('DELETE FROM recent_runs');
  await db.execute('DELETE FROM deleted_scenarios');
  await db.execute('DELETE FROM workspace_meta');
  for (const [, s] of Object.entries(state.scenarios as Record<string, Record<string, unknown>> || {})) {
    await db.execute({
      sql: 'INSERT INTO scenarios (id, name, model_id, description, parameters, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [s.id as string, s.name as string, s.modelId as string, (s.description as string) || null, JSON.stringify(s.parameters || {}), JSON.stringify(s.tags || []), s.createdAt as string, s.updatedAt as string],
    });
  }
  for (const [, p] of Object.entries(state.presets as Record<string, Record<string, unknown>> || {})) {
    await db.execute({
      sql: 'INSERT INTO presets (id, name, model_id, parameters, tags, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [p.id as string, p.name as string, p.modelId as string, JSON.stringify(p.parameters || {}), JSON.stringify(p.tags || []), p.createdAt as string],
    });
  }
  for (const [, s] of Object.entries(state.deletedScenarios as Record<string, Record<string, unknown>> || {})) {
    await db.execute({
      sql: 'INSERT INTO deleted_scenarios (id, name, model_id, description, parameters, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [s.id as string, s.name as string, s.modelId as string, (s.description as string) || null, JSON.stringify(s.parameters || {}), JSON.stringify(s.tags || []), s.createdAt as string, s.updatedAt as string],
    });
  }
  for (const run of (state.recentRuns as Array<Record<string, unknown>> || [])) {
    await db.execute({
      sql: 'INSERT INTO recent_runs (run_id, timestamp, runtime_ms, model_id, scenario_name, inputs, outputs_summary) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [run.runId as string, run.timestamp as string, Number(run.runtimeMs), run.modelId as string, run.scenarioName as string, JSON.stringify(run.inputs || {}), JSON.stringify(run.outputsSummary || {})],
    });
  }
  const favIds = (state.favorites as Record<string, string[]>)?.modelIds || ['bs', 'heston', 'bl', 'mc', 'apt'];
  await db.execute('DELETE FROM favorites');
  await db.execute({ sql: 'INSERT INTO favorites (id, model_ids) VALUES (1, ?)', args: [JSON.stringify(favIds)] });
  const meta: Record<string, string> = {
    version: String(state.version || '1.0.0'),
    activeModelId: String(state.activeModelId || ''),
    activeScenarioId: String(state.activeScenarioId || ''),
    lastUpdated: String(state.lastUpdated || _now()),
  };
  if (state.lastModelParams != null) meta.lastModelParams = JSON.stringify(state.lastModelParams);
  for (const [k, v] of Object.entries(meta)) {
    await db.execute({ sql: 'INSERT OR REPLACE INTO workspace_meta (key, value) VALUES (?, ?)', args: [k, v] });
  }
}

async function clearWorkspace() {
  await db.execute('DELETE FROM scenarios');
  await db.execute('DELETE FROM presets');
  await db.execute('DELETE FROM recent_runs');
  await db.execute('DELETE FROM deleted_scenarios');
  await db.execute('DELETE FROM workspace_meta');
  await db.execute({ sql: 'INSERT OR REPLACE INTO favorites (id, model_ids) VALUES (1, ?)', args: [JSON.stringify(['bs', 'heston', 'bl', 'mc', 'apt'])] });
}

// ─── Routes ───────────────────────────────────────────

router.get('/', async (_req, res) => {
  try { res.json(await loadWorkspace()); }
  catch (e) { console.error('[Workspace]', e); res.status(500).json({ error: 'Failed to load workspace' }); }
});

router.put('/', async (req, res) => {
  try { await saveWorkspace(req.body); res.json({ status: 'ok' }); }
  catch (e) { console.error('[Workspace]', e); res.status(500).json({ error: 'Failed to save workspace' }); }
});

router.delete('/', async (_req, res) => {
  try { await clearWorkspace(); res.json({ status: 'ok' }); }
  catch (e) { console.error('[Workspace]', e); res.status(500).json({ error: 'Failed to clear workspace' }); }
});

// ─── Scenarios ────────────────────────────────────────

router.post('/scenarios', async (req, res) => {
  try {
    const { name, modelId, parameters = {}, tags = [], description } = req.body;
    const now = _now();
    const id = _uid();
    const scenario = { id, name, modelId, description, createdAt: now, updatedAt: now, parameters, tags };
    const state = await loadWorkspace();
    (state.scenarios as Record<string, unknown>)[id] = scenario;
    state.activeScenarioId = id;
    state.lastUpdated = now;
    await saveWorkspace(state);
    res.json(scenario);
  } catch (e) { console.error('[Workspace]', e); res.status(500).json({ error: 'Failed to create scenario' }); }
});

router.put('/scenarios/:id', async (req, res) => {
  try {
    const state = await loadWorkspace();
    const s = (state.scenarios as Record<string, Record<string, unknown>>)[req.params.id];
    if (!s) { res.status(404).json({ error: 'Scenario not found' }); return; }
    const now = _now();
    if (req.body.name !== undefined) s.name = req.body.name;
    if (req.body.tags !== undefined) s.tags = req.body.tags;
    if (req.body.parameters !== undefined) s.parameters = req.body.parameters;
    if (req.body.description !== undefined) s.description = req.body.description;
    s.updatedAt = now;
    state.lastUpdated = now;
    await saveWorkspace(state);
    res.json(s);
  } catch (e) { console.error('[Workspace]', e); res.status(500).json({ error: 'Failed to update scenario' }); }
});

router.delete('/scenarios/:id', async (req, res) => {
  try {
    const state = await loadWorkspace();
    const scenarios = state.scenarios as Record<string, Record<string, unknown>>;
    if (!scenarios[req.params.id]) { res.status(404).json({ error: 'Scenario not found' }); return; }
    const removed = scenarios[req.params.id];
    delete scenarios[req.params.id];
    (state.deletedScenarios as Record<string, unknown>)[req.params.id] = removed;
    if (state.activeScenarioId === req.params.id) state.activeScenarioId = null;
    state.lastUpdated = _now();
    await saveWorkspace(state);
    res.json({ status: 'deleted', id: req.params.id });
  } catch (e) { console.error('[Workspace]', e); res.status(500).json({ error: 'Failed to delete scenario' }); }
});

router.post('/scenarios/:id/restore', async (req, res) => {
  try {
    const state = await loadWorkspace();
    const deleted = state.deletedScenarios as Record<string, Record<string, unknown>>;
    if (!deleted[req.params.id]) { res.status(404).json({ error: 'Deleted scenario not found' }); return; }
    const restored = deleted[req.params.id];
    delete deleted[req.params.id];
    (state.scenarios as Record<string, unknown>)[req.params.id] = restored;
    state.lastUpdated = _now();
    await saveWorkspace(state);
    res.json(restored);
  } catch (e) { console.error('[Workspace]', e); res.status(500).json({ error: 'Failed to restore scenario' }); }
});

// ─── Presets ──────────────────────────────────────────

router.post('/presets', async (req, res) => {
  try {
    const { name, modelId, parameters = {}, tags = [] } = req.body;
    const id = _uid();
    const preset = { id, name, modelId, parameters, tags, createdAt: _now() };
    const state = await loadWorkspace();
    (state.presets as Record<string, unknown>)[id] = preset;
    state.lastUpdated = _now();
    await saveWorkspace(state);
    res.json(preset);
  } catch (e) { console.error('[Workspace]', e); res.status(500).json({ error: 'Failed to create preset' }); }
});

router.delete('/presets/:id', async (req, res) => {
  try {
    const state = await loadWorkspace();
    const presets = state.presets as Record<string, Record<string, unknown>>;
    if (!presets[req.params.id]) { res.status(404).json({ error: 'Preset not found' }); return; }
    delete presets[req.params.id];
    state.lastUpdated = _now();
    await saveWorkspace(state);
    res.json({ status: 'deleted', id: req.params.id });
  } catch (e) { console.error('[Workspace]', e); res.status(500).json({ error: 'Failed to delete preset' }); }
});

// ─── Recent runs ──────────────────────────────────────

router.post('/runs', async (req, res) => {
  try {
    const { modelId, scenarioName = 'Live', inputs = {}, outputsSummary = {}, runtimeMs = 0 } = req.body;
    const entry = { runId: _uid(), timestamp: _now(), runtimeMs, modelId, scenarioName, inputs, outputsSummary };
    const state = await loadWorkspace();
    const runs = [entry, ...((state.recentRuns as Array<Record<string, unknown>>) || [])].slice(0, MAX_RECENT_RUNS);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state as any).recentRuns = runs;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state as any).lastUpdated = _now();
    await saveWorkspace(state);
    res.json(entry);
  } catch (e) { console.error('[Workspace]', e); res.status(500).json({ error: 'Failed to record run' }); }
});

router.delete('/runs', async (_req, res) => {
  try {
    const state = await loadWorkspace();
    state.recentRuns = [];
    state.lastUpdated = _now();
    await saveWorkspace(state);
    res.json({ status: 'cleared' });
  } catch (e) { console.error('[Workspace]', e); res.status(500).json({ error: 'Failed to clear history' }); }
});

// ─── Favorites ────────────────────────────────────────

router.put('/favorites', async (req, res) => {
  try {
    const { modelIds } = req.body;
    const state = await loadWorkspace();
    state.favorites = { modelIds };
    state.lastUpdated = _now();
    await saveWorkspace(state);
    res.json({ modelIds });
  } catch (e) { console.error('[Workspace]', e); res.status(500).json({ error: 'Failed to update favorites' }); }
});

export default router;
