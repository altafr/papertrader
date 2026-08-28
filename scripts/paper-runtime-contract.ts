export type HealthObject = Record<string, unknown>;

export function evaluatePaperRuntime(worker: HealthObject, api: HealthObject) {
  const marketStream = worker.marketStream;
  const positionManagement = worker.positionManagement;
  const researchSchedule = worker.researchSchedule;
  const durableScheduler = worker.durableScheduler;
  const streamConnected = typeof marketStream === "object" && marketStream !== null && !Array.isArray(marketStream) && (marketStream as HealthObject).status === "connected";
  const positionsReady = typeof positionManagement === "object" && positionManagement !== null && !Array.isArray(positionManagement) && (positionManagement as HealthObject).status === "ready";
  const researchScheduled = typeof researchSchedule === "object" && researchSchedule !== null && !Array.isArray(researchSchedule)
    && (researchSchedule as HealthObject).enabled === true
    && (researchSchedule as HealthObject).handlerEnabled === true
    && (researchSchedule as HealthObject).status === "scheduled"
    && typeof (researchSchedule as HealthObject).nextRunAt === "string";
  const durableScheduled = typeof durableScheduler === "object" && durableScheduler !== null && !Array.isArray(durableScheduler)
    && (durableScheduler as HealthObject).enabled === true
    && (durableScheduler as HealthObject).status === "scheduled"
    && typeof (durableScheduler as HealthObject).nextRunAt === "string";
  const result = {
    api: api.status === "healthy" ? "healthy" : "degraded",
    worker: worker.status === "healthy" ? "healthy" : "degraded",
    alpaca: worker.alpaca === "configured" ? "configured" : "not_configured",
    database: worker.database === "configured" ? "configured" : "not_configured",
    paperMode: worker.operatingMode === "paper_autopilot",
    orderSubmissionEnabled: worker.paperAutopilotOrderSubmissionEnabled === true,
    marketStream: streamConnected ? "connected" : "not_connected",
    positionManagement: positionsReady ? "ready" : "not_ready",
    researchSchedule: researchScheduled ? "scheduled" : "not_scheduled",
    durableScheduler: durableScheduled ? "scheduled" : "not_scheduled",
  } as const;
  return { ...result, verified: result.api === "healthy" && result.worker === "healthy" && result.alpaca === "configured" && result.database === "configured" && result.paperMode && result.orderSubmissionEnabled && streamConnected && positionsReady && researchScheduled && durableScheduled };
}
