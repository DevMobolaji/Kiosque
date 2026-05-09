import { z } from "zod";
import { readFileSync } from "fs";
import { resolve } from "path";

const envSchema = z.object({
  // App
  PORT: z.coerce.number().default(3000),
  API_VERSION: z.string().min(1),
  APP_NAME: z.string().min(1),
  ENVIRONMENT: z.enum(["development", "production", "test"]).default("development"),

  // Database
  DATABASE_URL: z.string(),

  // Redis
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_MAX_RETRIES_PER_REQUEST: z.coerce.number().default(3),
  REDIS_ENABLE_READY_CHECK: z.coerce.boolean().default(true),
  REDIS_ENABLE_OFFLINE_QUEUE: z.coerce.boolean().default(true),

  // JWT — RS256 asymmetric
  JWT_PRIVATE_KEY_PATH: z.string().optional(),
  JWT_PUBLIC_KEY_PATH: z.string().optional(),
  JWT_PRIVATE_KEY: z.string().optional(),
  JWT_PUBLIC_KEY: z.string().optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  JWT_ISSUER: z.string().default("kiosque"),
  JWT_AUDIENCE: z.string().default("kiosque-api"),

  // Logging
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("debug"),

  // CORS
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((val) => val.split(",").map((v) => v.trim())),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

const parsed = envSchema.parse(process.env);

/**
 * Load JWT keys from either file path (dev) or raw env value (production).
 * Throws fast at startup if keys are missing — better than mysterious 500s later.
 */
function loadKey(directValue: string | undefined, pathValue: string | undefined, label: string): string {
  if (directValue && directValue.trim().length > 0) {
    return directValue.replace(/\\n/g, "\n");
  }
  if (pathValue) {
    try {
      return readFileSync(resolve(pathValue), "utf-8");
    } catch (err) {
      throw new Error(`Failed to read ${label} from ${pathValue}: ${(err as Error).message}`);
    }
  }
  throw new Error(`${label} is missing — set either JWT_${label}_KEY or JWT_${label}_KEY_PATH`);
}

const jwtPrivateKey = loadKey(parsed.JWT_PRIVATE_KEY, parsed.JWT_PRIVATE_KEY_PATH, "PRIVATE");
const jwtPublicKey = loadKey(parsed.JWT_PUBLIC_KEY, parsed.JWT_PUBLIC_KEY_PATH, "PUBLIC");

export const config = {
  app: {
    port: parsed.PORT,
    apiVersion: parsed.API_VERSION,
    name: parsed.APP_NAME,
    env: parsed.ENVIRONMENT,
  },

  database: {
    url: parsed.DATABASE_URL,
  },

  redis: {
    host: parsed.REDIS_HOST,
    port: parsed.REDIS_PORT,
    password: parsed.REDIS_PASSWORD,
    db: 0,
    maxRetriesPerRequest: parsed.REDIS_MAX_RETRIES_PER_REQUEST,
    enableReadyCheck: parsed.REDIS_ENABLE_READY_CHECK,
    enableOfflineQueue: parsed.REDIS_ENABLE_OFFLINE_QUEUE,
  },

  jwt: {
    privateKey: jwtPrivateKey,
    publicKey: jwtPublicKey,
    accessExpiresIn: parsed.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: parsed.JWT_REFRESH_EXPIRES_IN,
    issuer: parsed.JWT_ISSUER,
    audience: parsed.JWT_AUDIENCE,
    algorithm: "RS256" as const,
  },

  logging: {
    level: parsed.LOG_LEVEL,
  },

  cors: {
    origins: parsed.CORS_ORIGINS,
  },

  rateLimit: {
    windowMs: parsed.RATE_LIMIT_WINDOW_MS,
    max: parsed.RATE_LIMIT_MAX_REQUESTS,
  },
} as const;

export type Env = z.infer<typeof envSchema>;
