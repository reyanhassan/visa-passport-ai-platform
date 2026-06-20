import { z } from "zod";

export * from "./countryRules.js";
export * from "./security.js";

const workerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  OCR_SERVICE_URL: z.string().url().default("http://localhost:8001"),
  INTERNAL_API_KEY: z.string().min(24).optional(),
  PASSPORT_EXTRACTION_QUEUE: z.string().min(1).default("passport-extraction"),
});

export type WorkerEnv = z.infer<typeof workerEnvSchema>;

export function loadWorkerEnv(source: NodeJS.ProcessEnv = process.env): WorkerEnv {
  const result = workerEnvSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid worker environment:\n${issues.join("\n")}`);
  }

  return result.data;
}
