import { describe, expect, it } from "vitest";
import { validatePaperE2ERunOnce } from "./paper-e2e-run-once.js";

const base = {
  BROKER_CONNECTION_ENABLED: "true",
  DATABASE_URL: "postgresql://redacted",
  PAPER_E2E_APPROVAL_REFERENCE: "PAPER-E2E-001",
  PAPER_E2E_RUN_ONCE: "true",
};

describe("validatePaperE2ERunOnce", () => {
  it("defaults to a bounded stock research evidence run", () => {
    expect(validatePaperE2ERunOnce(base)).toMatchObject({ agentType: "stock_research", symbols: ["AAPL", "MSFT"], timeframe: "1Day" });
  });

  it("fails closed when autopilot is enabled", () => {
    expect(() => validatePaperE2ERunOnce({ ...base, PAPER_AUTOPILOT_ENABLED: "true" })).toThrow(/must not run/);
  });

  it("rejects an unbounded approval reference", () => {
    expect(() => validatePaperE2ERunOnce({ ...base, PAPER_E2E_APPROVAL_REFERENCE: "contains spaces" })).toThrow(/bounded/);
  });
});
