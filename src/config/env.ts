// src/config/env.ts

import { z } from "zod";

/**
 * Schema
 */
const envSchema = z.object({
  // App
  PORT: z.coerce.number().default(3000),
  API_VERSION: z.string().min(1),
  APP_NAME: z.string().min(1),
  ENVIRONMENT: z.enum(["development", "production", "test"]).default("development"),

  // Database
  DATABASE_URL: z.string(), //will later change to .url() with proper validation, but for now just ensure it's a string and present

  // Redis
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_MAX_RETRIES_PER_REQUEST: z.coerce.number().default(3),
  REDIS_ENABLE_READY_CHECK: z.coerce.boolean().default(true),
  REDIS_ENABLE_OFFLINE_QUEUE: z.coerce.boolean().default(true),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

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

/**
 * Validation (fail-fast)
 */
const parsed = envSchema.parse(process.env);

/**
 * Typed config object
 */
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
    accessSecret: parsed.JWT_ACCESS_SECRET,
    refreshSecret: parsed.JWT_REFRESH_SECRET,
    accessExpiresIn: parsed.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: parsed.JWT_REFRESH_EXPIRES_IN,
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

/**
 * Type export
 */
export type Env = z.infer<typeof envSchema>;