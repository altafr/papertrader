import { ALPACA_ADAPTER_STATUS } from "@momentum/alpaca";
import { DATABASE_ADAPTER_STATUS } from "@momentum/db";
import { FOUNDATION_STATUS, type WorkerHealth } from "@momentum/domain";
import { getShadowEvaluationConfig, getShadowScheduleHealth } from "./shadow-evaluation.js";
import { getDurableSchedulerConfig, getDurableSchedulerHealth } from "./durable-scheduler.js";
import { getResearchScheduleConfig, getResearchScheduleReadiness, getResearchSchedulerHealth } from "./research-scheduler.js";

export function getWorkerHealth(now = new Date(), environment: NodeJS.ProcessEnv = process.env): WorkerHealth {
  const shadow = getShadowEvaluationConfig(environment);
  const schedule = getShadowScheduleHealth();
  const durable = getDurableSchedulerHealth();
  const durableConfig = getDurableSchedulerConfig(environment);
  const research = getResearchScheduleConfig(environment);
  const researchReadiness = getResearchScheduleReadiness(environment);
  const researchRuntime = getResearchSchedulerHealth();
  const researchStatus: WorkerHealth["researchSchedule"]["status"] = researchReadiness.status === "blocked" ? "blocked" : researchRuntime.enabled ? researchRuntime.status : research.enabled ? "ready" : "disabled";
  return {
    alpaca: ALPACA_ADAPTER_STATUS,
    asOf: now.toISOString(),
    database: DATABASE_ADAPTER_STATUS,
    durableScheduler: { ...durable, enabled: durableConfig.enabled },
    researchSchedule: { enabled: research.enabled, handlerEnabled: research.handlerEnabled, ...(researchRuntime.lastRunAt ? { lastRunAt: researchRuntime.lastRunAt } : {}), ...(researchRuntime.nextRunAt ? { nextRunAt: researchRuntime.nextRunAt } : {}), status: researchStatus },
    shadowEvaluation: { ...shadow, ...schedule, status: shadow.enabled ? schedule.status : "disabled" },
    service: "worker",
    status: FOUNDATION_STATUS.health,
  };
}
