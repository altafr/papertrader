import { describe, expect, it } from "vitest";

import { assessAuditMigrationReadiness, assessReconciliationHealth, assessResearchScheduleActivation, assessSchedulerActivation, assessSchedulerAuditGate, readAuditMigrationReadiness, readSchedulerAuditMigrationReadiness, serializeDurableScheduleRunHealth, serializeRiskCycleSummary } from "./operations-health.js";

const now = new Date("2026-08-23T00:00:00.000Z");

describe("reconciliation health", () => {
  it("serializes bounded durable risk-cycle counters", () => {
    expect(serializeRiskCycleSummary({ approved: 2, decisions: 4, latest_at: new Date("2026-08-29T00:00:00.000Z") })).toEqual({ approved: 2, decisions: 4, latestAt: "2026-08-29T00:00:00.000Z" });
    expect(serializeRiskCycleSummary({ approved: -1, decisions: "bad", latest_at: "not-a-date" })).toEqual({ approved: 0, decisions: 0 });
  });
  it("distinguishes disabled, blocked, and enabled scheduler-audit gates", () => {
    expect(assessSchedulerAuditGate({ activationApprovalReferencePresent: false, enabled: false, migrationReady: true })).toEqual({ activationApprovalReferencePresent: false, enabled: false, migrationReady: true, status: "disabled" });
    expect(assessSchedulerAuditGate({ activationApprovalReferencePresent: false, enabled: true, migrationReady: true }).status).toBe("blocked");
    expect(assessSchedulerAuditGate({ activationApprovalReferencePresent: true, enabled: true, migrationReady: true }).status).toBe("enabled");
  });
  it("serializes the latest recurring scheduler run without exposing database values", () => {
    expect(serializeDurableScheduleRunHealth({ runId: "scheduled-daily-preparation-2026-08-25", scheduledAt: new Date("2026-08-25T00:00:00.000Z"), startedAt: new Date("2026-08-25T00:00:03.000Z"), status: "completed", completedAt: new Date("2026-08-25T00:00:10.000Z") })).toEqual({ completedAt: "2026-08-25T00:00:10.000Z", runId: "scheduled-daily-preparation-2026-08-25", scheduledAt: "2026-08-25T00:00:00.000Z", startedAt: "2026-08-25T00:00:03.000Z", status: "completed" });
    expect(serializeDurableScheduleRunHealth(undefined)).toEqual({ status: "unavailable" });
  });
  it("reports unavailable when no persisted capture exists", () => {
    expect(assessReconciliationHealth(undefined, now)).toEqual({ status: "unavailable" });
  });

  it("keeps a capture fresh through the delayed threshold", () => {
    expect(assessReconciliationHealth("2026-08-21T22:00:00.000Z", now).status).toBe("fresh");
  });

  it("reports delayed and stale captures deterministically", () => {
    expect(assessReconciliationHealth("2026-08-21T00:00:00.000Z", now).status).toBe("delayed");
    expect(assessReconciliationHealth("2026-08-20T00:00:00.000Z", now).status).toBe("stale");
  });

  it("rejects invalid timestamps without throwing", () => {
    expect(assessReconciliationHealth("not-a-timestamp", now)).toEqual({ status: "unavailable" });
  });

  it("keeps scheduler activation disabled or blocked until every gate is set", () => {
    expect(assessSchedulerActivation({ brokerConnectionEnabled: false, dailyPreparationHandlerEnabled: false, schedulerEnabled: false })).toBe("disabled");
    expect(assessSchedulerActivation({ brokerConnectionEnabled: true, dailyPreparationHandlerEnabled: false, schedulerEnabled: true })).toBe("blocked");
    expect(assessSchedulerActivation({ brokerConnectionEnabled: true, dailyPreparationHandlerEnabled: true, schedulerEnabled: true })).toBe("ready");
  });

  it("keeps research scheduling disabled or blocked until every gate is set", () => {
    expect(assessResearchScheduleActivation({ brokerConnectionEnabled: false, databaseConfigured: true, handlerEnabled: true, paperCredentialsConfigured: true, paperMode: true, schedulerEnabled: false })).toBe("disabled");
    expect(assessResearchScheduleActivation({ brokerConnectionEnabled: false, databaseConfigured: true, handlerEnabled: true, paperCredentialsConfigured: true, paperMode: true, schedulerEnabled: true })).toBe("blocked");
    expect(assessResearchScheduleActivation({ brokerConnectionEnabled: true, databaseConfigured: true, handlerEnabled: true, paperCredentialsConfigured: true, paperMode: false, schedulerEnabled: true })).toBe("blocked");
    expect(assessResearchScheduleActivation({ brokerConnectionEnabled: true, databaseConfigured: true, handlerEnabled: true, paperCredentialsConfigured: true, paperMode: true, schedulerEnabled: true })).toBe("ready");
  });

  it("reports the audit migration state with bounded reasons", () => {
    expect(assessAuditMigrationReadiness({ auditTablePresent: false, requiredColumnsPresent: false, schemaMigrationRecorded: false })).toEqual({ blockedReasons: ["migration_not_recorded", "audit_table_missing", "audit_columns_missing"], status: "blocked" });
    expect(assessAuditMigrationReadiness({ auditTablePresent: true, requiredColumnsPresent: true, schemaMigrationRecorded: true })).toEqual({ blockedReasons: [], status: "ready" });
  });

  it("reads complete and missing migration metadata through the query contract", async () => {
    let call = 0;
    await expect(readAuditMigrationReadiness({ query: async <T extends Record<string, unknown>>() => { call += 1; return { rows: (call === 1 ? [{ recorded: true }] : call === 2 ? [{ present: true }] : [{ count: 6 }]) as unknown as T[] }; } })).resolves.toEqual({ blockedReasons: [], status: "ready" });
    call = 0;
    await expect(readAuditMigrationReadiness({ query: async <T extends Record<string, unknown>>() => { call += 1; if (call === 1) throw Object.assign(new Error("missing"), { code: "42P01" }); return { rows: (call === 2 ? [{ present: false }] : [{ count: 0 }]) as unknown as T[] }; } })).resolves.toEqual({ blockedReasons: ["migration_not_recorded", "audit_table_missing", "audit_columns_missing"], status: "blocked" });
  });

  it("reads scheduler-audit migration readiness without returning schema values", async () => {
    let call = 0;
    await expect(readSchedulerAuditMigrationReadiness({ query: async <T extends Record<string, unknown>>() => { call += 1; return { rows: (call === 1 ? [{ recorded: true }] : [{ table_present: true, required_columns_present: true }]) as unknown as T[] }; } })).resolves.toEqual({ ready: true });
    call = 0;
    await expect(readSchedulerAuditMigrationReadiness({ query: async <T extends Record<string, unknown>>() => { call += 1; if (call === 1) throw Object.assign(new Error("missing"), { code: "42P01" }); return { rows: [{ table_present: false, required_columns_present: false }] as unknown as T[] }; } })).resolves.toEqual({ ready: false });
  });
});
