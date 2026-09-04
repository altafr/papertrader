import { describe, expect, it } from "vitest";

import { parsePublicHealth } from "./public-health";

describe("parsePublicHealth", () => {
  it("keeps the bounded non-sensitive heartbeat fields", () => {
    expect(parsePublicHealth({ status: "healthy", operatingMode: "paper_autopilot", release: "abc123", researchSchedule: { lastCatchupAt: "2026-08-29T19:59:00Z", lastCatchupJobId: "research-startup-1", lastCatchupStatus: "queued", lastRiskApprovedCount: 1, lastRiskCycleAt: "2026-08-29T19:58:00Z", lastRiskCycleStatus: "completed", lastRiskDecisionCount: 2, lastRunAt: "2026-08-29T19:57:00Z", status: "scheduled", nextRunAt: "2026-08-29T20:00:00Z" }, positionManagement: { failureCode: "crypto_order_entitlement_blocked", readiness: "ready", unmanagedCount: 2 }, marketStream: { freshness: "fresh", freshnessMaxAgeSeconds: 1800, lastMessageAt: "2026-08-29T19:59:30Z", status: "connected" }, telegramAssistant: { enabled: true, status: "ready", webResearch: { configured: true, provider: "firecrawl", status: "configured" } }, accountEquity: "secret" })).toEqual({ status: "healthy", operatingMode: "paper_autopilot", release: "abc123", researchSchedule: { lastCatchupAt: "2026-08-29T19:59:00.000Z", lastCatchupJobId: "research-startup-1", lastCatchupStatus: "queued", lastRiskApprovedCount: 1, lastRiskCycleAt: "2026-08-29T19:58:00.000Z", lastRiskCycleStatus: "completed", lastRiskDecisionCount: 2, lastRunAt: "2026-08-29T19:57:00.000Z", status: "scheduled", nextRunAt: "2026-08-29T20:00:00.000Z" }, positionManagement: { failureCode: "crypto_order_entitlement_blocked", readiness: "ready", unmanagedCount: 2 }, marketStream: { freshness: "fresh", freshnessMaxAgeSeconds: 1800, lastMessageAt: "2026-08-29T19:59:30.000Z", status: "connected" }, telegramAssistant: { enabled: true, status: "ready", webResearch: { configured: true, provider: "firecrawl", status: "configured" } } });
  });

  it("fails closed for malformed or oversized payloads", () => {
    expect(parsePublicHealth(null)).toBeUndefined();
    expect(parsePublicHealth({ status: 200 })).toBeUndefined();
    expect(parsePublicHealth({ status: "x".repeat(161) })).toBeUndefined();
    expect(parsePublicHealth({ status: "healthy", researchSchedule: { nextRunAt: "not-a-timestamp" }, marketStream: { lastMessageAt: "not-a-timestamp" } })).toEqual({ status: "healthy", researchSchedule: {} , marketStream: {} });
  });
});
