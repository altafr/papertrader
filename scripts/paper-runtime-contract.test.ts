import { describe, expect, it } from "vitest";
import { evaluatePaperRuntime } from "./paper-runtime-contract.js";

const healthyWorker = { status: "healthy", operatingMode: "paper_autopilot", paperAutopilotOrderSubmissionEnabled: true, marketStream: { status: "connected" }, positionManagement: { status: "ready" } };

describe("paper runtime contract", () => {
  it("accepts a healthy autonomous paper runtime", () => {
    expect(evaluatePaperRuntime(healthyWorker, { status: "healthy" })).toMatchObject({ verified: true, marketStream: "connected", positionManagement: "ready" });
  });

  it("fails closed when any execution prerequisite is missing", () => {
    expect(evaluatePaperRuntime({ ...healthyWorker, paperAutopilotOrderSubmissionEnabled: false }, { status: "healthy" }).verified).toBe(false);
    expect(evaluatePaperRuntime(healthyWorker, { status: "degraded" }).verified).toBe(false);
  });
});
