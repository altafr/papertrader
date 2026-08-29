import { describe, expect, it } from "vitest";
import type { ResearchWatchlistCandidate } from "@momentum/domain";

import { buildPaperRiskCycleFailureAlert, buildPaperRiskCycleLog, buildResearchCycleLog, buildResearchSchedulerStartFailureAlert, createResearchSchedulerFromEnvironment, dedupeResearchCandidates, isMarketCloseSummaryEnabled, isUsMarketCloseSummaryWindow } from "./research-scheduler-runtime.js";

describe("research scheduler startup composition", () => {
  it("builds a redacted startup-failure alert", () => {
    expect(buildResearchSchedulerStartFailureAlert("2026-08-29T01:02:03.000Z")).toEqual({ code: "research_scheduler_start_failed", dedupeKey: "research_scheduler_start_failed:2026-08-29", message: "Research scheduler startup retries were exhausted; no new paper decision was authorized.", severity: "critical" });
  });

  it("does not construct external clients when the schedule is disabled", () => {
    expect(createResearchSchedulerFromEnvironment({})).toBeUndefined();
  });

  it("fails closed before constructing database or broker clients when readiness is incomplete", () => {
    expect(() => createResearchSchedulerFromEnvironment({ RESEARCH_HANDLER_ENABLED: "true", RESEARCH_SCHEDULER_ENABLED: "true" })).toThrow("research readiness");
  });

  it("builds a run-scoped risk-cycle failure alert", () => {
    expect(buildPaperRiskCycleFailureAlert({ agentType: "crypto_research", runId: "research-1" })).toEqual({ code: "paper_risk_cycle_failed", dedupeKey: "paper_risk_cycle_failed:research-1", message: "Paper risk cycle failed closed after crypto_research research run research-1; no additional order decision was authorized.", severity: "critical" });
  });

  it("builds a bounded credential-free cycle log", () => {
    expect(buildResearchCycleLog({ agentType: "crypto_research", runId: "run-1", status: "succeeded", candidates: [{ symbol: "BTC/USD" }, { symbol: "ETH/USD" }] })).toEqual({ agentType: "crypto_research", candidateCount: 2, event: "research_cycle_result", runId: "run-1", status: "succeeded", symbols: ["BTC/USD", "ETH/USD"] });
  });

  it("deduplicates repeated symbols while preserving asset class", () => {
    const candidate = { assetClass: "crypto" as const, symbol: "BTC/USD" } as unknown as ResearchWatchlistCandidate;
    const duplicate = { ...candidate };
    const equity = { assetClass: "us_equity" as const, symbol: "BTC/USD" } as never;
    expect(dedupeResearchCandidates([candidate, duplicate, equity])).toHaveLength(2);
  });

  it("detects the weekday New York market-close hour across timezone conversion", () => {
    expect(isUsMarketCloseSummaryWindow(new Date("2026-08-28T20:15:00.000Z"))).toBe(true);
    expect(isUsMarketCloseSummaryWindow(new Date("2026-08-29T20:15:00.000Z"))).toBe(false);
    expect(isUsMarketCloseSummaryWindow(new Date("2026-01-02T21:15:00.000Z"))).toBe(true);
  });

  it("defaults close summaries on when continuous research is enabled", () => {
    expect(isMarketCloseSummaryEnabled({ RESEARCH_SCHEDULER_ENABLED: "true" })).toBe(true);
    expect(isMarketCloseSummaryEnabled({ RESEARCH_SCHEDULER_ENABLED: "false" })).toBe(false);
    expect(isMarketCloseSummaryEnabled({ MARKET_CLOSE_SUMMARY_ENABLED: "false", RESEARCH_SCHEDULER_ENABLED: "true" })).toBe(false);
  });

  it("bounds risk-cycle log reasons and run identifiers", () => {
    expect(buildPaperRiskCycleLog({ researchRunIds: ["run-1"], decisions: [{ approvalStatus: "rejected", executionStatus: "not_submitted", intentId: "intent-1", reasons: ["reason-1", "reason-2"], symbol: "BTC/USD" }] })).toEqual({ decisions: [{ approvalStatus: "rejected", executionStatus: "not_submitted", intentId: "intent-1", reasons: ["reason-1", "reason-2"], symbol: "BTC/USD" }], event: "paper_risk_cycle_result", researchRunIds: ["run-1"] });
  });
});
