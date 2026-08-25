import { calculatePerformanceMetrics, type PerformanceMetrics } from "@momentum/domain";

export interface PaperPerformanceSnapshot {
  readonly capturedAt: string;
  readonly equity: string;
}

export interface PaperPerformanceReport {
  readonly calendarDays: number;
  readonly firstCapturedAt?: string;
  readonly lastCapturedAt?: string;
  readonly metrics?: PerformanceMetrics;
  readonly snapshotCount: number;
  readonly status: "insufficient_history" | "ready";
}

export function buildPaperPerformanceReport(snapshots: readonly PaperPerformanceSnapshot[]): PaperPerformanceReport {
  if (snapshots.length < 2) return { calendarDays: new Set(snapshots.map((snapshot) => snapshot.capturedAt.slice(0, 10))).size, snapshotCount: snapshots.length, status: "insufficient_history" };
  const ordered = [...snapshots].sort((left, right) => Date.parse(left.capturedAt) - Date.parse(right.capturedAt));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (!first || !last || Number.isNaN(Date.parse(first.capturedAt)) || Number.isNaN(Date.parse(last.capturedAt))) {
    throw new Error("Paper performance snapshots must have valid timestamps.");
  }
  return {
    calendarDays: new Set(ordered.map((snapshot) => snapshot.capturedAt.slice(0, 10))).size,
    firstCapturedAt: first.capturedAt,
    lastCapturedAt: last.capturedAt,
    metrics: calculatePerformanceMetrics(ordered),
    snapshotCount: ordered.length,
    status: "ready",
  };
}
