import { ALPACA_ADAPTER_STATUS } from "@momentum/alpaca";
import { DATABASE_ADAPTER_STATUS } from "@momentum/db";
import { FOUNDATION_STATUS, type WorkerHealth } from "@momentum/domain";

export function getWorkerHealth(now = new Date()): WorkerHealth {
  return {
    alpaca: ALPACA_ADAPTER_STATUS,
    asOf: now.toISOString(),
    database: DATABASE_ADAPTER_STATUS,
    service: "worker",
    status: FOUNDATION_STATUS.health,
  };
}
