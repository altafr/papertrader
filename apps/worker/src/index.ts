import { createServer } from "node:http";

import { createPaperAccountReader, createPaperMarketDataReader } from "@momentum/alpaca";
import { getPaperAutopilotConfig, getPaperOperatingMode, getPaperOnlyRuntimeConfig, getServerPort, isGlobalKillSwitchActive } from "@momentum/config";
import { createAccountStateRepository, createDatabase, createDurableScheduleRunRepository, createShadowObservationRepository, createTelegramAlertRepository } from "@momentum/db";
import { getTelegramNotificationConfig, sendTelegramAlert } from "@momentum/notifications";

import { getWorkerHealth } from "./app.js";
import { startPaperMarketStream } from "./market-stream-runner.js";
import { getShadowEvaluationConfig } from "./shadow-evaluation.js";
import { createAlpacaShadowBarSource, createShadowEvaluationScheduler, runShadowEvaluationOnce } from "./shadow-evaluation-service.js";
import { createDurableScheduler, getDurableSchedulerConfig, setDurableSchedulerHealth, validateDurableSchedulerAuditActivation } from "./durable-scheduler.js";
import { assertDurableScheduleRunMigrationReady, assertDurableSchedulerMigrationReady, readDurableScheduleRunMigrationState, readDurableSchedulerMigrationState } from "./durable-scheduler-migration-guard.js";
import { reconcilePaperAccount } from "./reconcile.js";
import { getResearchScheduleReadiness } from "./research-scheduler.js";
import { createResearchSchedulerFromEnvironment } from "./research-scheduler-runtime.js";
import { reconcileBeforeSchedulerStart } from "./startup-recovery.js";
import { createPositionManagementSchedulerFromEnvironment } from "./position-management-runtime.js";
import { createRuntimeAlertNotifier } from "./telegram-events.js";

const streamEnabled = process.env.MARKET_STREAM_ENABLED;
if (streamEnabled !== undefined && streamEnabled !== "true" && streamEnabled !== "false") {
  throw new Error("MARKET_STREAM_ENABLED must be exactly true or false.");
}

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(getWorkerHealth()));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

