import { describe, expect, it } from "vitest";

import { combineDailyReconciliationReadiness, getDailyReconciliationActivationSchedulerReadiness } from "./daily-reconciliation-readiness.js";

const migration = { blockedReasons: [], checks: { auditTablePresent: true, migrationFilePresent: true, requiredColumnsPresent: true, schemaMigrationRecorded: true }, status: "ready" as const };
const scheduler = { blockedReasons: [], checks: { brokerConnectionEnabled: true, dailyPreparationHandlerEnabled: true, databaseConfigured: true, paperCredentialsConfigured: true, paperMode: true, schedulerEnabled: false }, status: "disabled" as const };

describe("daily reconciliation readiness", () => {
  it("reports disabled when structural prerequisites are ready but scheduler is off", () => {
    expect(combineDailyReconciliationReadiness({ migration, scheduler })).toMatchObject({ blockedReasons: [], status: "disabled" });
  });

  it("blocks migration gaps even while the scheduler is disabled", () => {
    const result = combineDailyReconciliationReadiness({ migration: { ...migration, blockedReasons: ["audit_table_missing"], status: "blocked" }, scheduler });
    expect(result).toMatchObject({ blockedReasons: ["migration_audit_table_missing"], status: "blocked" });
  });

  it("does not duplicate the migration prefix in reason codes", () => {
    const result = combineDailyReconciliationReadiness({ migration: { ...migration, blockedReasons: ["migration_not_recorded"], status: "blocked" }, scheduler });
    expect(result.blockedReasons).toEqual(["migration_not_recorded"]);
  });

  it("rehearses activation with command-scoped gates without starting a scheduler", () => {
    const readiness = getDailyReconciliationActivationSchedulerReadiness({
      ALPACA_API_KEY: "secret-key",
      ALPACA_SECRET_KEY: "secret-secret",
      ALPACA_PAPER_TRADE: "true",
      DAILY_RECONCILIATION_ACTIVATION_PREFLIGHT: "true",
      DATABASE_URL: "postgres://redacted",
      DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE: "scheduler-review-123",
      TRADING_MODE: "paper",
    });
    expect(readiness).toMatchObject({ status: "ready", blockedReasons: [] });
    expect(JSON.stringify(readiness)).not.toContain("secret-key");
    expect(() => getDailyReconciliationActivationSchedulerReadiness({ DAILY_RECONCILIATION_ACTIVATION_PREFLIGHT: "false" })).toThrow("activation rehearsal");
  });
});
