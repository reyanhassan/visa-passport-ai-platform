import type {
  PassportExtractionQueuePayload,
  PassportExtractionWorkerResult,
} from "@visa-platform/types";
import { Worker } from "bullmq";

import { workerConfig } from "../config.js";
import { passportExtractionProcessor } from "../processors/passportExtractionProcessor.js";

function redisConnection() {
  const redisUrl = new URL(workerConfig.redisUrl);
  const database = redisUrl.pathname.slice(1);

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: database ? Number(database) : undefined,
    tls: redisUrl.protocol === "rediss:" ? {} : undefined,
    connectTimeout: 10_000,
    maxRetriesPerRequest: null,
  };
}

export function createPassportExtractionWorker() {
  return new Worker<PassportExtractionQueuePayload, PassportExtractionWorkerResult>(
    workerConfig.queueName,
    passportExtractionProcessor,
    {
      connection: redisConnection(),
      concurrency: workerConfig.concurrency,
    },
  );
}
