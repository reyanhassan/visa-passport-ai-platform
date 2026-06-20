import { prisma } from "@visa-platform/database";

import { workerConfig } from "./config.js";
import { createPassportExtractionWorker } from "./queues/passportExtractionQueue.js";
import { maskError } from "./services/piiMasking.js";

const worker = createPassportExtractionWorker();

worker.on("ready", () => {
  console.info(`[worker] ready on queue ${workerConfig.queueName}`);
});

worker.on("active", (job) => {
  console.info(`[worker] started extraction job ${job.data.jobId}`);
});

worker.on("completed", (job, result) => {
  console.info(`[worker] completed extraction job ${job.data.jobId} with ${result.status}`);
});

worker.on("failed", (job, error) => {
  console.error(
    `[worker] extraction job ${job?.data.jobId ?? "unknown"} failed: ${maskError(error)}`,
  );
});

worker.on("error", (error) => {
  console.error(`[worker] connection error: ${maskError(error)}`);
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.info(`[worker] ${signal} received; shutting down`);
  await worker.close();
  await prisma.$disconnect();
}

process.on("SIGINT", () => void shutdown("SIGINT").then(() => process.exit(0)));
process.on("SIGTERM", () => void shutdown("SIGTERM").then(() => process.exit(0)));
