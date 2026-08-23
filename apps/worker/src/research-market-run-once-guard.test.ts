import { describe, expect, it } from "vitest";

import { validateResearchMarketRunOnce } from "./research-market-run-once-guard.js";

describe("research market one-run approval guard", () => {
  it("requires separate command-scoped approval and a bounded reference", () => {
    expect(() => validateResearchMarketRunOnce({ RESEARCH_MARKET_RUN_ONCE: "true" })).toThrow("OPERATOR_APPROVAL");
    expect(validateResearchMarketRunOnce({ RESEARCH_MARKET_RUN_ONCE: "true", RESEARCH_MARKET_OPERATOR_APPROVAL: "true", RESEARCH_MARKET_APPROVAL_REFERENCE: "ticket-2026-08-23" })).toEqual({ reference: "ticket-2026-08-23" });
  });

  it("rejects unsafe or oversized approval references", () => {
    expect(() => validateResearchMarketRunOnce({ RESEARCH_MARKET_RUN_ONCE: "true", RESEARCH_MARKET_OPERATOR_APPROVAL: "true", RESEARCH_MARKET_APPROVAL_REFERENCE: "secret value" })).toThrow("bounded");
    expect(() => validateResearchMarketRunOnce({ RESEARCH_MARKET_RUN_ONCE: "true", RESEARCH_MARKET_OPERATOR_APPROVAL: "true", RESEARCH_MARKET_APPROVAL_REFERENCE: "x".repeat(129) })).toThrow("bounded");
  });
});
