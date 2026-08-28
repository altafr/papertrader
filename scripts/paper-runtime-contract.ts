export type HealthObject = Record<string, unknown>;

export function evaluatePaperRuntime(worker: HealthObject, api: HealthObject) {
  const marketStream = worker.marketStream;
  const positionManagement = worker.positionManagement;
  const streamConnected = typeof marketStream === "object" && marketStream !== null && !Array.isArray(marketStream) && (marketStream as HealthObject).status === "connected";
  const positionsReady = typeof positionManagement === "object" && positionManagement !== null && !Array.isArray(positionManagement) && (positionManagement as HealthObject).status === "ready";
  const result = {
    api: api.status === "healthy" ? "healthy" : "degraded",
    worker: worker.status === "healthy" ? "healthy" : "degraded",
    paperMode: worker.operatingMode === "paper_autopilot",
    orderSubmissionEnabled: worker.paperAutopilotOrderSubmissionEnabled === true,
    marketStream: streamConnected ? "connected" : "not_connected",
    positionManagement: positionsReady ? "ready" : "not_ready",
  } as const;
  return { ...result, verified: result.api === "healthy" && result.worker === "healthy" && result.paperMode && result.orderSubmissionEnabled && streamConnected && positionsReady };
}
