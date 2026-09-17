import { describe, expect, it } from "vitest";
import { getOvernightWindow, isOvernightReport } from "./overnight-report.js";

describe("overnight report contract", () => {
  it("selects the latest closed Hong Kong window across midnight and year boundaries", () => {
    expect(getOvernightWindow(new Date("2026-09-17T00:59:59Z")).end.toISOString()).toBe("2026-09-16T01:00:00.000Z");
    const window = getOvernightWindow(new Date("2026-01-01T01:00:00Z"));
    expect(window.start.toISOString()).toBe("2025-12-31T10:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-01-01T01:00:00.000Z");
  });
  it("rejects malformed or oversized report payloads", () => {
    expect(isOvernightReport({ schemaVersion: "1", processes: null })).toBe(false);
    expect(() => getOvernightWindow(new Date("invalid"))).toThrow();
  });
});
