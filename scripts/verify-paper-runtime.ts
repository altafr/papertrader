type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readHealth(url: string): Promise<JsonObject> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  const body: unknown = await response.json();
  if (!response.ok || !isObject(body)) throw new Error(`health_check_failed:${response.status}`);
  return body;
}

const workerUrl = process.env.PAPERTRADER_WORKER_HEALTH_URL?.trim();
const apiUrl = process.env.PAPERTRADER_API_HEALTH_URL?.trim();
if (!workerUrl || !apiUrl) throw new Error("PAPERTRADER_WORKER_HEALTH_URL and PAPERTRADER_API_HEALTH_URL are required.");

const [worker, api] = await Promise.all([readHealth(workerUrl), readHealth(apiUrl)]);
const workerHealthy = worker.status === "healthy";
const apiHealthy = api.status === "healthy";
const paperMode = worker.operatingMode === "paper_autopilot";
const stream = isObject(worker.marketStream) && worker.marketStream.status === "connected";
const positionManagement = isObject(worker.positionManagement) && worker.positionManagement.status === "ready";
const submission = worker.paperAutopilotOrderSubmissionEnabled === true;

const result = {
  api: apiHealthy ? "healthy" : "degraded",
  worker: workerHealthy ? "healthy" : "degraded",
  paperMode,
  orderSubmissionEnabled: submission,
  marketStream: stream ? "connected" : "not_connected",
  positionManagement: positionManagement ? "ready" : "not_ready",
  verified: workerHealthy && apiHealthy && paperMode && submission && stream && positionManagement,
};
console.log(JSON.stringify(result));
if (!result.verified) process.exitCode = 1;
