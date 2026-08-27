export type PositionManagementSchedulerStatus = "degraded" | "disabled" | "ready" | "running";

let status: PositionManagementSchedulerStatus = "disabled";
let lastRunAt: string | undefined;
let lastError: string | undefined;

export function getPositionManagementHealth() { return { lastError, lastRunAt, status }; }

/** Schedule deterministic position-management passes without overlapping broker operations. */
export function createPositionManagementScheduler(input: { readonly intervalSeconds: number; readonly run: () => Promise<void> }) {
  if (!Number.isSafeInteger(input.intervalSeconds) || input.intervalSeconds < 30 || input.intervalSeconds > 86_400) throw new Error("Position-management interval must be between 30 and 86400 seconds.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = true;
  let running = false;
  const schedule = () => { if (!stopped) timer = setTimeout(() => { void execute().finally(schedule); }, input.intervalSeconds * 1000); };
  const execute = async () => {
    if (stopped || running) return;
    running = true; status = "running";
    try { await input.run(); lastRunAt = new Date().toISOString(); lastError = undefined; status = "ready"; }
    catch (error) { lastError = error instanceof Error ? error.message : "position_management_failed"; status = "degraded"; }
    finally { running = false; }
  };
  return {
    start() { if (!stopped) return; stopped = false; status = "ready"; void execute().finally(schedule); },
    async stop() { stopped = true; if (timer) clearTimeout(timer); timer = undefined; status = "disabled"; },
    status: getPositionManagementHealth,
  };
}
