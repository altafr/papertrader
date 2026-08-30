export type HealthObject = Record<string, unknown>;

function validTimestamp(value: unknown): boolean {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function boundedCount(value: unknown): boolean {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 100;
}

/** Validate optional heartbeat telemetry without requiring older releases to emit it. */
export function validateWorkerHeartbeat(worker: HealthObject): boolean {
  const research = worker.researchSchedule;
  const positions = worker.positionManagement;
  const stream = worker.marketStream;
  if (research !== undefined && (typeof research !== "object" || research === null || Array.isArray(research))) return false;
  if (positions !== undefined && (typeof positions !== "object" || positions === null || Array.isArray(positions))) return false;
  if (stream !== undefined && (typeof stream !== "object" || stream === null || Array.isArray(stream))) return false;
  const researchObject = research as HealthObject | undefined;
  const positionObject = positions as HealthObject | undefined;
  const streamObject = stream as HealthObject | undefined;
  for (const key of ["lastRunAt", "nextRunAt", "lastRiskCycleAt", "lastCatchupAt"] as const) {
    if (researchObject?.[key] !== undefined && !validTimestamp(researchObject[key])) return false;
  }
  if (researchObject?.lastCatchupStatus !== undefined && researchObject.lastCatchupStatus !== "queued" && researchObject.lastCatchupStatus !== "rejected") return false;
  if (researchObject?.lastCatchupJobId !== undefined && typeof researchObject.lastCatchupJobId !== "string") return false;
  if (researchObject?.lastRiskCycleStatus !== undefined && researchObject.lastRiskCycleStatus !== "completed" && researchObject.lastRiskCycleStatus !== "failed") return false;
  for (const key of ["lastRiskDecisionCount", "lastRiskApprovedCount"] as const) {
    if (researchObject?.[key] !== undefined && !boundedCount(researchObject[key])) return false;
  }
  if (researchObject?.lastRiskApprovedCount !== undefined && researchObject.lastRiskDecisionCount !== undefined && researchObject.lastRiskApprovedCount > researchObject.lastRiskDecisionCount) return false;
  if (positionObject?.unmanagedCount !== undefined && !boundedCount(positionObject.unmanagedCount)) return false;
  if (streamObject?.lastMessageAt !== undefined && !validTimestamp(streamObject.lastMessageAt)) return false;
  if (streamObject?.freshnessMaxAgeSeconds !== undefined && (typeof streamObject.freshnessMaxAgeSeconds !== "number" || !Number.isSafeInteger(streamObject.freshnessMaxAgeSeconds) || streamObject.freshnessMaxAgeSeconds < 0 || streamObject.freshnessMaxAgeSeconds > 86_400)) return false;
  if (streamObject?.freshness !== undefined && streamObject.freshness !== "fresh" && streamObject.freshness !== "stale" && streamObject.freshness !== "unknown") return false;
  return true;
}

export function evaluatePaperRuntime(worker: HealthObject, api: HealthObject, expectedRelease?: string) {
  const marketStream = worker.marketStream;
  const positionManagement = worker.positionManagement;
  const researchSchedule = worker.researchSchedule;
  const durableScheduler = worker.durableScheduler;
  const healthTimestampsValid = validTimestamp(worker.asOf)
    && validTimestamp((researchSchedule as HealthObject | undefined)?.nextRunAt)
    && validTimestamp((durableScheduler as HealthObject | undefined)?.nextRunAt);
  const healthTime = Date.parse(String(worker.asOf));
  const nextRunsFuture = healthTimestampsValid
    && Number.isFinite(healthTime)
    && Date.parse(String((researchSchedule as HealthObject).nextRunAt)) >= healthTime - 120_000
    && Date.parse(String((durableScheduler as HealthObject).nextRunAt)) >= healthTime - 120_000;
  const streamConnected = typeof marketStream === "object" && marketStream !== null && !Array.isArray(marketStream) && (marketStream as HealthObject).status === "connected";
  const streamFreshness = typeof marketStream === "object" && marketStream !== null && !Array.isArray(marketStream) ? (marketStream as HealthObject).freshness : undefined;
  const marketStreamFreshnessValid = streamFreshness === undefined || streamFreshness === "fresh";
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
  const apiReleaseMatches = expectedRelease === undefined || api.release === expectedRelease;
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
  const workerHeartbeatValid = validateWorkerHeartbeat(worker);
  const unmanagedPositionCount = typeof positionManagement === "object" && positionManagement !== null && !Array.isArray(positionManagement)
    && boundedCount((positionManagement as HealthObject).unmanagedCount)
    ? (positionManagement as HealthObject).unmanagedCount as number
    : undefined;
  const result = {
    api: api.status === "healthy" ? "healthy" : "degraded",
    worker: worker.status === "healthy" ? "healthy" : "degraded",
    alpaca: worker.alpaca === "configured" ? "configured" : "not_configured",
    database: worker.database === "configured" ? "configured" : "not_configured",
    paperMode: worker.operatingMode === "paper_autopilot",
    orderSubmissionEnabled: worker.paperAutopilotOrderSubmissionEnabled === true,
    orderSubmissionApprovalPresent: worker.paperAutopilotOrderSubmissionApprovalReferencePresent === true,
    marketStream: streamConnected ? "connected" : "not_connected",
    marketStreamFreshnessValid,
    positionManagement: positionsReady ? "ready" : "not_ready",
    ...(unmanagedPositionCount === undefined ? {} : { unmanagedPositionCount }),
    researchSchedule: researchScheduled ? "scheduled" : "not_scheduled",
    durableScheduler: durableScheduled ? "scheduled" : "not_scheduled",
    release: typeof worker.release === "string" ? worker.release : "not_reported",
    releaseMatches,
    apiReleaseMatches,
    killSwitchInactive: worker.globalKillSwitchActive === false,
    healthTimestampsValid,
    nextRunsFuture,
    riskTelemetryValid,
    workerHeartbeatValid,
  } as const;
  return { ...result, verified: result.api === "healthy" && result.worker === "healthy" && result.alpaca === "configured" && result.database === "configured" && result.paperMode && result.orderSubmissionEnabled && result.orderSubmissionApprovalPresent && streamConnected && marketStreamFreshnessValid && positionsReady && positionsUnblocked && researchScheduled && durableScheduled && releaseMatches && apiReleaseMatches && result.killSwitchInactive && result.healthTimestampsValid && result.nextRunsFuture && result.riskTelemetryValid && result.workerHeartbeatValid };
}
