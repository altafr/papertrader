import { describe, expect, it } from "vitest";
import { diagnoseTechSolverError } from "./tech-solver.js";

describe("tech_solver", () => {
  it("classifies provider entitlement failures for durable review", () => {
    expect(diagnoseTechSolverError(new Error("Paper exit submission failed with HTTP 403 (crypto_order_entitlement_blocked)."))).toMatchObject({ category: "broker_entitlement", fingerprint: "broker_entitlement_blocked", status: "manual_review" });
  });

  it("keeps generic crypto restrictions distinct from entitlement failures", () => {
    expect(diagnoseTechSolverError(new Error("Paper exit submission failed with HTTP 403 (crypto_order_restricted)."))).toMatchObject({ category: "broker_crypto_restriction", fingerprint: "broker_crypto_restriction", status: "manual_review" });
  });

  it("redacts provider request details only through the bounded diagnosis", () => {
    const diagnosis = diagnoseTechSolverError(new Error("Paper exit submission failed with HTTP 403 (crypto_order_entitlement_blocked) request_id=abc-123."));
    expect(diagnosis.problem).toBe("Paper exit submission failed with HTTP 403  crypto_order_entitlement_blocked  request_id abc-123.");
    expect(diagnosis.problem.length).toBeLessThanOrEqual(240);
  });

  it("redacts secrets and keeps unknown remediation fail-closed", () => {
    const result = diagnoseTechSolverError(new Error("fetch failed api_key=secret-value"));
    expect(result.problem).not.toContain("secret-value");
    expect(result.status).toBe("open");
  });
});
