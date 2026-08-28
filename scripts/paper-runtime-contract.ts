export type HealthObject = Record<string, unknown>;

function validTimestamp(value: unknown): boolean {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function evaluatePaperRuntime(worker: HealthObject, api: HealthObject, expectedRelease?: string) {
  const marketStream = worker.marketStream;
  const positionManagement = worker.positionManagement;
  const researchSchedule = worker.researchSchedule;
  const durableScheduler = worker.durableScheduler;
  const healthTimestampsValid = validTimestamp(worker.asOf)
    && validTimestamp((researchSchedule as HealthObject | undefined)?.nextRunAt)
    && validTimestamp((durableScheduler as HealthObject | undefined)?.nextRunAt);
  const streamConnected = typeof marketStream === "object" && marketStream !== null && !Array.isArray(marketStream) && (marketStream as HealthObject).status === "connected";
  const positionsReady = typeof positionManagement === "object" && positionManagement !== null && !Array.isArray(positionManagement) && (positionManagement as HealthObject).status === "ready";
  const positionsUnblocked = positionsReady && (!Array.isArray((positionManagement as HealthObject).blockedReasons) || ((positionManagement as HealthObject).blockedReasons as unknown[]).length === 0);
  const researchScheduled = typeof researchSchedule === "object" && researchSchedule !== null && !Array.isArray(researchSchedule)
    && (researchSchedule as HealthObject).enabled === true
    && (researchSchedule as HealthObject).handlerEnabled === true
    && (researchSchedule as HealthObject).status === "scheduled"
    && typeof (researchSchedule as HealthObject).nextRunAt === "string";
  const durableScheduled = typeof durableScheduler === "object" && durableScheduler !== null && !Array.isArray(durableScheduler)
    && (durableScheduler as HealthObject).enabled === true
    && (durableScheduler as HealthObject).status === "scheduled"
    && typeof (durableScheduler as HealthObject).nextRunAt === "string";
  const releaseMatches = expectedRelease === undefined || worker.release === expectedRelease;
  const researchObject = researchSchedule as HealthObject | undefined;
  const riskTelemetryPresent = researchObject?.lastRiskCycleStatus !== undefined || researchObject?.lastRiskDecisionCount !== undefined || researchObject?.lastRiskApprovedCount !== undefined;
  const riskTelemetryValid = !riskTelemetryPresent || (
    (researchObject?.lastRiskCycleStatus === "completed" || researchObject?.lastRiskCycleStatus === "failed")
    && typeof researchObject.lastRiskCycleAt === "string"
    && validTimestamp(researchObject.lastRiskCycleAt)
    && typeof researchObject.lastRiskDecisionCount === "number"
    && Number.isSafeInteger(researchObject.lastRiskDecisionCount)
    && researchObject.lastRiskDecisionCount >= 0
    && researchObject.lastRiskDecisionCount <= 100
    && typeof researchObject.lastRiskApprovedCount === "number"
    && Number.isSafeInteger(researchObject.lastRiskApprovedCount)
    && researchObject.lastRiskApprovedCount >= 0
    && researchObject.lastRiskApprovedCount <= researchObject.lastRiskDecisionCount
  );
  const result = {
    api: api.status === "healthy" ? "healthy" : "degraded",
    worker: worker.status === "healthy" ? "healthy" : "degraded",
    alpaca: worker.alpaca === "configured" ? "configured" : "not_configured",
    database: worker.database === "configured" ? "configured" : "not_configured",
    paperMode: worker.operatingMode === "paper_autopilot",
    orderSubmissionEnabled: worker.paperAutopilotOrderSubmissionEnabled === true,
    orderSubmissionApprovalPresent: worker.paperAutopilotOrderSubmissionApprovalReferencePresent === true,
    marketStream: streamConnected ? "connected" : "not_connected",
    positionManagement: positionsReady ? "ready" : "not_ready",
    researchSchedule: researchScheduled ? "scheduled" : "not_scheduled",
    durableScheduler: durableScheduled ? "scheduled" : "not_scheduled",
    release: typeof worker.release === "string" ? worker.release : "not_reported",
    releaseMatches,
    killSwitchInactive: worker.globalKillSwitchActive === false,
    healthTimestampsValid,
    riskTelemetryValid,
  } as const;
  return { ...result, verified: result.api === "healthy" && result.worker === "healthy" && result.alpaca === "configured" && result.database === "configured" && result.paperMode && result.orderSubmissionEnabled && result.orderSubmissionApprovalPresent && streamConnected && positionsReady && positionsUnblocked && researchScheduled && durableScheduled && releaseMatches && result.killSwitchInactive && result.healthTimestampsValid && result.riskTelemetryValid };
}
