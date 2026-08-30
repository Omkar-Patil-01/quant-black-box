import { createClient } from '@libsql/client';
import { env } from './config.js';

export const db = createClient({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN || undefined,
});
