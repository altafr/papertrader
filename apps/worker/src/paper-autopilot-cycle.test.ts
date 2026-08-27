import { describe, expect, it } from "vitest";

import { selectPaperAutopilotCandidates } from "./paper-autopilot-cycle.js";

describe("paper autopilot candidate bound", () => {
  const candidates = Array.from({ length: 12 }, (_, index) => `candidate-${index + 1}`);

  it("limits broker-enabled cycles to one candidate", () => {
    expect(selectPaperAutopilotCandidates(candidates, true)).toEqual(["candidate-1"]);
  });

  it("keeps dry-run visibility bounded at ten candidates", () => {
    expect(selectPaperAutopilotCandidates(candidates, false)).toHaveLength(10);
  });
});
