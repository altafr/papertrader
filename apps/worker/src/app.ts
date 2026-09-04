import { type WorkerHealth } from "@momentum/domain";
import { DAILY_PREPARATION_TIMEZONE, getPaperOperatingMode, isGlobalKillSwitchActive } from "@momentum/config";
import { getTelegramAlertTestReadiness, getTelegramNotificationReadiness } from "@momentum/notifications";
import { getShadowEvaluationConfig, getShadowScheduleHealth } from "./shadow-evaluation.js";
import { getDurableSchedulerConfig, getDurableSchedulerHealth } from "./durable-scheduler.js";
import { assessResearchSchedulerLiveness, getResearchScheduleConfig, getResearchScheduleReadiness, getResearchSchedulerHealth } from "./research-scheduler.js";
import { getPositionManagementIntervalSeconds, getPositionManagementReadiness, getPositionManagementSchedulerEnabled } from "./position-management-runtime.js";
import { assessPositionManagementLiveness, getPositionManagementHealth } from "./position-management-scheduler.js";
import { getMarketStreamHealth } from "./market-stream-runner.js";

export function deriveWorkerHealthStatus(input: { readonly marketStreamFreshness?: "fresh" | "stale" | "unknown" | undefined; readonly positionManagementStatus: WorkerHealth["positionManagement"]["status"]; readonly researchScheduleStatus: WorkerHealth["researchSchedule"]["status"]; readonly telegramEnabled?: boolean; readonly telegramStatus?: WorkerHealth["telegramAlerts"]["status"] }): WorkerHealth["status"] {
  return input.marketStreamFreshness === "stale" || input.positionManagementStatus === "degraded" || input.researchScheduleStatus === "degraded" || (input.telegramEnabled === true && input.telegramStatus === "blocked") ? "degraded" : "healthy";
}

