import { createServer } from "node:http";

import { createPaperAccountReader, createPaperMarketDataReader } from "@momentum/alpaca";
import { getPaperAutopilotConfig, getPaperOperatingMode, getPaperOnlyRuntimeConfig, getServerPort, isGlobalKillSwitchActive } from "@momentum/config";
import { createAccountStateRepository, createDatabase, createDurableScheduleRunRepository, createPaperOrderRepository, createShadowObservationRepository, createTelegramAlertRepository } from "@momentum/db";
import { isCompleteExitPlan } from "@momentum/domain";
import { getTelegramNotificationConfig } from "@momentum/notifications";

import { getWorkerHealth } from "./app.js";
import { startPaperMarketStream } from "./market-stream-runner.js";
import { getShadowEvaluationConfig } from "./shadow-evaluation.js";
import { createAlpacaShadowBarSource, createShadowEvaluationScheduler, runShadowEvaluationOnce } from "./shadow-evaluation-service.js";
import { createDurableScheduler, getDurableSchedulerConfig, setDurableSchedulerHealth, validateDurableSchedulerAuditActivation } from "./durable-scheduler.js";
import { assertDurableScheduleRunMigrationReady, assertDurableSchedulerMigrationReady, readDurableScheduleRunMigrationState, readDurableSchedulerMigrationState } from "./durable-scheduler-migration-guard.js";
import { reconcilePaperAccount } from "./reconcile.js";
import { getResearchScheduleReadiness, getResearchSchedulerErrorMetadata, startWithBoundedRetry } from "./research-scheduler.js";
import { buildResearchSchedulerStartFailureAlert, createResearchSchedulerFromEnvironment, isMarketCloseSummaryEnabled } from "./research-scheduler-runtime.js";
import { reconcileBeforeSchedulerStart } from "./startup-recovery.js";
import { createPositionManagementSchedulerFromEnvironment } from "./position-management-runtime.js";
import { createRuntimeAlertNotifier } from "./telegram-events.js";
import { getDailyNotificationDedupeKey } from "./notification-dedupe.js";
import { attachPositionProtection, countUnmanagedPositions, formatDailyPortfolioSummary } from "./daily-summary.js";
import { createTelegramOpsAssistant, createTelegramOpsAssistantData } from "./telegram-ops-assistant.js";

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
let runtimeAlertNotifier = createRuntimeAlertNotifier(process.env);
const researchScheduler = createResearchSchedulerFromEnvironment();
if (researchScheduler) void startWithBoundedRetry({
  onExhausted: (error) => { const occurredAt = new Date().toISOString(); console.error(JSON.stringify({ ...getResearchSchedulerErrorMetadata(error), event: "research_scheduler_start_failed", status: "degraded" })); void runtimeAlertNotifier.notify({ ...buildResearchSchedulerStartFailureAlert(occurredAt), occurredAt }); },
  onRetry: (attempt, error) => { console.warn(JSON.stringify({ ...getResearchSchedulerErrorMetadata(error), attempt, event: "research_scheduler_start_retry" })); },
  start: () => researchScheduler.start(),
}).catch(() => { /* health endpoint reports degraded state after bounded recovery */ });
const marketCloseSummaryEnabled = isMarketCloseSummaryEnabled();
const autopilotConfiguration = getPaperAutopilotConfig();
if (autopilotConfiguration.enabled && !process.env.DATABASE_URL?.trim()) throw new Error("PAPER_AUTOPILOT_ENABLED=true requires DATABASE_URL.");
if (autopilotConfiguration.enabled && isGlobalKillSwitchActive()) throw new Error("PAPER_AUTOPILOT_ENABLED=true is blocked by GLOBAL_KILL_SWITCH_ACTIVE=true.");
const positionManagementScheduler = createPositionManagementSchedulerFromEnvironment();
if (positionManagementScheduler) void positionManagementScheduler.start();
const shadowConfiguration = getShadowEvaluationConfig();
const durableConfiguration = getDurableSchedulerConfig();
const telegramNotificationConfig = getTelegramNotificationConfig();
runtimeAlertNotifier = createRuntimeAlertNotifier(process.env);
if (telegramNotificationConfig.enabled && process.env.DATABASE_URL?.trim()) {
  const alertDatabase = createDatabase(process.env.DATABASE_URL);
  runtimeAlertNotifier = createRuntimeAlertNotifier(process.env, createTelegramAlertRepository(alertDatabase.db));
  let retryRunning = false;
  const retryPersistedAlerts = async () => {
    if (retryRunning) return;
    retryRunning = true;
    try { await runtimeAlertNotifier.retryPersisted(); } finally { retryRunning = false; }
  };
  void retryPersistedAlerts();
  setInterval(() => { void retryPersistedAlerts(); }, 60_000).unref();
}
if (process.env.TELEGRAM_ASSISTANT_ENABLED === "true") {
  const assistantDatabase = createTelegramOpsAssistantData(process.env, () => getWorkerHealth());
  const assistant = createTelegramOpsAssistant(process.env, assistantDatabase.data);
  console.log(JSON.stringify({ event: "telegram_ops_assistant_started", enabled: assistant.enabled, mode: "read_only", pollSeconds: Number(process.env.TELEGRAM_ASSISTANT_POLL_SECONDS ?? "20") }));
  void assistant.start().catch(() => { /* assistant failures never affect trading loops */ });
}
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
      if (account && !marketCloseSummaryEnabled) {
        const plans = (await createPaperOrderRepository(db).listExitPlans()).filter((plan) => isCompleteExitPlan(plan));
        await createRuntimeAlertNotifier(process.env, createTelegramAlertRepository(db)).notify({ code: "daily_portfolio_summary", cooldownKey: "daily_portfolio_summary:portfolio", cooldownMs: 86_400_000, dedupeKey: getDailyNotificationDedupeKey("daily_portfolio_summary", "portfolio", account.capturedAt), message: formatDailyPortfolioSummary({ buyingPower: account.buyingPower, cash: account.cash, equity: account.equity, ...(account.lastEquity == null ? {} : { lastEquity: account.lastEquity }), orders: model?.orders.length ?? 0, unmanagedPositions: countUnmanagedPositions(model?.positions ?? [], plans), positions: attachPositionProtection(model?.positions ?? [], plans) }), occurredAt: account.capturedAt.toISOString(), severity: "info" });
      }
      return { accountSnapshotId: snapshot.id };
    } finally {
      await pool.end();
    }
  };
  const durableScheduler = createDurableScheduler({
    config: durableConfiguration,
    connectionString: process.env.DATABASE_URL,
    notify: (alert) => runtimeAlertNotifier.notify({ ...alert, occurredAt: new Date().toISOString() }),
    ...(scheduleAuditCallbacks ? { audit: scheduleAuditCallbacks } : {}),
    runDailyPreparation,
  });
  // Recovery starts paused: reconcile broker truth before registering the
  // durable schedule so a restart cannot resume from stale internal state.
  void reconcileBeforeSchedulerStart({
    reconcile: runDailyPreparation,
    onFailure: async () => {
      setDurableSchedulerHealth({ enabled: true, status: "degraded" });
      await runtimeAlertNotifier.notify({ code: "durable_scheduler_start_failed", message: "Durable scheduler startup reconciliation failed; scheduling remains paused.", occurredAt: new Date().toISOString(), severity: "critical" });
    },
    startScheduler: () => durableScheduler.start().catch(() => { /* health endpoint reports the degraded state */ }),
  }).then((started) => {
    console.log(JSON.stringify({ event: "durable_scheduler_start_result", started, status: getWorkerHealth().durableScheduler }));
  });
}
server.listen(getServerPort(), "0.0.0.0");
server.once("listening", () => {
  const health = getWorkerHealth();
  console.log(JSON.stringify({ event: "worker_started", health }));
});
