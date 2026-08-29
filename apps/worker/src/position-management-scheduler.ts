export type PositionManagementSchedulerStatus = "degraded" | "disabled" | "ready" | "running";

let status: PositionManagementSchedulerStatus = "disabled";
let lastRunAt: string | undefined;
let lastError: string | undefined;
let unmanagedCount: number | undefined;

export function getPositionManagementHealth() { return { lastError, lastRunAt, ...(unmanagedCount === undefined ? {} : { unmanagedCount }), status }; }

/** Record the bounded count of broker positions lacking a complete exit plan. */
export function setPositionManagementUnmanagedCount(count: number | undefined): void {
  unmanagedCount = count === undefined ? undefined : Math.max(0, Math.min(100, Math.floor(count)));
}

/** Mark the supervisor degraded when no successful pass arrives within a bounded interval. */
export function assessPositionManagementLiveness(health: { readonly lastRunAt?: string | undefined; readonly status: PositionManagementSchedulerStatus }, intervalSeconds: number, now = new Date()): PositionManagementSchedulerStatus {
  if (health.status === "disabled" || health.status === "degraded" || !health.lastRunAt) return health.status;
  const lastRun = Date.parse(health.lastRunAt);
  if (!Number.isFinite(lastRun) || !Number.isFinite(now.getTime())) return "degraded";
  return now.getTime() - lastRun > Math.max(30, intervalSeconds * 2) * 1_000 ? "degraded" : health.status;
}

/** Schedule deterministic position-management passes without overlapping broker operations. */
export function createPositionManagementScheduler(input: { readonly intervalSeconds: number; readonly run: () => Promise<void>; readonly onFailure?: (error: unknown) => Promise<void> | void }) {
  if (!Number.isSafeInteger(input.intervalSeconds) || input.intervalSeconds < 30 || input.intervalSeconds > 86_400) throw new Error("Position-management interval must be between 30 and 86400 seconds.");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let watchdogTimer: ReturnType<typeof setInterval> | undefined;
  let stopped = true;
  let running = false;
  let livenessAlerted = false;
  const watchdog = () => {
    if (stopped || livenessAlerted || status === "degraded" || !lastRunAt) return;
    if (assessPositionManagementLiveness({ lastRunAt, status }, input.intervalSeconds, new Date()) !== "degraded") return;
    status = "degraded";
    lastError = "position_management_stale";
    livenessAlerted = true;
    void input.onFailure?.(new Error("position_management_stale"));
  };
  const schedule = () => { if (!stopped) timer = setTimeout(() => { void execute().finally(schedule); }, input.intervalSeconds * 1000); };
  const execute = async () => {
    if (stopped || running) return;
    running = true; status = "running";
    try { await input.run(); lastRunAt = new Date().toISOString(); lastError = undefined; livenessAlerted = false; status = "ready"; }
    catch (error) { lastError = error instanceof Error ? error.message : "position_management_failed"; status = "degraded"; await input.onFailure?.(error); }
    finally { running = false; }
  };
  return {
    start() { if (!stopped) return; stopped = false; status = "ready"; watchdogTimer = setInterval(watchdog, input.intervalSeconds * 1_000); watchdogTimer.unref?.(); void execute().finally(schedule); },
    async stop() { stopped = true; if (timer) clearTimeout(timer); if (watchdogTimer) clearInterval(watchdogTimer); timer = undefined; watchdogTimer = undefined; status = "disabled"; },
    status: getPositionManagementHealth,
  };
}
