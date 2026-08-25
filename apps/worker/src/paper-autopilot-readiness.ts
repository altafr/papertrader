import { getPaperOperatingMode, isGlobalKillSwitchActive } from "@momentum/config";
import { MAX_SINGLE_TRADE_RISK_PERCENT_OF_EQUITY, MAX_SINGLE_TRADE_RISK_USD, MAX_SINGLE_TRADE_STOP_LOSS_PERCENT, PAPER_INITIAL_EQUITY_BASELINE } from "@momentum/domain";

export type PaperAutopilotReadinessStatus = "blocked" | "disabled" | "ready";

export interface PaperAutopilotReadiness {
  readonly blockedReasons: readonly string[];
  readonly checks: {
    readonly brokerConnectionEnabled: boolean;
    readonly dailyPreparationHandlerEnabled: boolean;
    readonly databaseConfigured: boolean;
    readonly durableSchedulerEnabled: boolean;
    readonly globalKillSwitchActive: boolean;
    readonly operatingModePaperAutopilot: boolean;
    readonly paperCredentialsConfigured: boolean;
    readonly paperMode: boolean;
    readonly paperRiskPolicyValid: boolean;
    readonly runtimeFreshnessGateRequired: true;
    readonly schedulerActivationApprovalReferencePresent: boolean;
  };
  readonly policy: {
    readonly initialEquityBaseline: string;
    readonly maxSingleTradeRiskPercent: string;
    readonly maxSingleTradeRiskUsd: string;
    readonly maxSingleTradeStopLossPercent: string;
  };
  readonly status: PaperAutopilotReadinessStatus;
}

export function getPaperAutopilotReadiness(environment: NodeJS.ProcessEnv = process.env): PaperAutopilotReadiness {
  const paperMode = (environment.TRADING_MODE ?? "paper") === "paper" && environment.ALPACA_PAPER_TRADE !== "false";
  const paperCredentialsConfigured = Boolean(environment.ALPACA_API_KEY?.trim() && environment.ALPACA_SECRET_KEY?.trim());
  const brokerConnectionEnabled = environment.BROKER_CONNECTION_ENABLED === "true";
  const databaseConfigured = Boolean(environment.DATABASE_URL?.trim());
  const durableSchedulerEnabled = environment.DURABLE_SCHEDULER_ENABLED === "true";
  const schedulerActivationApprovalReferencePresent = !durableSchedulerEnabled || Boolean(environment.DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE?.trim() && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(environment.DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE.trim()));
  const dailyPreparationHandlerEnabled = environment.DAILY_PREPARATION_HANDLER_ENABLED === "true";
  const globalKillSwitchActive = (() => {
    try { return isGlobalKillSwitchActive(environment); } catch { return true; }
  })();
  const autopilotEnabled = environment.PAPER_AUTOPILOT_ENABLED === "true";
  let operatingModePaperAutopilot = false;
  try {
    operatingModePaperAutopilot = getPaperOperatingMode(environment) === "paper_autopilot";
  } catch {
    operatingModePaperAutopilot = false;
  }
  const paperRiskPolicyValid = PAPER_INITIAL_EQUITY_BASELINE === "100000" && MAX_SINGLE_TRADE_RISK_USD === "100" && MAX_SINGLE_TRADE_RISK_PERCENT_OF_EQUITY === "0.25";
  const blockedReasons = [
    ...(paperMode ? [] : ["paper_runtime_invalid"]),
    ...(paperCredentialsConfigured ? [] : ["paper_credentials_not_configured"]),
    ...(brokerConnectionEnabled ? [] : ["broker_connection_disabled"]),
    ...(databaseConfigured ? [] : ["database_not_configured"]),
    ...(autopilotEnabled ? [] : ["paper_autopilot_disabled"]),
    ...(operatingModePaperAutopilot ? [] : ["operating_mode_not_paper_autopilot"]),
    ...(durableSchedulerEnabled ? [] : ["durable_scheduler_disabled"]),
    ...(dailyPreparationHandlerEnabled ? [] : ["daily_preparation_handler_disabled"]),
    ...(schedulerActivationApprovalReferencePresent ? [] : ["scheduler_activation_approval_reference_missing"]),
    ...(globalKillSwitchActive ? ["global_kill_switch_active"] : []),
    ...(paperRiskPolicyValid ? [] : ["paper_risk_policy_invalid"]),
  ];
  const status = !autopilotEnabled ? "disabled" : blockedReasons.length === 0 ? "ready" : "blocked";
  return {
    blockedReasons: status === "disabled" ? [] : blockedReasons,
    checks: { brokerConnectionEnabled, dailyPreparationHandlerEnabled, databaseConfigured, durableSchedulerEnabled, globalKillSwitchActive, operatingModePaperAutopilot, paperCredentialsConfigured, paperMode, paperRiskPolicyValid, runtimeFreshnessGateRequired: true, schedulerActivationApprovalReferencePresent },
    policy: { initialEquityBaseline: PAPER_INITIAL_EQUITY_BASELINE, maxSingleTradeRiskPercent: MAX_SINGLE_TRADE_RISK_PERCENT_OF_EQUITY, maxSingleTradeRiskUsd: MAX_SINGLE_TRADE_RISK_USD, maxSingleTradeStopLossPercent: MAX_SINGLE_TRADE_STOP_LOSS_PERCENT },
    status,
  };
}
