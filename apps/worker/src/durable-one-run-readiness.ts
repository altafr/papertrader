import { isGlobalKillSwitchActive } from "@momentum/config";

export type DurableOneRunReadinessStatus = "blocked" | "ready";

export interface DurableOneRunReadiness {
  readonly approvalReferencePresent: boolean;
  readonly blockedReasons: readonly string[];
  readonly checks: {
    readonly brokerConnectionEnabled: boolean;
    readonly dailyPreparationHandlerEnabled: boolean;
    readonly databaseConfigured: boolean;
    readonly durableSchedulerDisabled: boolean;
    readonly globalKillSwitchActive: boolean;
    readonly paperAutopilotDisabled: boolean;
    readonly paperCredentialsConfigured: boolean;
    readonly paperMode: boolean;
    readonly runOnceEnabled: boolean;
  };
  readonly status: DurableOneRunReadinessStatus;
}

export function getDurableOneRunReadiness(environment: NodeJS.ProcessEnv = process.env): DurableOneRunReadiness {
  const paperMode = (environment.TRADING_MODE ?? "paper") === "paper" && environment.ALPACA_PAPER_TRADE !== "false";
  const paperCredentialsConfigured = Boolean(environment.ALPACA_API_KEY?.trim() && environment.ALPACA_SECRET_KEY?.trim());
  const brokerConnectionEnabled = environment.BROKER_CONNECTION_ENABLED === "true";
  const dailyPreparationHandlerEnabled = environment.DAILY_PREPARATION_HANDLER_ENABLED === "true";
  const databaseConfigured = Boolean(environment.DATABASE_URL?.trim());
  const durableSchedulerDisabled = environment.DURABLE_SCHEDULER_ENABLED !== "true";
  const paperAutopilotDisabled = environment.PAPER_AUTOPILOT_ENABLED !== "true";
  const runOnceEnabled = environment.DURABLE_SCHEDULER_ONCE === "true";
  const approvalReferencePresent = Boolean(environment.DURABLE_SCHEDULER_APPROVAL_REFERENCE?.trim() && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(environment.DURABLE_SCHEDULER_APPROVAL_REFERENCE.trim()));
  let globalKillSwitchActive = true;
  try { globalKillSwitchActive = isGlobalKillSwitchActive(environment); } catch { /* invalid values fail closed */ }
  const blockedReasons = [
    ...(runOnceEnabled ? [] : ["run_once_disabled"]),
    ...(approvalReferencePresent ? [] : ["approval_reference_missing_or_invalid"]),
    ...(paperMode ? [] : ["paper_runtime_invalid"]),
    ...(paperCredentialsConfigured ? [] : ["paper_credentials_not_configured"]),
    ...(databaseConfigured ? [] : ["database_not_configured"]),
    ...(brokerConnectionEnabled ? [] : ["broker_connection_disabled"]),
    ...(dailyPreparationHandlerEnabled ? [] : ["daily_preparation_handler_disabled"]),
    ...(durableSchedulerDisabled ? [] : ["durable_scheduler_must_remain_disabled"]),
    ...(paperAutopilotDisabled ? [] : ["paper_autopilot_must_remain_disabled"]),
    ...(globalKillSwitchActive ? ["global_kill_switch_active"] : []),
  ];
  return {
    approvalReferencePresent,
    blockedReasons,
    checks: { brokerConnectionEnabled, dailyPreparationHandlerEnabled, databaseConfigured, durableSchedulerDisabled, globalKillSwitchActive, paperAutopilotDisabled, paperCredentialsConfigured, paperMode, runOnceEnabled },
    status: blockedReasons.length === 0 ? "ready" : "blocked",
  };
}
