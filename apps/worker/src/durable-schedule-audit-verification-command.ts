import { PgBoss } from "pg-boss";

import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAccountStateRepository, createDatabase, createDurableScheduleRunRepository } from "@momentum/db";

import { inspectDurableQueues } from "./durable-scheduler.js";
import { assessDurableScheduleAuditVerification } from "./durable-schedule-audit-verification.js";

if (process.env.DURABLE_SCHEDULE_AUDIT_VERIFY !== "true") throw new Error("DURABLE_SCHEDULE_AUDIT_VERIFY must be exactly true for the guarded scheduler-audit verification command.");
getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for scheduler-audit verification.");
const cycleStartedAt = process.env.DURABLE_SCHEDULE_AUDIT_CYCLE_STARTED_AT;
if (!cycleStartedAt?.trim() || Number.isNaN(new Date(cycleStartedAt).getTime())) throw new Error("DURABLE_SCHEDULE_AUDIT_CYCLE_STARTED_AT must be a valid RFC3339 timestamp.");

const boss = new PgBoss(databaseUrl);
const database = createDatabase(databaseUrl);
try {
  await boss.start();
  const [queues, model, run] = await Promise.all([
    inspectDurableQueues(boss),
    createAccountStateRepository(database.db).getLatestReadModel(),
    createDurableScheduleRunRepository(database.db).getLatest(),
  ]);
  const verification = assessDurableScheduleAuditVerification({ cycleStartedAt, ...(model?.freshness.capturedAt ? { capturedAt: model.freshness.capturedAt } : {}), queues, ...(run ? { run: { ...(run.completedAt ? { completedAt: run.completedAt } : {}), runId: run.runId, scheduledAt: run.scheduledAt, status: run.status as "completed" | "failed" | "running" } } : {}) });
  console.log(JSON.stringify(verification));
  if (verification.status !== "verified") process.exitCode = 1;
} finally {
  await database.pool.end().catch(() => undefined);
  await boss.stop().catch(() => undefined);
}
