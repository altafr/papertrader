import { fileURLToPath } from "node:url";

import { evaluatePaperRuntime } from "./paper-runtime-contract.js";
import { readHealthWithRetry } from "./verify-paper-runtime.js";
import { verifyPublicSurface } from "./verify-public-surface.js";

export async function verifyHosted(fetcher: typeof fetch, workerUrl: string, apiUrl: string, webUrl: string) {
  const [worker, api, web] = await Promise.all([
    readHealthWithRetry(fetcher, workerUrl, 2, 0),
    readHealthWithRetry(fetcher, apiUrl, 2, 0),
    verifyPublicSurface(fetcher, webUrl),
  ]);
  const runtime = evaluatePaperRuntime(worker, api);
  if (!runtime.verified) throw new Error("hosted_runtime_contract_failed");
  return { runtime, web };
}

export async function main() {
  const workerUrl = process.env.PAPERTRADER_WORKER_HEALTH_URL?.trim();
  const apiUrl = process.env.PAPERTRADER_API_HEALTH_URL?.trim();
  const webUrl = process.env.PAPERTRADER_WEB_URL?.trim();
  if (!workerUrl || !apiUrl || !webUrl) throw new Error("PAPERTRADER_WORKER_HEALTH_URL, PAPERTRADER_API_HEALTH_URL, and PAPERTRADER_WEB_URL are required.");
  console.log(JSON.stringify(await verifyHosted(fetch, workerUrl, apiUrl, webUrl)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "hosted_verification_failed"); process.exitCode = 1; });
