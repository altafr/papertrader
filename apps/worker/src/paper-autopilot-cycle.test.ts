import { describe, expect, it } from "vitest";

import { selectPaperAutopilotCandidates, shouldNotifyPaperRiskDecision } from "./paper-autopilot-cycle.js";

describe("paper autopilot candidate bound", () => {
  const candidates = Array.from({ length: 12 }, (_, index) => `candidate-${index + 1}`);

  it("limits broker-enabled cycles to one candidate", () => {
    expect(selectPaperAutopilotCandidates(candidates, true)).toEqual(["candidate-1"]);
  });

  it("keeps dry-run visibility bounded at ten candidates", () => {
    expect(selectPaperAutopilotCandidates(candidates, false)).toHaveLength(10);
  });
});

describe("paper risk notification policy", () => {
  it("notifies selected approvals but keeps rejected decisions in the audit log only", () => {
    expect(shouldNotifyPaperRiskDecision("approved")).toBe(true);
    expect(shouldNotifyPaperRiskDecision("rejected")).toBe(false);
  });
});
