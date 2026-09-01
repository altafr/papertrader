import { createAccountStateRepository, createDatabase, createPaperOrderRepository, createTelegramAlertRepository } from "@momentum/db";
import { getTelegramNotificationReadiness } from "@momentum/notifications";

import { buildExitPlanReviewReport } from "./exit-plan-review.js";
import { buildPaperPerformanceReport } from "./paper-performance-report.js";
import { getPaperAutopilotReadiness } from "./paper-autopilot-readiness.js";
import { assessRuntimeReconciliation, combinePaperAutopilotRuntimeReadiness } from "./paper-autopilot-runtime-readiness.js";
import { combineFullPaperAutonomousReadiness } from "./full-paper-autonomous-readiness.js";

if (process.env.FULL_PAPER_AUTONOMOUS_READINESS !== "true") {
  throw new Error("FULL_PAPER_AUTONOMOUS_READINESS must be exactly true for the guarded release-readiness command.");
}
if (!process.env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required.");

const configuration = getPaperAutopilotReadiness();
const telegram = getTelegramNotificationReadiness();
const { db, pool } = createDatabase();
try {
  const accountRepository = createAccountStateRepository(db);
  const telegramRepository = createTelegramAlertRepository(db);
  const account = await accountRepository.getLatestReadModel();
  const runtime = combinePaperAutopilotRuntimeReadiness(configuration, assessRuntimeReconciliation(account?.snapshot.capturedAt));
  const plans = await createPaperOrderRepository(db).listExitPlans();
  const positionReview = buildExitPlanReviewReport(account?.positions ?? [], plans);
  const performanceRows = await pool.query<{ readonly captured_at: Date; readonly equity: string }>("SELECT captured_at, equity FROM account_snapshots ORDER BY captured_at DESC LIMIT $1", [500]);
  const performance = buildPaperPerformanceReport(performanceRows.rows.map((row) => ({ capturedAt: row.captured_at.toISOString(), equity: String(row.equity) })));
  const recentAlerts = await telegramRepository.listRecent(100);
  const deliveryVerified = recentAlerts.some((event) => event.code === "telegram_channel_test" && event.deliveryStatus === "sent");
  const readiness = combineFullPaperAutonomousReadiness({
    runtime,
    positionCoverage: { positionCount: positionReview.length, unmanagedCount: positionReview.filter((row) => row.status === "review_required").length },
    // The notification package reports configuration only; a persisted sent test proves delivery.
    alerts: { enabled: telegram.checks.enabled, configured: telegram.checks.botTokenConfigured && telegram.checks.chatIdConfigured, deliveryVerified },
    performance,
  });
  console.log(JSON.stringify(readiness));
  if (readiness.status === "blocked") process.exitCode = 1;
} finally {
  await pool.end();
}
