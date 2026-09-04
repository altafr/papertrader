import { describe, expect, it } from "vitest";
import { diagnoseTechSolverError } from "./tech-solver.js";

describe("tech_solver", () => {
  it("classifies provider entitlement failures for durable review", () => {
    expect(diagnoseTechSolverError(new Error("Paper exit submission failed with HTTP 403 (crypto_order_entitlement_blocked)."))).toMatchObject({ category: "broker_entitlement", fingerprint: "broker_entitlement_blocked", status: "manual_review" });
  });

  it("redacts secrets and keeps unknown remediation fail-closed", () => {
    const result = diagnoseTechSolverError(new Error("fetch failed api_key=secret-value"));
    expect(result.problem).not.toContain("secret-value");
    expect(result.status).toBe("open");
  });
});
