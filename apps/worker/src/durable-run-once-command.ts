import { PgBoss } from "pg-boss";

import { getPaperOnlyRuntimeConfig } from "@momentum/config";

import { enqueueDailyPreparation, validateDurableOneRunId } from "./durable-scheduler.js";

if (process.env.DURABLE_QUEUE_RUN_ONCE !== "true") {
  throw new Error("DURABLE_QUEUE_RUN_ONCE must be exactly true for the guarded run-once command.");
}

getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for the durable run-once command.");

const boss = new PgBoss(databaseUrl);
let failureStage: "queue_start" | "enqueue" | "shutdown" = "queue_start";
try {
  await boss.start();
  failureStage = "enqueue";
  const runId = process.env.DURABLE_QUEUE_RUN_ONCE_RUN_ID?.trim();
  const result = await enqueueDailyPreparation(boss, new Date(), runId ? validateDurableOneRunId({ DURABLE_ONE_RUN_ID: runId }) : undefined);
  console.log(JSON.stringify(result));
} catch {
  console.error(`Durable run-once enqueue failed (failure_stage=${failureStage}).`);
  process.exitCode = 1;
} finally {
  failureStage = "shutdown";
  await boss.stop().catch(() => undefined);
}
