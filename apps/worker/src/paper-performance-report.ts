import { calculatePerformanceMetrics, isDecimalAtMost, type PerformanceMetrics } from "@momentum/domain";

export interface PaperPerformanceSnapshot {
  readonly capturedAt: string;
  readonly equity: string;
}

/** Bounded history window sized for the observed high-frequency reconciliation cadence. */
export const PAPER_EVIDENCE_SNAPSHOT_LIMIT = 100_000;

export interface PaperPerformanceReport {
  readonly calendarDays: number;
  readonly consecutiveCalendarDays: number;
  readonly firstCapturedAt?: string;
  readonly estimatedReadyAt?: string;
  readonly lastCapturedAt?: string;
  readonly metrics?: PerformanceMetrics;
  readonly stability: {
    readonly blockedReasons: readonly string[];
    readonly status: "blocked" | "ready";
  };
  readonly snapshotCount: number;
  readonly status: "insufficient_history" | "ready";
}

/** Build the single operator alert emitted when the real evidence gate clears. */
export function buildPaperEvidenceReadyAlert(report: PaperPerformanceReport, occurredAt: string) {
  if (report.stability.status !== "ready" || report.consecutiveCalendarDays < 30) return undefined;
  return {
    code: "paper_evidence_gate_ready",
    dedupeKey: "paper_evidence_gate_ready",
    message: "Paper evidence gate satisfied: 30 consecutive calendar days are recorded. Live-readiness review is still required; no mode or risk setting changed.",
    occurredAt,
    severity: "info" as const,
  };
}

/** Estimate the first eligible date after the required consecutive evidence window. */
export function estimatePaperEvidenceReadyAt(lastCapturedAt: string | undefined, consecutiveCalendarDays: number, requiredConsecutiveCalendarDays = 30): string | undefined {
  if (!lastCapturedAt || consecutiveCalendarDays >= requiredConsecutiveCalendarDays) return undefined;
  const timestamp = Date.parse(lastCapturedAt);
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp + Math.max(0, requiredConsecutiveCalendarDays - consecutiveCalendarDays) * 86_400_000).toISOString();
}

export function buildPaperPerformanceReport(snapshots: readonly PaperPerformanceSnapshot[]): PaperPerformanceReport {
  if (snapshots.length < 2) { const lastCapturedAt = snapshots.at(-1)?.capturedAt; const consecutiveCalendarDays = snapshots.length === 1 ? 1 : 0; const estimatedReadyAt = estimatePaperEvidenceReadyAt(lastCapturedAt, consecutiveCalendarDays); return { calendarDays: new Set(snapshots.map((snapshot) => snapshot.capturedAt.slice(0, 10))).size, consecutiveCalendarDays, ...(lastCapturedAt ? { lastCapturedAt } : {}), ...(estimatedReadyAt ? { estimatedReadyAt } : {}), snapshotCount: snapshots.length, stability: { blockedReasons: ["minimum_30_consecutive_calendar_days_not_met", "performance_history_insufficient"], status: "blocked" }, status: "insufficient_history" }; }
  const ordered = [...snapshots].sort((left, right) => Date.parse(left.capturedAt) - Date.parse(right.capturedAt));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (!first || !last || Number.isNaN(Date.parse(first.capturedAt)) || Number.isNaN(Date.parse(last.capturedAt))) {
    throw new Error("Paper performance snapshots must have valid timestamps.");
  }
  const dates = [...new Set(ordered.map((snapshot) => snapshot.capturedAt.slice(0, 10)))];
  let consecutiveCalendarDays = dates.length > 0 ? 1 : 0;
  for (let index = 1; index < dates.length; index += 1) {
    const previous = Date.parse(`${dates[index - 1]}T00:00:00Z`);
    const current = Date.parse(`${dates[index]}T00:00:00Z`);
    if (current - previous === 86_400_000) consecutiveCalendarDays += 1;
    else consecutiveCalendarDays = 1;
  }
  const metrics = calculatePerformanceMetrics(ordered);
  const estimatedReadyAt = estimatePaperEvidenceReadyAt(last.capturedAt, consecutiveCalendarDays);
  const stabilityBlockedReasons = [
    ...(consecutiveCalendarDays >= 30 ? [] : ["minimum_30_consecutive_calendar_days_not_met"]),
    ...(isDecimalAtMost(metrics.maxDrawdownPercent, "5") ? [] : ["maximum_drawdown_policy_exceeded"]),
  ];
  return {
    calendarDays: dates.length,
    consecutiveCalendarDays,
    firstCapturedAt: first.capturedAt,
    ...(estimatedReadyAt === undefined ? {} : { estimatedReadyAt }),
    lastCapturedAt: last.capturedAt,
    metrics,
    snapshotCount: ordered.length,
    stability: { blockedReasons: stabilityBlockedReasons, status: stabilityBlockedReasons.length === 0 ? "ready" : "blocked" },
    status: "ready",
  };
}
