export interface ShadowEvaluationConfig {
  readonly enabled: boolean;
  readonly intervalSeconds: number;
  readonly sourceConfigured: boolean;
}

export type ShadowScheduleStatus = "degraded" | "disabled" | "ready" | "running" | "scheduled";
export interface ShadowScheduleHealth { readonly lastRunAt?: string; readonly nextRunAt?: string; readonly status: ShadowScheduleStatus; }
let scheduleHealth: ShadowScheduleHealth = { status: "disabled" };
export function getShadowScheduleHealth(): ShadowScheduleHealth { return scheduleHealth; }
export function setShadowScheduleHealth(next: ShadowScheduleHealth): void { scheduleHealth = next; }

function parseBoolean(name: string, value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be exactly true or false.`);
}

export function getShadowEvaluationConfig(environment = process.env): ShadowEvaluationConfig {
  const enabled = parseBoolean("SHADOW_EVALUATION_ENABLED", environment.SHADOW_EVALUATION_ENABLED, false);
  const sourceConfigured = parseBoolean("SHADOW_EVALUATION_SOURCE_CONFIGURED", environment.SHADOW_EVALUATION_SOURCE_CONFIGURED, false);
  const rawInterval = environment.SHADOW_EVALUATION_INTERVAL_SECONDS ?? "3600";
  const intervalSeconds = Number(rawInterval);
  if (!Number.isSafeInteger(intervalSeconds) || intervalSeconds < 60 || intervalSeconds > 86_400) throw new Error("SHADOW_EVALUATION_INTERVAL_SECONDS must be an integer from 60 to 86400.");
  if (enabled && !sourceConfigured) throw new Error("SHADOW_EVALUATION_ENABLED=true requires a configured finalized-bar source.");
  return { enabled, intervalSeconds, sourceConfigured };
}

export function assertShadowEvaluationOnce(environment = process.env): ShadowEvaluationConfig {
  if (environment.SHADOW_EVALUATION_ONCE !== "true") throw new Error("SHADOW_EVALUATION_ONCE must be exactly true for a one-shot shadow evaluation.");
  const config = getShadowEvaluationConfig(environment);
  if (!config.enabled) throw new Error("SHADOW_EVALUATION_ENABLED must be true for a one-shot shadow evaluation.");
  return config;
}
