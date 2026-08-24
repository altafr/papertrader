import { getPaperAutopilotConfig, getPaperOnlyRuntimeConfig, isGlobalKillSwitchActive } from "@momentum/config";
import { createDatabase } from "@momentum/db";

import { assessDurableSchedulerAuditActivation } from "./durable-scheduler-audit-activation.js";
import { getDurableSchedulerReadiness, validateDurableSchedulerAuditActivation } from "./durable-scheduler.js";
import { readDurableScheduleRunMigrationState } from "./durable-scheduler-migration-guard.js";

if (process.env.DURABLE_SCHEDULER_AUDIT_ACTIVATION_READINESS !== "true") throw new Error("DURABLE_SCHEDULER_AUDIT_ACTIVATION_READINESS must be exactly true for the guarded activation-readiness command.");
getPaperOnlyRuntimeConfig();
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for scheduler-audit activation readiness.");

const { pool } = createDatabase(databaseUrl);
try {
  const migration = await readDurableScheduleRunMigrationState(pool);
  const scheduler = getDurableSchedulerReadiness();
  const paperAutopilot = getPaperAutopilotConfig();
  const auditReferencePresent = Boolean(validateDurableSchedulerAuditActivation());
  const readiness = assessDurableSchedulerAuditActivation({
    auditActivationApprovalReferencePresent: auditReferencePresent,
    auditGateEnabled: process.env.DURABLE_SCHEDULER_AUDIT_ENABLED === "true",
    globalKillSwitchActive: isGlobalKillSwitchActive(),
    migrationReady: migration.ready,
    paperAutopilotEnabled: paperAutopilot.enabled,
    paperMode: (process.env.TRADING_MODE ?? "paper") === "paper" && process.env.ALPACA_PAPER_TRADE !== "false",
    schedulerBlockedReasons: scheduler.blockedReasons,
    schedulerEnabled: scheduler.checks.schedulerEnabled,
  });
  console.log(JSON.stringify(readiness));
  if (readiness.status === "blocked") process.exitCode = 1;
} catch {
  console.error("Scheduler-audit activation readiness check failed.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
