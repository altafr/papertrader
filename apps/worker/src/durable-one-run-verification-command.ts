import { PgBoss } from "pg-boss";

import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAccountStateRepository, createDatabase } from "@momentum/db";

import { inspectDurableQueues, validateDurableOneRunId, validateDurableSchedulerApprovalReference } from "./durable-scheduler.js";
import { assessDurableOneRunVerification } from "./durable-one-run-verification.js";

if (process.env.DURABLE_ONE_RUN_VERIFY !== "true") {
  throw new Error("DURABLE_ONE_RUN_VERIFY must be exactly true for the guarded one-run verification command.");
}

getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for one-run verification.");
const approvalReference = validateDurableSchedulerApprovalReference();
const runId = validateDurableOneRunId();

const boss = new PgBoss(databaseUrl);
const database = createDatabase(databaseUrl);
try {
  await boss.start();
  const queues = await inspectDurableQueues(boss);
  const repository = createAccountStateRepository(database.db);
  const model = await repository.getLatestReadModel();
  const persistedProvenance = await repository.getDurableOneRunAudit(runId);
  const verification = assessDurableOneRunVerification({ approvalReference, queues, runId, ...(persistedProvenance ? { persistedProvenance } : {}), ...(model?.freshness.capturedAt ? { capturedAt: model.freshness.capturedAt } : {}) });
  console.log(JSON.stringify(verification));
  if (verification.status === "incomplete") process.exitCode = 1;
} catch {
  console.error("Durable one-run verification failed.");
  process.exitCode = 1;
} finally {
  await database.pool.end().catch(() => undefined);
  await boss.stop().catch(() => undefined);
}
