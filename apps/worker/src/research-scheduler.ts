export const RESEARCH_PREPARATION_QUEUE = "momentum.research-preparation";
export const RESEARCH_PREPARATION_DEAD_LETTER_QUEUE = "momentum.research-preparation.dead-letter";
export const RESEARCH_PREPARATION_CRON = "30 0 * * *";

export interface ResearchScheduleConfig {
  readonly cron: string;
  readonly enabled: boolean;
  readonly handlerEnabled: boolean;
  readonly retryDelaySeconds: number;
  readonly retryLimit: number;
}

export interface ResearchScheduleReadiness {
  readonly blockedReasons: readonly string[];
  readonly checks: {
    readonly brokerConnectionEnabled: boolean;
    readonly databaseConfigured: boolean;
    readonly handlerEnabled: boolean;
    readonly paperCredentialsConfigured: boolean;
    readonly paperMode: boolean;
    readonly schedulerEnabled: boolean;
  };
  readonly status: "blocked" | "disabled" | "ready";
}

export interface ResearchPreparationJob {
  readonly kind: "research_preparation";
  readonly version: 1;
}

export interface ResearchQueueSender {
  send(name: string, data?: object | null, options?: { readonly id?: string }): Promise<string | null>;
}

export interface ResearchQueueClient {
  createQueue(name: string, options?: { readonly deleteAfterSeconds?: number; readonly expireInSeconds?: number; readonly retryBackoff?: boolean; readonly retryDelay?: number; readonly retryDelayMax?: number; readonly retryLimit?: number; readonly retentionSeconds?: number; readonly deadLetter?: string }): Promise<void>;
  send(name: string, data?: object | null, options?: { readonly id?: string }): Promise<string | null>;
  schedule(name: string, cron: string, data?: object | null, options?: { readonly key?: string; readonly tz?: string }): Promise<void>;
  work<T>(name: string, handler: (jobs: readonly { readonly data: T }[]) => Promise<unknown>): Promise<string>;
}

export interface ResearchSchedulerClient extends ResearchQueueClient {
  start(): Promise<unknown>;
  stop(): Promise<void>;
}

export type ResearchSchedulerRuntimeStatus = "degraded" | "disabled" | "running" | "scheduled";

export interface ResearchSchedulerHealth {
  readonly enabled: boolean;
  readonly handlerEnabled: boolean;
  readonly lastRiskCycleAt?: string;
  readonly lastRiskCycleStatus?: "completed" | "failed";
  readonly lastRiskDecisionCount?: number;
  readonly lastRiskApprovedCount?: number;
  readonly lastRunAt?: string;
  readonly nextRunAt?: string;
  readonly status: ResearchSchedulerRuntimeStatus;
}

/** Mark a scheduled tick degraded only after a bounded two-minute grace period. */
export function assessResearchSchedulerLiveness(health: ResearchSchedulerHealth, now = new Date(), graceSeconds = 120): ResearchSchedulerHealth {
  if (health.status !== "scheduled" || !health.nextRunAt) return health;
  const nextRun = Date.parse(health.nextRunAt);
  if (!Number.isFinite(nextRun) || !Number.isFinite(now.getTime())) return health;
  return now.getTime() > nextRun + Math.max(0, graceSeconds) * 1_000 ? { ...health, status: "degraded" } : health;
}

export interface ResearchPreparationQueueInspection {
  readonly deadLetterQueue: boolean;
  readonly workQueue: boolean;
}

