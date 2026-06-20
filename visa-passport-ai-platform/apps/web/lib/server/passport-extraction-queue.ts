import type { PassportExtractionQueuePayload } from "@visa-platform/types";
import { Queue } from "bullmq";

type QueueGlobal = typeof globalThis & {
  passportExtractionQueue?: Queue<PassportExtractionQueuePayload>;
};

const globalForQueue = globalThis as QueueGlobal;

function createQueue() {
  const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  const database = redisUrl.pathname.slice(1);

  return new Queue<PassportExtractionQueuePayload>(
    process.env.PASSPORT_EXTRACTION_QUEUE ?? "passport-extraction",
    {
      connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port || 6379),
        username: redisUrl.username || undefined,
        password: redisUrl.password || undefined,
        db: database ? Number(database) : undefined,
        tls: redisUrl.protocol === "rediss:" ? {} : undefined,
        connectTimeout: 10_000,
        maxRetriesPerRequest: 1,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: { count: 1_000 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
      },
    },
  );
}

export function getPassportExtractionQueue() {
  globalForQueue.passportExtractionQueue ??= createQueue();
  return globalForQueue.passportExtractionQueue;
}
