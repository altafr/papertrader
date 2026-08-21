import { FOUNDATION_STATUS, type ServiceHealth } from "@momentum/domain";

export function getApiHealth(now = new Date()): ServiceHealth {
  return {
    asOf: now.toISOString(),
    service: "api",
    status: FOUNDATION_STATUS.health,
  };
}
