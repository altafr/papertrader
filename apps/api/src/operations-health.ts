export type ReconciliationHealthStatus = "delayed" | "fresh" | "stale" | "unavailable";
export type SchedulerActivationStatus = "blocked" | "disabled" | "ready";

export interface ReconciliationHealth {
  readonly ageSeconds?: number;
  readonly capturedAt?: string;
  readonly status: ReconciliationHealthStatus;
}

export const RECONCILIATION_HEALTH_THRESHOLDS = {
  delayedSeconds: 93_600,
  staleSeconds: 172_800,
} as const;

export function assessSchedulerActivation(input: {
  readonly brokerConnectionEnabled: boolean;
  readonly dailyPreparationHandlerEnabled: boolean;
  readonly schedulerEnabled: boolean;
}): SchedulerActivationStatus {
  if (!input.schedulerEnabled) return "disabled";
  return input.brokerConnectionEnabled && input.dailyPreparationHandlerEnabled ? "ready" : "blocked";
}

export function assessReconciliationHealth(
  capturedAt: Date | string | undefined,
  now = new Date(),
  thresholds = RECONCILIATION_HEALTH_THRESHOLDS,
): ReconciliationHealth {
  if (!capturedAt) return { status: "unavailable" };

  const captured = capturedAt instanceof Date ? capturedAt : new Date(capturedAt);
  if (Number.isNaN(captured.getTime())) return { status: "unavailable" };

  const ageSeconds = Math.max(0, Math.floor((now.getTime() - captured.getTime()) / 1000));
  const status = ageSeconds > thresholds.staleSeconds
    ? "stale"
    : ageSeconds > thresholds.delayedSeconds
      ? "delayed"
      : "fresh";
  return { ageSeconds, capturedAt: captured.toISOString(), status };
}
