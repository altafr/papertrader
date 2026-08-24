import { describe, expect, it } from "vitest";

import { assessDurableSchedulerAuditActivation } from "./durable-scheduler-audit-activation.js";

describe("scheduler-audit activation readiness", () => {
  it("is ready only when every runtime gate is satisfied", () => {
    const result = assessDurableSchedulerAuditActivation({ auditActivationApprovalReferencePresent: true, auditGateEnabled: true, globalKillSwitchActive: false, migrationReady: true, paperAutopilotEnabled: false, paperMode: true, schedulerBlockedReasons: [], schedulerEnabled: true });
    expect(result).toEqual({ blockedReasons: [], checks: { auditActivationApprovalReferencePresent: true, auditGateEnabled: true, globalKillSwitchInactive: true, migrationReady: true, paperAutopilotDisabled: true, paperMode: true, schedulerEnabled: true }, status: "ready" });
  });

  it("reports every unsafe prerequisite without exposing secrets", () => {
    const result = assessDurableSchedulerAuditActivation({ auditActivationApprovalReferencePresent: false, auditGateEnabled: false, globalKillSwitchActive: true, migrationReady: false, paperAutopilotEnabled: true, paperMode: false, schedulerBlockedReasons: ["database_not_configured"], schedulerEnabled: false });
    expect(result.blockedReasons).toEqual(expect.arrayContaining(["audit_gate_not_enabled_in_rehearsal", "audit_activation_approval_reference_missing", "scheduler_audit_migration_not_ready", "scheduler_disabled", "scheduler_database_not_configured", "paper_runtime_invalid", "paper_autopilot_enabled", "global_kill_switch_active"]));
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
