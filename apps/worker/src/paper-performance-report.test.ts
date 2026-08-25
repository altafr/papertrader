import { describe, expect, it } from "vitest";

import { buildPaperPerformanceReport } from "./paper-performance-report.js";

describe("paper performance report", () => {
  it("reports insufficient history until two reconciled snapshots exist", () => {
    expect(buildPaperPerformanceReport([{ capturedAt: "2026-08-25T00:00:00Z", equity: "100000" }])).toEqual({ snapshotCount: 1, status: "insufficient_history" });
  });

  it("calculates return and drawdown from reconciled equity snapshots", () => {
    const result = buildPaperPerformanceReport([
      { capturedAt: "2026-08-25T01:00:00Z", equity: "99000" },
      { capturedAt: "2026-08-25T00:00:00Z", equity: "100000" },
      { capturedAt: "2026-08-25T02:00:00Z", equity: "101000" },
    ]);
    expect(result).toMatchObject({ snapshotCount: 3, status: "ready", metrics: { initialEquity: "100000.00000000", finalEquity: "101000.00000000", maxDrawdownPercent: "1.00000000", totalReturnPercent: "1.00000000" } });
  });
});