export function getWorkerHealth(now = new Date(), environment: NodeJS.ProcessEnv = process.env): WorkerHealth {
  const shadow = getShadowEvaluationConfig(environment);
  const schedule = getShadowScheduleHealth();
  const durable = getDurableSchedulerHealth();
  const durableConfig = getDurableSchedulerConfig(environment);
  const activationApprovalReferencePresent = !durableConfig.enabled || Boolean(environment.DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE?.trim() && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(environment.DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE.trim()));
  const auditEnabled = environment.DURABLE_SCHEDULER_AUDIT_ENABLED === "true";
  const auditActivationApprovalReferencePresent = Boolean(environment.DURABLE_SCHEDULER_AUDIT_ACTIVATION_APPROVAL_REFERENCE?.trim() && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(environment.DURABLE_SCHEDULER_AUDIT_ACTIVATION_APPROVAL_REFERENCE.trim()));
  const research = getResearchScheduleConfig(environment);
  const researchReadiness = getResearchScheduleReadiness(environment);
  const researchRuntime = getResearchSchedulerHealth();
  const researchStatus: WorkerHealth["researchSchedule"]["status"] = researchReadiness.status === "blocked" ? "blocked" : researchRuntime.enabled ? assessResearchSchedulerLiveness(researchRuntime, now).status : research.enabled ? "ready" : "disabled";
  const positionManagementReadiness = getPositionManagementReadiness(environment);
  const positionManagementHealth = getPositionManagementHealth();
  const positionManagementStatus = positionManagementHealth.unmanagedCount && positionManagementHealth.unmanagedCount > 0
    ? "degraded"
    : assessPositionManagementLiveness(positionManagementHealth, getPositionManagementIntervalSeconds(environment), now);
  const paperCredentialsConfigured = Boolean(environment.ALPACA_API_KEY?.trim() && environment.ALPACA_SECRET_KEY?.trim() && environment.ALPACA_PAPER_TRADE !== "false");
  const telegram = getTelegramNotificationReadiness(environment);
  const telegramTest = getTelegramAlertTestReadiness(environment);
  const telegramAssistantEnabled = environment.TELEGRAM_ASSISTANT_ENABLED === "true";
  const telegramAssistantPollSeconds = Number(environment.TELEGRAM_ASSISTANT_POLL_SECONDS ?? "20");
  const marketStream = getMarketStreamHealth(now);
  const candidate = environment.PAPERTRADER_RELEASE?.trim() || environment.RAILWAY_GIT_COMMIT_SHA?.trim() || environment.GIT_COMMIT_SHA?.trim();
  const release = candidate && /^[0-9A-Za-z._-]{1,64}$/.test(candidate) ? candidate : undefined;
  return {
    alpaca: paperCredentialsConfigured ? "configured" : "not_configured",
    asOf: now.toISOString(),
    brokerConnectionEnabled: environment.BROKER_CONNECTION_ENABLED === "true",
    database: environment.DATABASE_URL?.trim() ? "configured" : "not_configured",
    durableScheduler: { ...durable, auditActivationApprovalReferencePresent, auditEnabled, activationApprovalReferencePresent, cron: durableConfig.cron, enabled: durableConfig.enabled, timezone: DAILY_PREPARATION_TIMEZONE },
    globalKillSwitchActive: isGlobalKillSwitchActive(environment),
    marketStream,
    operatingMode: getPaperOperatingMode(environment),
    paperAutopilotOrderSubmissionEnabled: environment.PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED === "true",
    paperAutopilotOrderSubmissionApprovalReferencePresent: environment.PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED !== "true" || Boolean(environment.PAPER_AUTOPILOT_ORDER_SUBMISSION_APPROVAL_REFERENCE?.trim() && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(environment.PAPER_AUTOPILOT_ORDER_SUBMISSION_APPROVAL_REFERENCE.trim())),
    positionManagement: { blockedReasons: positionManagementReadiness.blockedReasons, enabled: getPositionManagementSchedulerEnabled(environment), intervalSeconds: getPositionManagementIntervalSeconds(environment), readiness: positionManagementReadiness.status, status: positionManagementStatus, ...(positionManagementHealth.failureCode === undefined ? {} : { failureCode: positionManagementHealth.failureCode }), ...(positionManagementHealth.unmanagedCount === undefined ? {} : { unmanagedCount: positionManagementHealth.unmanagedCount }), ...(positionManagementHealth.lastError === undefined ? {} : { lastError: positionManagementHealth.lastError }), ...(positionManagementHealth.lastRunAt === undefined ? {} : { lastRunAt: positionManagementHealth.lastRunAt }) },
    researchSchedule: { enabled: research.enabled, handlerEnabled: research.handlerEnabled, ...(researchRuntime.lastCatchupAt ? { lastCatchupAt: researchRuntime.lastCatchupAt } : {}), ...(researchRuntime.lastCatchupJobId ? { lastCatchupJobId: researchRuntime.lastCatchupJobId } : {}), ...(researchRuntime.lastCatchupStatus ? { lastCatchupStatus: researchRuntime.lastCatchupStatus } : {}), ...(researchRuntime.lastRiskApprovedCount === undefined ? {} : { lastRiskApprovedCount: researchRuntime.lastRiskApprovedCount }), ...(researchRuntime.lastRiskCycleAt ? { lastRiskCycleAt: researchRuntime.lastRiskCycleAt } : {}), ...(researchRuntime.lastRiskCycleStatus ? { lastRiskCycleStatus: researchRuntime.lastRiskCycleStatus } : {}), ...(researchRuntime.lastRiskDecisionCount === undefined ? {} : { lastRiskDecisionCount: researchRuntime.lastRiskDecisionCount }), ...(researchRuntime.lastRunAt ? { lastRunAt: researchRuntime.lastRunAt } : {}), ...(researchRuntime.nextRunAt ? { nextRunAt: researchRuntime.nextRunAt } : {}), status: researchStatus },
    ...(release ? { release } : {}),
    shadowEvaluation: { ...shadow, ...schedule, status: shadow.enabled ? schedule.status : "disabled" },
    service: "worker",
    status: deriveWorkerHealthStatus({ marketStreamFreshness: marketStream.freshness, positionManagementStatus, researchScheduleStatus: researchStatus, telegramEnabled: telegram.checks.enabled, telegramStatus: telegram.status }),
    telegramAlerts: { deliveryVerification: telegram.deliveryVerification, enabled: telegram.checks.enabled, riskDecisionAlerts: "approved_only", routineCooldownHours: 24, status: telegram.status },
    telegramAlertTest: { approvalReferencePresent: telegramTest.approvalReferencePresent, status: telegramTest.status },
    telegramAssistant: { enabled: telegramAssistantEnabled, mode: "read_only", pollSeconds: Number.isSafeInteger(telegramAssistantPollSeconds) ? telegramAssistantPollSeconds : 20, status: telegramAssistantEnabled ? "ready" : "disabled", webResearch: { configured: Boolean(environment.FIRECRAWL_API_KEY?.trim()), provider: "firecrawl", status: environment.FIRECRAWL_API_KEY?.trim() ? "configured" : "not_configured" } },
  };
}
