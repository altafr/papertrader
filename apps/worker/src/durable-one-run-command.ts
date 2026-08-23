import { PgBoss } from "pg-boss";

import { createPaperAccountReader } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAccountStateRepository, createDatabase } from "@momentum/db";

import {
  DAILY_PREPARATION_QUEUE,
  getDurableSchedulerConfig,
  provisionDurableQueues,
  validateDurableSchedulerApprovalReference,
  validateDurableSchedulerOneRun,
} from "./durable-scheduler.js";
import { reconcilePaperAccount } from "./reconcile.js";

if (process.env.DURABLE_SCHEDULER_ONCE !== "true") {
  throw new Error("DURABLE_SCHEDULER_ONCE must be exactly true for the guarded one-run scheduler command.");
}

validateDurableSchedulerOneRun();
const approvalReference = validateDurableSchedulerApprovalReference();
const runtime = getPaperOnlyRuntimeConfig();
if (!runtime.brokerConnectionEnabled) throw new Error("BROKER_CONNECTION_ENABLED must be true for the one-run scheduler command.");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for the one-run scheduler command.");

const boss = new PgBoss(databaseUrl);
let databasePool: Awaited<ReturnType<typeof createDatabase>>["pool"] | undefined;
const timeoutMs = 120_000;
const runId = `guarded-one-run-${Date.now()}`;

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
  await boss.work(DAILY_PREPARATION_QUEUE, async (jobs) => {
    try {
      for (let index = 0; index < jobs.length; index += 1) await reconcilePaperAccount(reader, repository);
      resolveCompleted?.();
    } catch (error) {
      rejectCompleted?.(error);
      throw error;
    }
  });
  const sentId = await boss.send(DAILY_PREPARATION_QUEUE, { kind: "daily_preparation", version: 1, approvalReference }, { id: runId });
  if (!sentId) throw new Error("The guarded one-run job was not queued.");
  let timeout: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    completed,
    new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("guarded one-run timed out")), timeoutMs); }),
  ]).finally(() => { if (timeout) clearTimeout(timeout); });
  console.log("Durable one-run paper reconciliation completed.");
} catch {
  console.error("Durable one-run paper reconciliation failed.");
  process.exitCode = 1;
} finally {
  await databasePool?.end().catch(() => undefined);
  await boss.stop().catch(() => undefined);
}
