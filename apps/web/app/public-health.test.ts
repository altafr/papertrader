import { describe, expect, it } from "vitest";

import { parsePublicHealth } from "./public-health";

describe("parsePublicHealth", () => {
  it("keeps the bounded non-sensitive heartbeat fields", () => {
    expect(parsePublicHealth({ status: "healthy", operatingMode: "paper_autopilot", release: "abc123", researchSchedule: { status: "scheduled", nextRunAt: "2026-08-29T20:00:00Z" }, positionManagement: { readiness: "ready" }, marketStream: { status: "connected" }, accountEquity: "secret" })).toEqual({ status: "healthy", operatingMode: "paper_autopilot", release: "abc123", researchSchedule: { status: "scheduled", nextRunAt: "2026-08-29T20:00:00Z" }, positionManagement: { readiness: "ready" }, marketStream: { status: "connected" } });
  });

  it("fails closed for malformed or oversized payloads", () => {
    expect(parsePublicHealth(null)).toBeUndefined();
    expect(parsePublicHealth({ status: 200 })).toBeUndefined();
    expect(parsePublicHealth({ status: "x".repeat(161) })).toBeUndefined();
  });
});
