import { neon } from '@neondatabase/serverless';

// `||` not `??`: an empty env var must read as unset. neon('') would throw at
// import time and kill the whole function — the same failure mode as a
// required LSE_API_KEY used to cause.
const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const run = url ? neon(url) : null;

if (!run) console.warn('[DB] DATABASE_URL is not set — /api/workspace will fail');

// Lazy on purpose: a missing DATABASE_URL degrades the workspace routes only,
// instead of killing the whole serverless function at import time.
export function sql(strings: TemplateStringsArray | string, ...params: unknown[]) {
  if (!run) throw new Error('DATABASE_URL is not set');
  const q = run as unknown as {
    (s: TemplateStringsArray, ...p: unknown[]): Promise<Record<string, unknown>[]>;
    query(text: string, p?: unknown[]): Promise<Record<string, unknown>[]>;
  };
  // Neon's sql() only accepts the tagged-template form; a plain
  // sql("...") throws, so the string form has to go through .query().
  return typeof strings === 'string'
    ? q.query(strings, (params[0] as unknown[]) ?? [])
    : q(strings, ...params);
}
