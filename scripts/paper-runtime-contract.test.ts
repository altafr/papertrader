import { describe, expect, it } from "vitest";
import { evaluatePaperRuntime } from "./paper-runtime-contract.js";

const healthyWorker = { status: "healthy", asOf: "2026-08-28T14:44:00.000Z", alpaca: "configured", database: "configured", operatingMode: "paper_autopilot", paperAutopilotOrderSubmissionEnabled: true, paperAutopilotOrderSubmissionApprovalReferencePresent: true, globalKillSwitchActive: false, marketStream: { status: "connected" }, positionManagement: { status: "ready", blockedReasons: [] }, researchSchedule: { enabled: true, handlerEnabled: true, status: "scheduled", nextRunAt: "2026-08-28T14:45:00.000Z" }, durableScheduler: { enabled: true, status: "scheduled", nextRunAt: "2026-08-29T00:00:00.000Z" } };

describe("paper runtime contract", () => {
  it("accepts a healthy autonomous paper runtime", () => {
    expect(evaluatePaperRuntime(healthyWorker, { status: "healthy" })).toMatchObject({ verified: true, alpaca: "configured", database: "configured", marketStream: "connected", positionManagement: "ready", researchSchedule: "scheduled", durableScheduler: "scheduled" });
  });

  it("fails closed when any execution prerequisite is missing", () => {
    expect(evaluatePaperRuntime({ ...healthyWorker, paperAutopilotOrderSubmissionEnabled: false }, { status: "healthy" }).verified).toBe(false);
    expect(evaluatePaperRuntime(healthyWorker, { status: "degraded" }).verified).toBe(false);
    expect(evaluatePaperRuntime({ ...healthyWorker, alpaca: "not_configured" }, { status: "healthy" }).verified).toBe(false);
    expect(evaluatePaperRuntime({ ...healthyWorker, database: "not_configured" }, { status: "healthy" }).verified).toBe(false);
    expect(evaluatePaperRuntime(healthyWorker, { status: "healthy" }, "different-release").verified).toBe(false);
    expect(evaluatePaperRuntime(healthyWorker, { status: "healthy" }, "2026-08-28T14:45:00.000Z").verified).toBe(false);
    expect(evaluatePaperRuntime({ ...healthyWorker, researchSchedule: { ...healthyWorker.researchSchedule, status: "degraded" } }, { status: "healthy" }).verified).toBe(false);
    expect(evaluatePaperRuntime({ ...healthyWorker, durableScheduler: { ...healthyWorker.durableScheduler, nextRunAt: undefined } }, { status: "healthy" }).verified).toBe(false);
    expect(evaluatePaperRuntime({ ...healthyWorker, globalKillSwitchActive: true }, { status: "healthy" }).verified).toBe(false);
    expect(evaluatePaperRuntime({ ...healthyWorker, positionManagement: { status: "ready", blockedReasons: ["stale_data"] } }, { status: "healthy" }).verified).toBe(false);
    expect(evaluatePaperRuntime({ ...healthyWorker, paperAutopilotOrderSubmissionApprovalReferencePresent: false }, { status: "healthy" }).verified).toBe(false);
    expect(evaluatePaperRuntime({ ...healthyWorker, asOf: "not-a-date" }, { status: "healthy" }).verified).toBe(false);
  });
});
