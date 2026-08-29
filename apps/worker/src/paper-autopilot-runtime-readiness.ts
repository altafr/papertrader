import type { PaperAutopilotReadiness, PaperAutopilotReadinessStatus } from "./paper-autopilot-readiness.js";

export type RuntimeReconciliationStatus = "delayed" | "fresh" | "stale" | "unavailable";

export interface PaperAutopilotRuntimeReadiness {
  readonly blockedReasons: readonly string[];
  readonly configuration: PaperAutopilotReadiness;
  readonly reconciliation: {
    readonly ageSeconds?: number;
    readonly capturedAt?: string;
    readonly status: RuntimeReconciliationStatus;
  };
  readonly status: PaperAutopilotReadinessStatus;
}

export function assessRuntimeReconciliation(capturedAt: Date | string | undefined, now = new Date()): PaperAutopilotRuntimeReadiness["reconciliation"] {
  if (!capturedAt) return { status: "unavailable" };
  const captured = capturedAt instanceof Date ? capturedAt : new Date(capturedAt);
  if (Number.isNaN(captured.getTime())) return { status: "unavailable" };
  const ageSeconds = Math.max(0, Math.floor((now.getTime() - captured.getTime()) / 1000));
  const status: RuntimeReconciliationStatus = ageSeconds > 172_800 ? "stale" : ageSeconds > 93_600 ? "delayed" : "fresh";
  return { ageSeconds, capturedAt: captured.toISOString(), status };
}

export function combinePaperAutopilotRuntimeReadiness(configuration: PaperAutopilotReadiness, reconciliation: PaperAutopilotRuntimeReadiness["reconciliation"]): PaperAutopilotRuntimeReadiness {
  const freshnessReasons = reconciliation.status === "fresh" ? [] : [`reconciliation_${reconciliation.status}`];
  const executionReasons = configuration.status === "ready" && configuration.executionStatus !== "enabled" ? ["paper_order_submission_disabled"] : [];
  const blockedReasons = [...configuration.blockedReasons, ...executionReasons, ...freshnessReasons];
  const status: PaperAutopilotReadinessStatus = configuration.status === "disabled" ? "disabled" : blockedReasons.length === 0 ? "ready" : "blocked";
  return { blockedReasons: status === "disabled" ? [] : blockedReasons, configuration, reconciliation, status };
}
