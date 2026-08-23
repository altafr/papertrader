import { describe, expect, it } from "vitest";

import { assessAuditMigrationReadiness, assessReconciliationHealth, assessSchedulerActivation } from "./operations-health.js";

const now = new Date("2026-08-23T00:00:00.000Z");

describe("reconciliation health", () => {
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

  it("reports the audit migration state with bounded reasons", () => {
    expect(assessAuditMigrationReadiness({ auditTablePresent: false, requiredColumnsPresent: false, schemaMigrationRecorded: false })).toEqual({ blockedReasons: ["migration_not_recorded", "audit_table_missing", "audit_columns_missing"], status: "blocked" });
    expect(assessAuditMigrationReadiness({ auditTablePresent: true, requiredColumnsPresent: true, schemaMigrationRecorded: true })).toEqual({ blockedReasons: [], status: "ready" });
  });
});
