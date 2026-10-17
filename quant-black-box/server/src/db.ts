import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
const run = url ? neon(url) : null;

if (!run) console.warn('[DB] DATABASE_URL is not set — /api/workspace will fail');

// Lazy on purpose: a missing DATABASE_URL degrades the workspace routes only,
// instead of killing the whole serverless function at import time.
export function sql(strings: TemplateStringsArray | string, ...params: unknown[]) {
  if (!run) throw new Error('DATABASE_URL is not set');
  const q = run as unknown as (
    s: TemplateStringsArray | string,
    ...p: unknown[]
  ) => Promise<Record<string, unknown>[]>;
  return typeof strings === 'string' ? q(strings, params[0]) : q(strings, ...params);
}
