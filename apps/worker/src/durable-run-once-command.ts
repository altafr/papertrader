import { PgBoss } from "pg-boss";

import { getPaperOnlyRuntimeConfig } from "@momentum/config";

import { enqueueDailyPreparation } from "./durable-scheduler.js";

if (process.env.DURABLE_QUEUE_RUN_ONCE !== "true") {
  throw new Error("DURABLE_QUEUE_RUN_ONCE must be exactly true for the guarded run-once command.");
}

getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for the durable run-once command.");

const boss = new PgBoss(databaseUrl);
try {
  await boss.start();
  const result = await enqueueDailyPreparation(boss);
  console.log(JSON.stringify(result));
} catch {
  console.error("Durable run-once enqueue failed.");
  process.exitCode = 1;
} finally {
  await boss.stop().catch(() => undefined);
}
