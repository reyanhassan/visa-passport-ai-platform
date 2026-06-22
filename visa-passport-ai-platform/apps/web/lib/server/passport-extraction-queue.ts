import type { PassportExtractionQueuePayload } from "@visa-platform/types";
import { Queue } from "bullmq";

type QueueGlobal = typeof globalThis & {
  passportExtractionQueue?: Queue<PassportExtractionQueuePayload>;
};

const globalForQueue = globalThis as QueueGlobal;

function createQueue() {
  const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  const database = redisUrl.pathname.slice(1);

  const queue = new Queue<PassportExtractionQueuePayload>(
    process.env.PASSPORT_EXTRACTION_QUEUE ?? "passport-extraction",
    {
      connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port || 6379),
        username: redisUrl.username || undefined,
        password: redisUrl.password || undefined,
        db: database ? Number(database) : undefined,
        tls: redisUrl.protocol === "rediss:" ? {} : undefined,
        connectTimeout: 3_000,
        maxRetriesPerRequest: 1,
        retryStrategy(attempt) {
          return attempt > 2 ? null : attempt * 250;
        },
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: { count: 1_000 },
        removeOnFail: { age: 7 * 24 * 60 * 60 },
      },
    },
  );

  queue.on("error", (error) => {
    if (process.env.NODE_ENV !== "development") {
      console.error(`[passport-extraction-queue] Redis connection unavailable: ${error.name}`);
    }
  });

  return queue;
}

export function getPassportExtractionQueue() {
  globalForQueue.passportExtractionQueue ??= createQueue();
  return globalForQueue.passportExtractionQueue;
}

export function resetPassportExtractionQueue() {
  const queue = globalForQueue.passportExtractionQueue;
  globalForQueue.passportExtractionQueue = undefined;
  if (queue) void queue.close().catch(() => undefined);
}
