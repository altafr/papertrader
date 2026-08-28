import { describe, expect, it } from "vitest";
import type { ResearchWatchlistCandidate } from "@momentum/domain";

import { buildPaperRiskCycleFailureAlert, buildResearchCycleLog, createResearchSchedulerFromEnvironment, dedupeResearchCandidates } from "./research-scheduler-runtime.js";

describe("research scheduler startup composition", () => {
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
});
