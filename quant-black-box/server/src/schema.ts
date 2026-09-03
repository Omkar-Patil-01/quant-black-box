import { db } from './db.js';

const SCHEMA = `
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
`;

export async function initSchema() {
  const statements = SCHEMA.split(';').map((s) => s.trim()).filter((s) => s.length > 0);
  for (const sql of statements) {
    await db.execute(sql);
  }
  await db.execute({
    sql: 'INSERT OR IGNORE INTO favorites (id, model_ids) VALUES (1, ?)',
    args: [JSON.stringify(['bs', 'heston', 'bl', 'mc', 'apt', 'kf'])],
  });
  console.log('[DB] Schema initialized');
}
