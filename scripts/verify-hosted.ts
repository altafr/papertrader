import { fileURLToPath } from "node:url";

import { evaluatePaperRuntime } from "./paper-runtime-contract.js";
import { readHealthWithRetry } from "./verify-paper-runtime.js";
import { verifyPublicSurface } from "./verify-public-surface.js";

export function getFailedRuntimeGates(runtime: ReturnType<typeof evaluatePaperRuntime>): readonly string[] {
  const checks = [
    ["api", runtime.api === "healthy"],
    ["worker", runtime.worker === "healthy"],
    ["paper_mode", runtime.paperMode],
    ["order_submission_approval", runtime.orderSubmissionApprovalPresent],
    ["market_stream", runtime.marketStream === "connected"],
    ["market_stream_freshness", runtime.marketStreamFreshnessValid],
    ["position_management", runtime.positionManagement === "ready"],
    ["research_schedule", runtime.researchSchedule === "scheduled"],
    ["durable_scheduler", runtime.durableScheduler === "scheduled"],
    ["release_match", runtime.releaseMatches],
    ["api_release_match", runtime.apiReleaseMatches],
    ["kill_switch", runtime.killSwitchInactive],
    ["health_timestamps", runtime.healthTimestampsValid],
    ["next_runs", runtime.nextRunsFuture],
    ["risk_telemetry", runtime.riskTelemetryValid],
    ["worker_heartbeat", runtime.workerHeartbeatValid],
  ] as const;
  const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
  return runtime.unmanagedPositionCount !== undefined && runtime.unmanagedPositionCount > 0
    ? [...failed, "unmanaged_positions"]
    : failed;
}

export async function verifyHosted(fetcher: typeof fetch, workerUrl: string, apiUrl: string, webUrl: string, expectedRelease?: string) {
  const verifyWebWithRetry = async () => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try { return await verifyPublicSurface(fetcher, webUrl); } catch (error) { lastError = error; }
    }
    throw lastError instanceof Error ? lastError : new Error("public_surface_check_failed");
  };
  const [worker, api, web] = await Promise.all([
    readHealthWithRetry(fetcher, workerUrl, 4, 250),
    readHealthWithRetry(fetcher, apiUrl, 4, 250),
    verifyWebWithRetry(),
  ]);
  const runtime = evaluatePaperRuntime(worker, api, expectedRelease);
  if (!runtime.verified) {
    const failedGates = getFailedRuntimeGates(runtime);
    throw new Error(`hosted_runtime_contract_failed:${failedGates.join(",") || "unknown"}`);
  }
  return { runtime, web };
}

export async function main() {
  const workerUrl = process.env.PAPERTRADER_WORKER_HEALTH_URL?.trim();
  const apiUrl = process.env.PAPERTRADER_API_HEALTH_URL?.trim();
  const webUrl = process.env.PAPERTRADER_WEB_URL?.trim();
  if (!workerUrl || !apiUrl || !webUrl) throw new Error("PAPERTRADER_WORKER_HEALTH_URL, PAPERTRADER_API_HEALTH_URL, and PAPERTRADER_WEB_URL are required.");
  console.log(JSON.stringify(await verifyHosted(fetch, workerUrl, apiUrl, webUrl, process.env.PAPERTRADER_EXPECTED_RELEASE?.trim() || undefined)));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "hosted_verification_failed"); process.exitCode = 1; });