function parseBoolean(name: string, value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be exactly true or false.`);
}

function parseBoundedInteger(name: string, value: string | undefined, defaultValue: number, min: number, max: number): number {
  const result = Number(value ?? String(defaultValue));
  if (!Number.isSafeInteger(result) || result < min || result > max) throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  return result;
}

export function getResearchScheduleConfig(environment: NodeJS.ProcessEnv = process.env): ResearchScheduleConfig {
  const cron = environment.RESEARCH_PREPARATION_CRON ?? RESEARCH_PREPARATION_CRON;
  if (!cron.trim() || cron.length > 120) throw new Error("RESEARCH_PREPARATION_CRON must be non-empty and no longer than 120 characters.");
  return {
    cron,
    enabled: parseBoolean("RESEARCH_SCHEDULER_ENABLED", environment.RESEARCH_SCHEDULER_ENABLED, false),
    handlerEnabled: parseBoolean("RESEARCH_HANDLER_ENABLED", environment.RESEARCH_HANDLER_ENABLED, false),
    retryDelaySeconds: parseBoundedInteger("RESEARCH_RETRY_DELAY_SECONDS", environment.RESEARCH_RETRY_DELAY_SECONDS, 300, 1, 86_400),
    retryLimit: parseBoundedInteger("RESEARCH_RETRY_LIMIT", environment.RESEARCH_RETRY_LIMIT, 2, 0, 10),
  };
}

export function getResearchScheduleReadiness(environment: NodeJS.ProcessEnv = process.env): ResearchScheduleReadiness {
  const config = getResearchScheduleConfig(environment);
  const paperMode = (environment.TRADING_MODE ?? "paper") === "paper" && (environment.ALPACA_PAPER_TRADE === undefined || environment.ALPACA_PAPER_TRADE === "true");
  const brokerConnectionEnabled = environment.BROKER_CONNECTION_ENABLED === "true";
  const databaseConfigured = Boolean(environment.DATABASE_URL?.trim());
  const paperCredentialsConfigured = Boolean(environment.ALPACA_API_KEY?.trim() && environment.ALPACA_SECRET_KEY?.trim());
  const blockedReasons = [
    ...(paperMode ? [] : ["paper_runtime_invalid"]),
    ...(databaseConfigured ? [] : ["database_not_configured"]),
    ...(brokerConnectionEnabled ? [] : ["broker_connection_disabled"]),
    ...(paperCredentialsConfigured ? [] : ["paper_credentials_not_configured"]),
    ...(config.handlerEnabled ? [] : ["research_handler_disabled"]),
  ];
  const status = !config.enabled ? "disabled" : blockedReasons.length === 0 ? "ready" : "blocked";
  return { blockedReasons: status === "disabled" ? [] : blockedReasons, checks: { brokerConnectionEnabled, databaseConfigured, handlerEnabled: config.handlerEnabled, paperCredentialsConfigured, paperMode, schedulerEnabled: config.enabled }, status };
}

export function getResearchPreparationJobId(now = new Date()): string {
  return `manual-research-preparation-${now.toISOString().slice(0, 10)}`;
}

export async function enqueueResearchPreparation(sender: ResearchQueueSender, now = new Date()): Promise<{ readonly jobId: string; readonly queued: boolean }> {
  const jobId = getResearchPreparationJobId(now);
  const sentId = await sender.send(RESEARCH_PREPARATION_QUEUE, { kind: "research_preparation", version: 1 }, { id: jobId });
  return { jobId, queued: sentId !== null };
}

export async function provisionResearchQueues(client: ResearchQueueClient, config: ResearchScheduleConfig): Promise<void> {
  await client.createQueue(RESEARCH_PREPARATION_DEAD_LETTER_QUEUE, { retentionSeconds: 1_209_600 });
  await client.createQueue(RESEARCH_PREPARATION_QUEUE, {
    deadLetter: RESEARCH_PREPARATION_DEAD_LETTER_QUEUE,
    deleteAfterSeconds: 604_800,
    expireInSeconds: 900,
    retryBackoff: true,
    retryDelay: config.retryDelaySeconds,
    retryDelayMax: 86_400,
    retryLimit: config.retryLimit,
    retentionSeconds: 1_209_600,
  });
}

export function isResearchPreparationJob(value: unknown): value is ResearchPreparationJob {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { readonly kind?: unknown; readonly version?: unknown };
  return candidate.kind === "research_preparation" && candidate.version === 1;
}

export async function runResearchPreparationJob(input: {
  readonly job: unknown;
  readonly run: (job: ResearchPreparationJob) => Promise<void>;
}): Promise<void> {
  if (!isResearchPreparationJob(input.job)) throw new Error("Invalid research preparation job.");
  await input.run(input.job);
}

export function getNextResearchRunAt(now: Date, cron: string): string | undefined {
  const intervalMatch = /^\*\/(\d+) \* \* \* \*$/.exec(cron);
  if (intervalMatch) {
    const intervalMinutes = Number(intervalMatch[1]);
    if (Number.isSafeInteger(intervalMinutes) && intervalMinutes >= 1 && intervalMinutes <= 60) {
      const next = new Date(now);
      next.setUTCSeconds(0, 0);
      next.setUTCMinutes(Math.floor(next.getUTCMinutes() / intervalMinutes) * intervalMinutes + intervalMinutes);
      return next.toISOString();
    }
  }
  if (cron !== RESEARCH_PREPARATION_CRON) return undefined;
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.toISOString();
}

let schedulerHealth: ResearchSchedulerHealth = { enabled: false, handlerEnabled: false, status: "disabled" };

export function getResearchSchedulerHealth(): ResearchSchedulerHealth {
  return schedulerHealth;
}

/** Record bounded risk-cycle telemetry without persisting credentials or model output. */
export function setResearchRiskCycleHealth(input: { readonly at?: string; readonly approved: number; readonly decisions: number; readonly status: "completed" | "failed" }): void {
  schedulerHealth = { ...schedulerHealth, lastRiskApprovedCount: Math.max(0, Math.min(100, input.approved)), lastRiskCycleAt: input.at ?? new Date().toISOString(), lastRiskCycleStatus: input.status, lastRiskDecisionCount: Math.max(0, Math.min(100, input.decisions)) };
}

export function createResearchScheduler(input: {
  readonly clientFactory: () => ResearchSchedulerClient;
  readonly config: ResearchScheduleConfig;
  readonly environment?: NodeJS.ProcessEnv;
  readonly now?: () => Date;
  readonly runPreparation: (job: ResearchPreparationJob) => Promise<void>;
  readonly onStale?: (error: Error) => Promise<void> | void;
}) {
  const environment = input.environment ?? process.env;
  const now = input.now ?? (() => new Date());
  let client: ResearchSchedulerClient | undefined;
  let started = false;
  let watchdogTimer: ReturnType<typeof setInterval> | undefined;
  let staleAlerted = false;
  const watchdog = () => {
    if (!started || staleAlerted) return;
    const health = getResearchSchedulerHealth();
    if (assessResearchSchedulerLiveness(health, now()).status !== "degraded") return;
    schedulerHealth = { ...health, status: "degraded" };
    staleAlerted = true;
    const recoveryId = `research-recovery-${(health.nextRunAt ?? now().toISOString()).replace(/[^0-9A-Za-z]/g, "").slice(0, 32)}`;
    void (async () => {
      try {
        const queued = await client?.send(RESEARCH_PREPARATION_QUEUE, { kind: "research_preparation", version: 1 }, { id: recoveryId });
        if (queued) return;
      } catch {
        // Preserve the degraded state and emit the incident below.
      }
      await input.onStale?.(new Error("research_scheduler_stale"));
    })();
  };
  return {
    async start(): Promise<void> {
      if (!input.config.enabled || started) return;
      const readiness = getResearchScheduleReadiness(environment);
      if (readiness.status !== "ready") {
        schedulerHealth = { enabled: true, handlerEnabled: input.config.handlerEnabled, status: "degraded" };
        throw new Error(`Research scheduler is not ready: ${readiness.status}.`);
      }
      started = true;
      try {
        client = input.clientFactory();
        await client.start();
        await provisionResearchQueues(client, input.config);
        await client.schedule(RESEARCH_PREPARATION_QUEUE, input.config.cron, { kind: "research_preparation", version: 1 }, { key: "research-preparation", tz: "UTC" });
        await client.work<ResearchPreparationJob>(RESEARCH_PREPARATION_QUEUE, async (jobs) => {
          if (jobs.length === 0) return;
          schedulerHealth = { ...schedulerHealth, status: "running" };
          try {
            for (const job of jobs) await runResearchPreparationJob({ job: job.data, run: input.runPreparation });
            const nextRunAt = getNextResearchRunAt(now(), input.config.cron);
            schedulerHealth = { ...schedulerHealth, enabled: true, handlerEnabled: input.config.handlerEnabled, lastRunAt: now().toISOString(), ...(nextRunAt ? { nextRunAt } : {}), status: "scheduled" };
            staleAlerted = false;
          } catch (error) {
            schedulerHealth = { ...schedulerHealth, status: "degraded" };
            throw error;
          }
        });
        const nextRunAt = getNextResearchRunAt(now(), input.config.cron);
        schedulerHealth = { enabled: true, handlerEnabled: input.config.handlerEnabled, ...(nextRunAt ? { nextRunAt } : {}), status: "scheduled" };
        watchdogTimer = setInterval(watchdog, 60_000);
        watchdogTimer.unref?.();
      } catch (error) {
        started = false;
        schedulerHealth = { enabled: true, handlerEnabled: input.config.handlerEnabled, status: "degraded" };
        if (client) await client.stop().catch(() => undefined);
        client = undefined;
        throw error;
      }
    },
    async stop(): Promise<void> {
      started = false;
      if (client) await client.stop();
      client = undefined;
      if (watchdogTimer) clearInterval(watchdogTimer);
      watchdogTimer = undefined;
      staleAlerted = false;
      schedulerHealth = { enabled: input.config.enabled, handlerEnabled: input.config.handlerEnabled, status: "disabled" };
    },
  };
}
