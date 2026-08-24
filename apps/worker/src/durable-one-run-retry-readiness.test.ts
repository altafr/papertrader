import { describe, expect, it } from "vitest";
import { assessDurableOneRunRetryReadiness } from "./durable-one-run-retry-readiness.js";

describe("durable one-run retry readiness", () => {
  it("allows a bounded, unused approval reference and run ID", () => {
    expect(assessDurableOneRunRetryReadiness({ approvalReference: "PAPER-RECONCILIATION-RETRY-124", runId: "paper-reconciliation-retry-20260824-01", existingAudits: [] })).toMatchObject({ status: "ready", blockedReasons: [] });
  });

  it("blocks reuse of either audit identifier", () => {
    const result = assessDurableOneRunRetryReadiness({ approvalReference: "PAPER-RECONCILIATION-RETRY-123", runId: "paper-reconciliation-retry-20260823-01", existingAudits: [{ approvalReference: "PAPER-RECONCILIATION-RETRY-123", runId: "paper-reconciliation-retry-20260823-01" }] });
    expect(result).toMatchObject({ existingApprovalReference: true, existingRunId: true, status: "blocked" });
    expect(result.blockedReasons).toEqual(expect.arrayContaining(["approval_reference_already_used", "run_id_already_used"]));
  });
});
