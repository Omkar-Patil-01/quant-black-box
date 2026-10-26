import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid env:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
