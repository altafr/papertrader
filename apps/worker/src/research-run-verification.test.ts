import { describe, expect, it } from "vitest";

import { selectLatestResearchRun, verifyResearchRun } from "./research-run-verification.js";

const run = { agentType: "stock_research", artifactType: "research_watchlist", inputRefs: ["alpaca-market:us_equity:2026-08-23T00:00:00.000Z", "operator-approval:ticket-123"], runId: "research-market-1", status: "succeeded" };

describe("research run verification", () => {
  it("returns bounded success metadata when provenance and artifact exist", () => {
    expect(verifyResearchRun(run, "ticket-123")).toEqual({ agentType: "stock_research", approvalReferencePresent: true, artifactPresent: true, runId: "research-market-1", status: "succeeded" });
  });

  it("fails closed for missing provenance, incomplete status, or artifact", () => {
    expect(() => verifyResearchRun({ ...run, inputRefs: [] }, "ticket-123")).toThrow("provenance");
    expect(() => verifyResearchRun({ ...run, status: "failed" }, "ticket-123")).toThrow("succeed");
    expect(() => verifyResearchRun({ ...run, artifactType: null }, "ticket-123")).toThrow("artifact");
  });

  it("selects the latest bounded run with matching approval provenance", () => {
    expect(selectLatestResearchRun([{ ...run, runId: "other", inputRefs: ["operator-approval:other"] }, run], "ticket-123").runId).toBe("research-market-1");
    expect(() => selectLatestResearchRun([{ ...run, inputRefs: [] }], "ticket-123")).toThrow("matching approval");
  });
});
