import { ALPACA_ADAPTER_STATUS } from "@momentum/alpaca";
import { DATABASE_ADAPTER_STATUS } from "@momentum/db";
import { FOUNDATION_STATUS, type WorkerHealth } from "@momentum/domain";
import { getShadowEvaluationConfig } from "./shadow-evaluation.js";

export function getWorkerHealth(now = new Date(), environment: NodeJS.ProcessEnv = process.env): WorkerHealth {
  const shadow = getShadowEvaluationConfig(environment);
  return {
    alpaca: ALPACA_ADAPTER_STATUS,
    asOf: now.toISOString(),
    database: DATABASE_ADAPTER_STATUS,
    shadowEvaluation: { ...shadow, status: shadow.enabled ? "ready" : "disabled" },
    service: "worker",
    status: FOUNDATION_STATUS.health,
  };
}