getPaperOnlyRuntimeConfig();
getPaperOperatingMode();
if (getResearchScheduleReadiness().status === "blocked" && process.env.RESEARCH_SCHEDULER_ENABLED === "true") {
  throw new Error("RESEARCH_SCHEDULER_ENABLED=true requires paper database, broker, credentials, and handler gates.");
}
const researchScheduler = createResearchSchedulerFromEnvironment();
if (researchScheduler) void researchScheduler.start().catch(() => { /* health endpoint reports degraded state */ });
const autopilotConfiguration = getPaperAutopilotConfig();
if (autopilotConfiguration.enabled && !process.env.DATABASE_URL?.trim()) throw new Error("PAPER_AUTOPILOT_ENABLED=true requires DATABASE_URL.");
if (autopilotConfiguration.enabled && isGlobalKillSwitchActive()) throw new Error("PAPER_AUTOPILOT_ENABLED=true is blocked by GLOBAL_KILL_SWITCH_ACTIVE=true.");
const positionManagementScheduler = createPositionManagementSchedulerFromEnvironment();
if (positionManagementScheduler) void positionManagementScheduler.start();
const shadowConfiguration = getShadowEvaluationConfig();
const durableConfiguration = getDurableSchedulerConfig();
const telegramNotificationConfig = getTelegramNotificationConfig();
if (shadowConfiguration.enabled) {
  if (process.env.BROKER_CONNECTION_ENABLED !== "true") throw new Error("SHADOW_EVALUATION_ENABLED=true requires BROKER_CONNECTION_ENABLED=true.");
  if (!process.env.DATABASE_URL?.trim()) throw new Error("SHADOW_EVALUATION_ENABLED=true requires DATABASE_URL.");
  const { db } = createDatabase();
  const shadowRepository = createShadowObservationRepository(db);
  const shadowReader = createPaperMarketDataReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" });
  const shadowScheduler = createShadowEvaluationScheduler({ intervalSeconds: shadowConfiguration.intervalSeconds, run: () => runShadowEvaluationOnce({ barSource: createAlpacaShadowBarSource(shadowReader), repository: shadowRepository }).then(() => undefined) });
  shadowScheduler.start();
}
if (streamEnabled === "true") {
  if (process.env.BROKER_CONNECTION_ENABLED !== "true") {
    throw new Error("MARKET_STREAM_ENABLED=true requires BROKER_CONNECTION_ENABLED=true.");
  }
  startPaperMarketStream();
}
const schedulerAuditEnabled = process.env.DURABLE_SCHEDULER_AUDIT_ENABLED;
if (schedulerAuditEnabled !== undefined && schedulerAuditEnabled !== "true" && schedulerAuditEnabled !== "false") throw new Error("DURABLE_SCHEDULER_AUDIT_ENABLED must be exactly true or false.");
validateDurableSchedulerAuditActivation();
if (durableConfiguration.enabled) {
  if (!process.env.DATABASE_URL?.trim()) throw new Error("DURABLE_SCHEDULER_ENABLED=true requires DATABASE_URL.");
  if (process.env.DAILY_PREPARATION_HANDLER_ENABLED !== "true") throw new Error("DURABLE_SCHEDULER_ENABLED=true requires the verified daily preparation handler.");
  if (process.env.BROKER_CONNECTION_ENABLED !== "true") throw new Error("DURABLE_SCHEDULER_ENABLED=true requires BROKER_CONNECTION_ENABLED=true for reconciliation.");
  const migrationDatabase = createDatabase(process.env.DATABASE_URL);
  try {
    assertDurableSchedulerMigrationReady(await readDurableSchedulerMigrationState(migrationDatabase.pool));
    if (schedulerAuditEnabled === "true") assertDurableScheduleRunMigrationReady(await readDurableScheduleRunMigrationState(migrationDatabase.pool));
  } finally {
    await migrationDatabase.pool.end();
  }
  const scheduleAuditDatabase = schedulerAuditEnabled === "true" ? createDatabase(process.env.DATABASE_URL) : undefined;
  const scheduleAudit = scheduleAuditDatabase ? createDurableScheduleRunRepository(scheduleAuditDatabase.db) : undefined;
  const scheduleAuditCallbacks = scheduleAudit ? {
    start: (runId: string, scheduledAt: Date, startedAt: Date) => scheduleAudit.start({ runId, scheduledAt, startedAt }).then(() => undefined),
    complete: (runId: string, completedAt: Date, accountSnapshotId: string) => scheduleAudit.complete(runId, completedAt, accountSnapshotId).then(() => undefined),
    fail: (runId: string, completedAt: Date, failureCode: string) => scheduleAudit.fail(runId, completedAt, failureCode).then(() => undefined),
  } : undefined;
  const runDailyPreparation = async () => {
    const { db, pool } = createDatabase(process.env.DATABASE_URL);
    try {
      const accountRepository = createAccountStateRepository(db);
      const snapshot = await reconcilePaperAccount(
        createPaperAccountReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" }),
        accountRepository,
      );
      const model = await accountRepository.getLatestReadModel(snapshot.accountId);
      const account = model?.snapshot;
      if (account) {
        await createRuntimeAlertNotifier(process.env, createTelegramAlertRepository(db)).notify({ code: "daily_portfolio_summary", dedupeKey: `daily_portfolio_summary:${account.capturedAt.toISOString()}`, message: `Market session summary (paper): equity ${account.equity}, cash ${account.cash}, buying power ${account.buyingPower}, open positions ${model?.positions.length ?? 0}, tracked orders ${model?.orders.length ?? 0}.`, occurredAt: account.capturedAt.toISOString(), severity: "info" });
      }
      return { accountSnapshotId: snapshot.id };
    } finally {
      await pool.end();
    }
  };
  const durableScheduler = createDurableScheduler({
    config: durableConfiguration,
    connectionString: process.env.DATABASE_URL,
    notify: (alert) => sendTelegramAlert(telegramNotificationConfig, { ...alert, occurredAt: new Date().toISOString() }),
    ...(scheduleAuditCallbacks ? { audit: scheduleAuditCallbacks } : {}),
    runDailyPreparation,
  });
  // Recovery starts paused: reconcile broker truth before registering the
  // durable schedule so a restart cannot resume from stale internal state.
  void reconcileBeforeSchedulerStart({
    reconcile: runDailyPreparation,
    onFailure: async () => {
      setDurableSchedulerHealth({ enabled: true, status: "degraded" });
      await sendTelegramAlert(telegramNotificationConfig, { code: "durable_scheduler_start_failed", message: "Durable scheduler startup reconciliation failed; scheduling remains paused.", occurredAt: new Date().toISOString(), severity: "critical" }).catch(() => undefined);
    },
    startScheduler: () => durableScheduler.start().catch(() => { /* health endpoint reports the degraded state */ }),
  });
}
server.listen(getServerPort(), "0.0.0.0");
