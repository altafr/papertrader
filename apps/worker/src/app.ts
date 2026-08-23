import { FOUNDATION_STATUS, type WorkerHealth } from "@momentum/domain";
import { getPaperOperatingMode, isGlobalKillSwitchActive } from "@momentum/config";
import { getTelegramNotificationReadiness } from "@momentum/notifications";
import { getShadowEvaluationConfig, getShadowScheduleHealth } from "./shadow-evaluation.js";
import { getDurableSchedulerConfig, getDurableSchedulerHealth } from "./durable-scheduler.js";
import { getResearchScheduleConfig, getResearchScheduleReadiness, getResearchSchedulerHealth } from "./research-scheduler.js";

export function getWorkerHealth(now = new Date(), environment: NodeJS.ProcessEnv = process.env): WorkerHealth {
  const shadow = getShadowEvaluationConfig(environment);
  const schedule = getShadowScheduleHealth();
  const durable = getDurableSchedulerHealth();
  const durableConfig = getDurableSchedulerConfig(environment);
  const activationApprovalReferencePresent = !durableConfig.enabled || Boolean(environment.DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE?.trim() && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(environment.DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE.trim()));
  const research = getResearchScheduleConfig(environment);
  const researchReadiness = getResearchScheduleReadiness(environment);
  const researchRuntime = getResearchSchedulerHealth();
  const researchStatus: WorkerHealth["researchSchedule"]["status"] = researchReadiness.status === "blocked" ? "blocked" : researchRuntime.enabled ? researchRuntime.status : research.enabled ? "ready" : "disabled";
  const paperCredentialsConfigured = Boolean(environment.ALPACA_API_KEY?.trim() && environment.ALPACA_SECRET_KEY?.trim() && environment.ALPACA_PAPER_TRADE !== "false");
  const telegram = getTelegramNotificationReadiness(environment);
  return {
    alpaca: paperCredentialsConfigured ? "configured" : "not_configured",
    asOf: now.toISOString(),
    brokerConnectionEnabled: environment.BROKER_CONNECTION_ENABLED === "true",
    database: environment.DATABASE_URL?.trim() ? "configured" : "not_configured",
    durableScheduler: { ...durable, activationApprovalReferencePresent, enabled: durableConfig.enabled },
    globalKillSwitchActive: isGlobalKillSwitchActive(environment),
    operatingMode: getPaperOperatingMode(environment),
    researchSchedule: { enabled: research.enabled, handlerEnabled: research.handlerEnabled, ...(researchRuntime.lastRunAt ? { lastRunAt: researchRuntime.lastRunAt } : {}), ...(researchRuntime.nextRunAt ? { nextRunAt: researchRuntime.nextRunAt } : {}), status: researchStatus },
    shadowEvaluation: { ...shadow, ...schedule, status: shadow.enabled ? schedule.status : "disabled" },
    service: "worker",
    status: FOUNDATION_STATUS.health,
    telegramAlerts: { enabled: telegram.checks.enabled, status: telegram.status },
  };
}
