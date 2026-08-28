import { describe, expect, it } from "vitest";

import { buildRiskCycleStatus } from "./risk-cycle-status.js";

describe("risk cycle status", () => {
  it("returns bounded counters and safe latest metadata", () => {
    expect(buildRiskCycleStatus({ approved: 2, decisions: 4, latestAt: new Date("2026-08-29T00:00:00.000Z"), latestStatus: "risk_dry_run_approved" })).toEqual({ approved: 2, decisions: 4, latestAt: "2026-08-29T00:00:00.000Z", latestStatus: "risk_dry_run_approved" });
  });

  it("does not expose malformed values", () => {
    expect(buildRiskCycleStatus({ approved: -1, decisions: "bad", latestAt: "not-a-date", latestStatus: "message-content" })).toEqual({ approved: 0, decisions: 0, latestAt: null, latestStatus: null });
  });
});
