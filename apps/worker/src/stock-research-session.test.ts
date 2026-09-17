import { describe, expect, it } from "vitest";
import { isStockSessionAllowed } from "./stock-research-session.js";
import { getNextResearchRunAt } from "./research-scheduler.js";

describe("stock research schedule", () => {
  const day = { date: "2026-09-17", open: "09:30", close: "16:00" };
  it("permits preparation outside the regular session and scans at midday", () => {
    expect(isStockSessionAllowed("pre_market", new Date("2026-09-17T12:30:00Z"), day)).toBe(true);
    expect(isStockSessionAllowed("intraday", new Date("2026-09-17T16:00:00Z"), day)).toBe(true);
    expect(isStockSessionAllowed("after_close", new Date("2026-09-17T21:00:00Z"), day)).toBe(true);
    expect(isStockSessionAllowed("pre_market", new Date("2026-09-17T13:30:00Z"), day)).toBe(false);
  });
  it("skips holidays and stops scans at early close", () => {
    expect(isStockSessionAllowed("intraday", new Date("2026-09-17T16:00:00Z"), undefined)).toBe(false);
    expect(isStockSessionAllowed("intraday", new Date("2026-09-17T17:00:00Z"), { ...day, close: "13:00" })).toBe(false);
  });
  it("tracks daylight saving and weekends for preparation", () => {
    expect(getNextResearchRunAt(new Date("2026-09-17T11:00:00Z"), "30 8 * * 1-5")).toBe("2026-09-17T12:30:00.000Z");
    expect(getNextResearchRunAt(new Date("2026-01-02T11:00:00Z"), "30 8 * * 1-5")).toBe("2026-01-02T13:30:00.000Z");
    expect(getNextResearchRunAt(new Date("2026-09-18T22:00:00Z"), "30 8 * * 1-5")).toBe("2026-09-21T12:30:00.000Z");
    expect(getNextResearchRunAt(new Date("2026-09-17T15:59:00Z"), "0,30 10-15 * * 1-5")).toBe("2026-09-17T16:00:00.000Z");
  });
});
