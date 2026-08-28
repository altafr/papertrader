type JsonObject = Record<string, unknown>;

import { evaluatePaperRuntime } from "./paper-runtime-contract.js";

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
const expectedRelease = process.env.PAPERTRADER_EXPECTED_RELEASE?.trim() || undefined;
const result = evaluatePaperRuntime(worker, api, expectedRelease);
console.log(JSON.stringify(result));
if (!result.verified) process.exitCode = 1;
