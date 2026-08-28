type JsonObject = Record<string, unknown>;
import { fileURLToPath } from "node:url";

import { evaluatePaperRuntime } from "./paper-runtime-contract.js";

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readHealthWithRetry(fetcher: typeof fetch, url: string, attempts = 4, delayMs = 1_000): Promise<JsonObject> {
  let lastError = "health_check_failed";
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetcher(url, { headers: { accept: "application/json" } });
      const body: unknown = await response.json();
      if (response.ok && isObject(body)) return body;
      lastError = `health_check_failed:${response.status}`;
    } catch {
      lastError = "health_check_unreachable";
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(lastError);
}

export async function main() {
  const workerUrl = process.env.PAPERTRADER_WORKER_HEALTH_URL?.trim();
  const apiUrl = process.env.PAPERTRADER_API_HEALTH_URL?.trim();
  if (!workerUrl || !apiUrl) throw new Error("PAPERTRADER_WORKER_HEALTH_URL and PAPERTRADER_API_HEALTH_URL are required.");
  const [worker, api] = await Promise.all([readHealthWithRetry(fetch, workerUrl), readHealthWithRetry(fetch, apiUrl)]);
  const expectedRelease = process.env.PAPERTRADER_EXPECTED_RELEASE?.trim() || undefined;
  const result = evaluatePaperRuntime(worker, api, expectedRelease);
  console.log(JSON.stringify(result));
  if (!result.verified) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "paper_runtime_verification_failed"); process.exitCode = 1; });
