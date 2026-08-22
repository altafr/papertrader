import { describe, expect, it } from "vitest";

import { formatUtc, getFreshnessLabel, getFreshnessState } from "./dashboard-state";

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
});
