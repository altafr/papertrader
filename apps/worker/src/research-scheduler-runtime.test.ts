import { describe, expect, it } from "vitest";

import { buildPaperRiskCycleFailureAlert, createResearchSchedulerFromEnvironment } from "./research-scheduler-runtime.js";

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
});
