import { FOUNDATION_STATUS, type WorkerHealth } from "@momentum/domain";
import { DAILY_PREPARATION_TIMEZONE, getPaperOperatingMode, isGlobalKillSwitchActive } from "@momentum/config";
import { getTelegramAlertTestReadiness, getTelegramNotificationReadiness } from "@momentum/notifications";
import { getShadowEvaluationConfig, getShadowScheduleHealth } from "./shadow-evaluation.js";
import { getDurableSchedulerConfig, getDurableSchedulerHealth } from "./durable-scheduler.js";
import { assessResearchSchedulerLiveness, getResearchScheduleConfig, getResearchScheduleReadiness, getResearchSchedulerHealth } from "./research-scheduler.js";
import { getPositionManagementIntervalSeconds, getPositionManagementReadiness, getPositionManagementSchedulerEnabled } from "./position-management-runtime.js";
import { assessPositionManagementLiveness, getPositionManagementHealth } from "./position-management-scheduler.js";
import { getMarketStreamHealth } from "./market-stream-runner.js";

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
  const positionManagementStatus = assessPositionManagementLiveness(positionManagementHealth, getPositionManagementIntervalSeconds(environment), now);
  const paperCredentialsConfigured = Boolean(environment.ALPACA_API_KEY?.trim() && environment.ALPACA_SECRET_KEY?.trim() && environment.ALPACA_PAPER_TRADE !== "false");
  const telegram = getTelegramNotificationReadiness(environment);
  const telegramTest = getTelegramAlertTestReadiness(environment);
  const release = environment.RAILWAY_GIT_COMMIT_SHA?.trim() || environment.GIT_COMMIT_SHA?.trim();
  return {
    alpaca: paperCredentialsConfigured ? "configured" : "not_configured",
    asOf: now.toISOString(),
    brokerConnectionEnabled: environment.BROKER_CONNECTION_ENABLED === "true",
    database: environment.DATABASE_URL?.trim() ? "configured" : "not_configured",
    durableScheduler: { ...durable, auditActivationApprovalReferencePresent, auditEnabled, activationApprovalReferencePresent, cron: durableConfig.cron, enabled: durableConfig.enabled, timezone: DAILY_PREPARATION_TIMEZONE },
    globalKillSwitchActive: isGlobalKillSwitchActive(environment),
    marketStream: getMarketStreamHealth(),
    operatingMode: getPaperOperatingMode(environment),
    paperAutopilotOrderSubmissionEnabled: environment.PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED === "true",
    paperAutopilotOrderSubmissionApprovalReferencePresent: environment.PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED !== "true" || Boolean(environment.PAPER_AUTOPILOT_ORDER_SUBMISSION_APPROVAL_REFERENCE?.trim() && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(environment.PAPER_AUTOPILOT_ORDER_SUBMISSION_APPROVAL_REFERENCE.trim())),
    positionManagement: { blockedReasons: positionManagementReadiness.blockedReasons, enabled: getPositionManagementSchedulerEnabled(environment), intervalSeconds: getPositionManagementIntervalSeconds(environment), readiness: positionManagementReadiness.status, status: positionManagementStatus, ...(positionManagementHealth.lastError === undefined ? {} : { lastError: positionManagementHealth.lastError }), ...(positionManagementHealth.lastRunAt === undefined ? {} : { lastRunAt: positionManagementHealth.lastRunAt }) },
    researchSchedule: { enabled: research.enabled, handlerEnabled: research.handlerEnabled, ...(researchRuntime.lastRunAt ? { lastRunAt: researchRuntime.lastRunAt } : {}), ...(researchRuntime.nextRunAt ? { nextRunAt: researchRuntime.nextRunAt } : {}), status: researchStatus },
    ...(release ? { release } : {}),
    shadowEvaluation: { ...shadow, ...schedule, status: shadow.enabled ? schedule.status : "disabled" },
    service: "worker",
    status: FOUNDATION_STATUS.health,
    telegramAlerts: { deliveryVerification: telegram.deliveryVerification, enabled: telegram.checks.enabled, riskDecisionAlerts: "approved_only", routineCooldownHours: 24, status: telegram.status },
    telegramAlertTest: { approvalReferencePresent: telegramTest.approvalReferencePresent, status: telegramTest.status },
  };
}
