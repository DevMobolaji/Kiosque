import dotenv from "dotenv"
import { z } from "zod";

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().url(),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_MAX_RETRIES_PER_REQUEST: z.coerce.number().default(3),
  REDIS_ENABLE_READY_CHECK: z.boolean().default(true),
  REDIS_ENABLE_OFFLINE_QUEUE: z.boolean().default(true),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('debug'),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

const parsed = envSchema.safeParse(process.env);

export const config = {
  app: {

  },
  database: {},
  redis: {
    host: parsed.success ? parsed.data.REDIS_HOST : 'localhost',
    port: parsed.success ? parsed.data.REDIS_PORT : 6379,
    password: parsed.success ? parsed.data.REDIS_PASSWORD : undefined,
    db: 0, // Default Redis DB
    maxRetriesPerRequest: parsed.success ? parsed.data.REDIS_MAX_RETRIES_PER_REQUEST : 3,
    enableReadyCheck: parsed.success ? parsed.data.REDIS_ENABLE_READY_CHECK : true,
    enableOfflineQueue: parsed.success ? parsed.data.REDIS_ENABLE_OFFLINE_QUEUE : true,
  }
} as const;

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
