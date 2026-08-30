import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  TURSO_DATABASE_URL: z.string().default('file:local.db'),
  TURSO_AUTH_TOKEN: z.string().optional(),
  LSE_API_KEY: z.string().min(1, 'LSE_API_KEY required'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid env:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
