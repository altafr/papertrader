import { PgBoss } from "pg-boss";

import { createPaperAccountReader } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAccountStateRepository, createDatabase } from "@momentum/db";

import {
  DAILY_PREPARATION_QUEUE,
  type DurableDailyJob,
  getDurableSchedulerConfig,
  provisionDurableQueues,
  validateDurableSchedulerApprovalReference,
  validateDurableOneRunId,
  validateDurableSchedulerOneRun,
} from "./durable-scheduler.js";
import { reconcilePaperAccount } from "./reconcile.js";
import { classifyDurableOneRunFailure } from "./durable-one-run-failure.js";

if (process.env.DURABLE_SCHEDULER_ONCE !== "true") {
  throw new Error("DURABLE_SCHEDULER_ONCE must be exactly true for the guarded one-run scheduler command.");
}

validateDurableSchedulerOneRun();
const approvalReference = validateDurableSchedulerApprovalReference();
const runId = validateDurableOneRunId();
const runtime = getPaperOnlyRuntimeConfig();
if (!runtime.brokerConnectionEnabled) throw new Error("BROKER_CONNECTION_ENABLED must be true for the one-run scheduler command.");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for the one-run scheduler command.");

const boss = new PgBoss(databaseUrl);
let databasePool: Awaited<ReturnType<typeof createDatabase>>["pool"] | undefined;
const timeoutMs = 120_000;

try {
  await boss.start();
  await provisionDurableQueues(boss, getDurableSchedulerConfig({ ...process.env, DURABLE_SCHEDULER_ENABLED: "true" }));
  const database = createDatabase(databaseUrl);
  databasePool = database.pool;
  const reader = createPaperAccountReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" });
  const repository = createAccountStateRepository(database.db);
  let resolveCompleted: (() => void) | undefined;
  let rejectCompleted: ((error: unknown) => void) | undefined;
  const completed = new Promise<void>((resolve, reject) => { resolveCompleted = resolve; rejectCompleted = reject; });
  await boss.work<DurableDailyJob>(DAILY_PREPARATION_QUEUE, async (jobs) => {
    try {
      for (const job of jobs) {
        if (job.data.runId !== runId || job.data.approvalReference !== approvalReference) throw new Error("Guarded one-run provenance did not match the queued job.");
        await reconcilePaperAccount(reader, repository, { approvalReference, runId });
      }
      resolveCompleted?.();
    } catch (error) {
      rejectCompleted?.(error);
      throw error;
    }
  });
  const sentId = await boss.send(DAILY_PREPARATION_QUEUE, { kind: "daily_preparation", version: 1, approvalReference, runId }, { id: runId });
  if (!sentId) throw new Error("The guarded one-run job was not queued.");
  let timeout: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    completed,
    new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("guarded one-run timed out")), timeoutMs); }),
  ]).finally(() => { if (timeout) clearTimeout(timeout); });
  console.log(JSON.stringify({ approvalReference, runId, status: "completed" }));
} catch (error) {
  console.error(`Durable one-run paper reconciliation failed (failure_code=${classifyDurableOneRunFailure(error)}).`);
  process.exitCode = 1;
} finally {
  await databasePool?.end().catch(() => undefined);
  await boss.stop().catch(() => undefined);
}
