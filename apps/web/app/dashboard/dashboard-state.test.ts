import { describe, expect, it } from "vitest";

import { formatUtc, getFreshnessLabel, getFreshnessState, parseOperationsHealth } from "./dashboard-state";

describe("dashboard state", () => {
  it("classifies persisted data by freshness", () => {
    expect(getFreshnessState(30)).toBe("fresh");
    expect(getFreshnessState(600)).toBe("delayed");
    expect(getFreshnessState(901)).toBe("stale");
    expect(getFreshnessState(Number.NaN)).toBe("stale");
    expect(getFreshnessLabel("delayed")).toBe("Delayed");
  });

  it("formats UTC capture timestamps without inventing local time", () => {
    expect(formatUtc("2026-08-22T01:02:03.000Z")).toBe("2026-08-22 01:02:03 UTC");
    expect(formatUtc("not-a-date")).toBe("Unavailable");
  });

  it("accepts only the redacted operations-health contract", () => {
    const health = parseOperationsHealth({
      reconciliation: { ageSeconds: 30, capturedAt: "2026-08-23T00:00:00.000Z", status: "fresh" },
      runtime: {
        brokerConnectionEnabled: false,
        dailyPreparationHandlerEnabled: false,
        paperAutopilotEnabled: false,
        scheduler: { enabled: false, status: "disabled" },
      },
    });
    expect(health?.runtime.scheduler.status).toBe("disabled");
    expect(parseOperationsHealth({ reconciliation: { status: "fresh" }, runtime: {} })).toBeUndefined();
  });
});
