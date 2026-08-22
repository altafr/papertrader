import { PgBoss } from "pg-boss";

import { getPaperOnlyRuntimeConfig } from "@momentum/config";

import { inspectDurableQueues } from "./durable-scheduler.js";

if (process.env.DURABLE_QUEUE_STATUS !== "true") {
  throw new Error("DURABLE_QUEUE_STATUS must be exactly true for the guarded queue status command.");
}

getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for durable queue status.");

const boss = new PgBoss(databaseUrl);
try {
  await boss.start();
  const inspection = await inspectDurableQueues(boss);
  console.log(JSON.stringify(inspection));
  if (!inspection.workQueue.present || !inspection.deadLetterQueue.present) process.exitCode = 1;
} catch {
  console.error("Durable queue status failed.");
  process.exitCode = 1;
} finally {
  await boss.stop().catch(() => undefined);
}
