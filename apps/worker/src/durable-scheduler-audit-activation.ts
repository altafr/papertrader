export interface DurableSchedulerAuditActivationInput {
  readonly auditActivationApprovalReferencePresent: boolean;
  readonly auditGateEnabled: boolean;
  readonly globalKillSwitchActive: boolean;
  readonly migrationReady: boolean;
  readonly paperAutopilotEnabled: boolean;
  readonly paperMode: boolean;
  readonly schedulerBlockedReasons: readonly string[];
  readonly schedulerEnabled: boolean;
}

export interface DurableSchedulerAuditActivationReadiness {
  readonly blockedReasons: readonly string[];
  readonly checks: {
    readonly auditActivationApprovalReferencePresent: boolean;
    readonly auditGateEnabled: boolean;
    readonly globalKillSwitchInactive: boolean;
    readonly migrationReady: boolean;
    readonly paperAutopilotDisabled: boolean;
    readonly paperMode: boolean;
    readonly schedulerEnabled: boolean;
  };
  readonly status: "blocked" | "ready";
}

export function assessDurableSchedulerAuditActivation(input: DurableSchedulerAuditActivationInput): DurableSchedulerAuditActivationReadiness {
  const blockedReasons = [
    ...(input.auditGateEnabled ? [] : ["audit_gate_not_enabled_in_rehearsal"]),
    ...(input.auditActivationApprovalReferencePresent ? [] : ["audit_activation_approval_reference_missing"]),
    ...(input.migrationReady ? [] : ["scheduler_audit_migration_not_ready"]),
    ...(input.schedulerEnabled ? [] : ["scheduler_disabled"]),
    ...(input.schedulerBlockedReasons.length === 0 ? [] : input.schedulerBlockedReasons.map((reason) => `scheduler_${reason}`)),
    ...(input.paperMode ? [] : ["paper_runtime_invalid"]),
    ...(input.paperAutopilotEnabled ? ["paper_autopilot_enabled"] : []),
    ...(input.globalKillSwitchActive ? ["global_kill_switch_active"] : []),
  ];
  return {
    blockedReasons,
    checks: {
      auditActivationApprovalReferencePresent: input.auditActivationApprovalReferencePresent,
      auditGateEnabled: input.auditGateEnabled,
      globalKillSwitchInactive: !input.globalKillSwitchActive,
      migrationReady: input.migrationReady,
      paperAutopilotDisabled: !input.paperAutopilotEnabled,
      paperMode: input.paperMode,
      schedulerEnabled: input.schedulerEnabled,
    },
    status: blockedReasons.length === 0 ? "ready" : "blocked",
  };
}
