import { PgBoss } from "pg-boss";

import { getPaperOnlyRuntimeConfig } from "@momentum/config";

import { getDurableSchedulerConfig, provisionDurableQueues } from "./durable-scheduler.js";

if (process.env.DURABLE_QUEUE_MIGRATE !== "true") {
  throw new Error("DURABLE_QUEUE_MIGRATE must be exactly true for the guarded queue migration command.");
}

getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for the durable queue migration.");

const boss = new PgBoss(databaseUrl);
try {
  await boss.start();
  await provisionDurableQueues(boss, getDurableSchedulerConfig({ ...process.env, DURABLE_SCHEDULER_ENABLED: "true" }));
  console.log("Durable queue migration completed.");
} catch {
  console.error("Durable queue migration failed.");
  process.exitCode = 1;
} finally {
  await boss.stop().catch(() => undefined);
}
