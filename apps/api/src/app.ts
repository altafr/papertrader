import { FOUNDATION_STATUS, type ServiceHealth } from "@momentum/domain";

export function getApiHealth(now = new Date()): ServiceHealth {
  const release = process.env.PAPERTRADER_RELEASE?.trim() || process.env.RAILWAY_GIT_COMMIT_SHA?.trim() || process.env.GIT_COMMIT_SHA?.trim();
  return {
    asOf: now.toISOString(),
    ...(release && /^[0-9A-Za-z._-]{1,64}$/.test(release) ? { release } : {}),
    service: "api",
    status: FOUNDATION_STATUS.health,
  };
}
