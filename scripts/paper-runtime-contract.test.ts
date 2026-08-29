import { describe, expect, it } from "vitest";
import { evaluatePaperRuntime, validateWorkerHeartbeat } from "./paper-runtime-contract.js";

const healthyWorker = { status: "healthy", asOf: "2026-08-28T14:44:00.000Z", alpaca: "configured", database: "configured", operatingMode: "paper_autopilot", paperAutopilotOrderSubmissionEnabled: true, paperAutopilotOrderSubmissionApprovalReferencePresent: true, globalKillSwitchActive: false, marketStream: { status: "connected" }, positionManagement: { status: "ready", blockedReasons: [] }, researchSchedule: { enabled: true, handlerEnabled: true, status: "scheduled", nextRunAt: "2026-08-28T14:45:00.000Z" }, durableScheduler: { enabled: true, status: "scheduled", nextRunAt: "2026-08-29T00:00:00.000Z" } };

describe("paper runtime contract", () => {
  it("accepts bounded heartbeat telemetry", () => {
    expect(validateWorkerHeartbeat({ ...healthyWorker, marketStream: { status: "connected", freshness: "fresh", lastMessageAt: "2026-08-28T14:44:00.000Z", freshnessMaxAgeSeconds: 120 }, positionManagement: { status: "ready", unmanagedCount: 0 }, researchSchedule: { ...healthyWorker.researchSchedule, lastRunAt: "2026-08-28T14:40:00.000Z", lastCatchupAt: "2026-08-28T14:41:00.000Z", lastCatchupJobId: "job-1", lastCatchupStatus: "queued", lastRiskCycleAt: "2026-08-28T14:42:00.000Z", lastRiskCycleStatus: "completed", lastRiskDecisionCount: 4, lastRiskApprovedCount: 2 } })).toBe(true);
  });

  it("rejects malformed or unsafe heartbeat telemetry", () => {
    expect(validateWorkerHeartbeat({ ...healthyWorker, researchSchedule: { ...healthyWorker.researchSchedule, lastCatchupAt: "invalid" } })).toBe(false);
    expect(validateWorkerHeartbeat({ ...healthyWorker, positionManagement: { status: "ready", unmanagedCount: 101 } })).toBe(false);
    expect(validateWorkerHeartbeat({ ...healthyWorker, marketStream: { status: "connected", freshness: "broken" } })).toBe(false);
  });

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

  it("pins both API and Worker releases when an expected release is supplied", () => {
    const pinned = { ...healthyWorker, release: "release-1" };
    expect(evaluatePaperRuntime(pinned, { status: "healthy", release: "release-1" }, "release-1")).toMatchObject({ apiReleaseMatches: true, releaseMatches: true, verified: true });
    expect(evaluatePaperRuntime(pinned, { status: "healthy", release: "older" }, "release-1")).toMatchObject({ apiReleaseMatches: false, verified: false });
  });

  it("validates risk-cycle telemetry when the scheduler has reported it", () => {
    const withTelemetry = { ...healthyWorker, researchSchedule: { ...healthyWorker.researchSchedule, lastRiskApprovedCount: 1, lastRiskCycleAt: "2026-08-28T14:44:10.000Z", lastRiskCycleStatus: "completed", lastRiskDecisionCount: 2 } };
    expect(evaluatePaperRuntime(withTelemetry, { status: "healthy" })).toMatchObject({ riskTelemetryValid: true, verified: true });
    expect(evaluatePaperRuntime({ ...withTelemetry, researchSchedule: { ...withTelemetry.researchSchedule, lastRiskApprovedCount: 3 } }, { status: "healthy" }).verified).toBe(false);
    expect(evaluatePaperRuntime({ ...withTelemetry, researchSchedule: { ...withTelemetry.researchSchedule, lastRiskCycleAt: "invalid" } }, { status: "healthy" }).verified).toBe(false);
  });

  it("fails when a scheduler reports a next run materially before its health timestamp", () => {
    const stale = { ...healthyWorker, researchSchedule: { ...healthyWorker.researchSchedule, nextRunAt: "2026-08-28T10:00:00.000Z" } };
    expect(evaluatePaperRuntime(stale, { status: "healthy" })).toMatchObject({ nextRunsFuture: false, verified: false });
  });

  it("fails closed when the market stream reports stale data", () => {
    expect(evaluatePaperRuntime({ ...healthyWorker, marketStream: { freshness: "stale", status: "connected" } }, { status: "healthy" })).toMatchObject({ marketStreamFreshnessValid: false, verified: false });
    expect(evaluatePaperRuntime({ ...healthyWorker, marketStream: { freshness: "fresh", status: "connected" } }, { status: "healthy" })).toMatchObject({ marketStreamFreshnessValid: true, verified: true });
  });
});
