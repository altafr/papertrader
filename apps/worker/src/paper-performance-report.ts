import { calculatePerformanceMetrics, type PerformanceMetrics } from "@momentum/domain";

export interface PaperPerformanceSnapshot {
  readonly capturedAt: string;
  readonly equity: string;
}

export interface PaperPerformanceReport {
  readonly metrics?: PerformanceMetrics;
  readonly snapshotCount: number;
  readonly status: "insufficient_history" | "ready";
}

export function buildPaperPerformanceReport(snapshots: readonly PaperPerformanceSnapshot[]): PaperPerformanceReport {
  if (snapshots.length < 2) return { snapshotCount: snapshots.length, status: "insufficient_history" };
  const ordered = [...snapshots].sort((left, right) => Date.parse(left.capturedAt) - Date.parse(right.capturedAt));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (!first || !last || Number.isNaN(Date.parse(first.capturedAt)) || Number.isNaN(Date.parse(last.capturedAt))) {
    throw new Error("Paper performance snapshots must have valid timestamps.");
  }
  return {
    metrics: calculatePerformanceMetrics(ordered),
    snapshotCount: ordered.length,
    status: "ready",
  };
}
