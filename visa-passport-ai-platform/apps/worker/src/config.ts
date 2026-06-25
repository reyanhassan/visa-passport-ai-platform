import "dotenv/config";

import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  OCR_SERVICE_URL: z.string().url().default("http://localhost:8001"),
  OCR_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  INTERNAL_API_KEY: z.string().min(24).optional(),
  FIELD_ENCRYPTION_KEY: z.string().min(16),
  PASSPORT_EXTRACTION_QUEUE: z.string().min(1).default("passport-extraction"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`,
  );
  throw new Error(`Invalid worker environment:\n${issues.join("\n")}`);
}

export const workerConfig = {
  nodeEnv: parsed.data.NODE_ENV,
  databaseUrl: parsed.data.DATABASE_URL,
  redisUrl: parsed.data.REDIS_URL,
  appUrl: parsed.data.NEXT_PUBLIC_APP_URL.replace(/\/$/, ""),
  ocrServiceUrl: parsed.data.OCR_SERVICE_URL,
  ocrRequestTimeoutMs: parsed.data.OCR_REQUEST_TIMEOUT_MS,
  internalApiKey: parsed.data.INTERNAL_API_KEY,
  queueName: parsed.data.PASSPORT_EXTRACTION_QUEUE,
  concurrency: parsed.data.WORKER_CONCURRENCY,
} as const;
