export interface MinimalSupervisionInput {
  readonly accountFresh: boolean;
  readonly baselineVerified: boolean;
  readonly globalKillSwitchActive: boolean;
  readonly orderSubmissionEnabled: boolean;
  readonly paperMode: boolean;
  readonly positionManagementReady: boolean;
  readonly researchScheduled: boolean;
  readonly telegramReady: boolean;
  readonly unmanagedPositions: number;
  readonly workerHealthy: boolean;
}

export interface MinimalSupervisionAssessment {
  readonly blockedReasons: readonly string[];
  readonly status: "blocked" | "ready";
}

/** Combine independent paper-runtime gates into one conservative supervision result. */
export function assessMinimalSupervision(input: MinimalSupervisionInput): MinimalSupervisionAssessment {
  const blockedReasons = [
    ...(input.paperMode ? [] : ["paper_mode_required"]),
    ...(input.orderSubmissionEnabled ? [] : ["order_submission_disabled"]),
    ...(input.globalKillSwitchActive ? ["global_kill_switch_active"] : []),
    ...(input.baselineVerified ? [] : ["paper_baseline_unverified"]),
    ...(input.accountFresh ? [] : ["account_snapshot_stale"]),
    ...(input.workerHealthy ? [] : ["worker_unhealthy"]),
    ...(input.researchScheduled ? [] : ["research_scheduler_not_running"]),
    ...(input.positionManagementReady ? [] : ["position_management_not_ready"]),
    ...(input.telegramReady ? [] : ["telegram_alerts_not_ready"]),
    ...(Number.isSafeInteger(input.unmanagedPositions) && input.unmanagedPositions >= 0 ? (input.unmanagedPositions === 0 ? [] : ["unmanaged_positions_present"]) : ["unmanaged_position_count_invalid"]),
  ];
  return { blockedReasons, status: blockedReasons.length === 0 ? "ready" : "blocked" };
}
