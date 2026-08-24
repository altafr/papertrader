import { PgBoss } from "pg-boss";

import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAccountStateRepository, createDatabase } from "@momentum/db";

import { inspectDurableQueues } from "./durable-scheduler.js";
import { assessDailyCycleVerification } from "./daily-cycle-verification.js";

if (process.env.DAILY_CYCLE_VERIFY !== "true") throw new Error("DAILY_CYCLE_VERIFY must be exactly true for the guarded daily cycle verification command.");
getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for daily cycle verification.");
const cycleStartedAt = process.env.DAILY_CYCLE_STARTED_AT;
if (!cycleStartedAt?.trim() || Number.isNaN(new Date(cycleStartedAt).getTime())) throw new Error("DAILY_CYCLE_STARTED_AT must be a valid RFC3339 timestamp.");

const boss = new PgBoss(databaseUrl);
const database = createDatabase(databaseUrl);
try {
  await boss.start();
  const queues = await inspectDurableQueues(boss);
  const model = await createAccountStateRepository(database.db).getLatestReadModel();
  const verification = assessDailyCycleVerification({ cycleStartedAt, ...(model?.freshness.capturedAt ? { capturedAt: model.freshness.capturedAt } : {}), queues });
  console.log(JSON.stringify(verification));
  if (verification.status !== "verified") process.exitCode = 1;
} finally {
  await database.pool.end().catch(() => undefined);
  await boss.stop().catch(() => undefined);
}
