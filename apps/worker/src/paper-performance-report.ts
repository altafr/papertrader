import { calculatePerformanceMetrics, type PerformanceMetrics } from "@momentum/domain";

export interface PaperPerformanceSnapshot {
  readonly capturedAt: string;
  readonly equity: string;
}

export interface PaperPerformanceReport {
  readonly calendarDays: number;
  readonly consecutiveCalendarDays: number;
  readonly firstCapturedAt?: string;
  readonly lastCapturedAt?: string;
  readonly metrics?: PerformanceMetrics;
  readonly snapshotCount: number;
  readonly status: "insufficient_history" | "ready";
}

export function buildPaperPerformanceReport(snapshots: readonly PaperPerformanceSnapshot[]): PaperPerformanceReport {
  if (snapshots.length < 2) return { calendarDays: new Set(snapshots.map((snapshot) => snapshot.capturedAt.slice(0, 10))).size, consecutiveCalendarDays: snapshots.length === 1 ? 1 : 0, snapshotCount: snapshots.length, status: "insufficient_history" };
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
  return {
    calendarDays: dates.length,
    consecutiveCalendarDays,
    firstCapturedAt: first.capturedAt,
    lastCapturedAt: last.capturedAt,
    metrics: calculatePerformanceMetrics(ordered),
    snapshotCount: ordered.length,
    status: "ready",
  };
}
