import { PgBoss, type Job, type QueueOptions } from "pg-boss";
import { createHash } from "node:crypto";

export const DAILY_PREPARATION_QUEUE = "momentum.daily-preparation";
export const DAILY_PREPARATION_DEAD_LETTER_QUEUE = "momentum.daily-preparation.dead-letter";
export const DAILY_PREPARATION_CRON = "0 0 * * *";

export type DurableSchedulerStatus = "degraded" | "disabled" | "ready" | "running" | "scheduled";

export interface DurableSchedulerHealth {
  readonly enabled: boolean;
  readonly lastRunAt?: string;
  readonly nextRunAt?: string;
  readonly status: DurableSchedulerStatus;
}

export interface DurableSchedulerConfig {
  readonly cron: string;
  readonly enabled: boolean;
  readonly activationApprovalReference?: string;
  readonly retryDelaySeconds: number;
  readonly retryLimit: number;
}

export type DurableSchedulerReadinessStatus = "blocked" | "disabled" | "ready";

export interface DurableSchedulerReadiness {
  readonly blockedReasons: readonly string[];
  readonly checks: {
    readonly brokerConnectionEnabled: boolean;
    readonly dailyPreparationHandlerEnabled: boolean;
    readonly databaseConfigured: boolean;
    readonly paperCredentialsConfigured: boolean;
    readonly paperMode: boolean;
    readonly schedulerEnabled: boolean;
  };
  readonly status: DurableSchedulerReadinessStatus;
}

function exactBoolean(value: string | undefined, defaultValue: boolean): boolean {
  return value === undefined ? defaultValue : value === "true";
}

export function getDurableSchedulerReadiness(environment: NodeJS.ProcessEnv = process.env): DurableSchedulerReadiness {
  const schedulerEnabled = exactBoolean(environment.DURABLE_SCHEDULER_ENABLED, false);
  const brokerConnectionEnabled = exactBoolean(environment.BROKER_CONNECTION_ENABLED, false);
  const dailyPreparationHandlerEnabled = exactBoolean(environment.DAILY_PREPARATION_HANDLER_ENABLED, false);
  const paperMode = (environment.TRADING_MODE ?? "paper") === "paper" && exactBoolean(environment.ALPACA_PAPER_TRADE, true);
  const databaseConfigured = Boolean(environment.DATABASE_URL?.trim());
  const paperCredentialsConfigured = Boolean(environment.ALPACA_API_KEY?.trim() && environment.ALPACA_SECRET_KEY?.trim());
  const activationApprovalReferencePresent = !schedulerEnabled || Boolean(environment.DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE?.trim() && boundedJobField.test(environment.DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE.trim()));
  const blockedReasons = [
    ...(paperMode ? [] : ["paper_runtime_invalid"]),
    ...(databaseConfigured ? [] : ["database_not_configured"]),
    ...(brokerConnectionEnabled ? [] : ["broker_connection_disabled"]),
    ...(paperCredentialsConfigured ? [] : ["paper_credentials_not_configured"]),
    ...(dailyPreparationHandlerEnabled ? [] : ["daily_preparation_handler_disabled"]),
    ...(activationApprovalReferencePresent ? [] : ["scheduler_activation_approval_reference_missing"]),
  ];
  const status = !schedulerEnabled ? "disabled" : blockedReasons.length === 0 ? "ready" : "blocked";
  return {
    blockedReasons: status === "disabled" ? [] : blockedReasons,
    checks: { brokerConnectionEnabled, dailyPreparationHandlerEnabled, databaseConfigured, paperCredentialsConfigured, paperMode, schedulerEnabled },
    status,
  };
}

export function validateDurableSchedulerOneRun(environment: NodeJS.ProcessEnv = process.env): void {
  if (environment.DURABLE_SCHEDULER_ENABLED === "true") {
    throw new Error("DURABLE_SCHEDULER_ENABLED must remain disabled for the one-run command.");
  }
  if (environment.DAILY_PREPARATION_HANDLER_ENABLED !== "true") {
    throw new Error("DAILY_PREPARATION_HANDLER_ENABLED must be explicitly true for the one-run command.");
  }
  if (environment.BROKER_CONNECTION_ENABLED !== "true") {
    throw new Error("BROKER_CONNECTION_ENABLED must be explicitly true for the one-run command.");
  }
  if (environment.PAPER_AUTOPILOT_ENABLED === "true") {
    throw new Error("PAPER_AUTOPILOT_ENABLED must remain disabled for the one-run command.");
  }
}

/**
 * A one-run hosted reconciliation is an operator-approved side effect even
 * though it is read-only at the broker and cannot submit orders. Keep the
 * approval reference command-scoped, bounded, and non-secret.
 */
export function validateDurableSchedulerApprovalReference(environment: NodeJS.ProcessEnv = process.env): string {
  const reference = environment.DURABLE_SCHEDULER_APPROVAL_REFERENCE?.trim();
  if (!reference || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(reference)) {
    throw new Error("DURABLE_SCHEDULER_APPROVAL_REFERENCE must be a bounded non-secret reference.");
  }
  return reference;
}

export function validateDurableOneRunId(environment: NodeJS.ProcessEnv = process.env): string {
  const runId = environment.DURABLE_ONE_RUN_ID?.trim();
  if (!runId || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(runId)) {
    throw new Error("DURABLE_ONE_RUN_ID must be a bounded non-secret identifier.");
  }
  return runId;
}

/** Require an explicit non-secret review reference only when persistent scheduling is enabled. */
export function validateDurableSchedulerActivation(environment: NodeJS.ProcessEnv = process.env): string | undefined {
  if (environment.DURABLE_SCHEDULER_ENABLED !== "true") return undefined;
  const reference = environment.DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE?.trim();
  if (!reference || !boundedJobField.test(reference)) {
    throw new Error("DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE must be a bounded non-secret reference when durable scheduling is enabled.");
  }
  return reference;
}

/** Map the bounded operator-facing run ID to pg-boss's required UUID job ID. */
export function getDurableOneRunJobId(runId: string): string {
  const digest = createHash("sha256").update(`momentum:durable-one-run:${runId}`).digest();
  digest[6] = ((digest[6] ?? 0) & 0x0f) | 0x50;
  digest[8] = ((digest[8] ?? 0) & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface DurableDailyJob {
  readonly kind: "daily_preparation";
  readonly version: 1;
  readonly approvalReference?: string;
  readonly runId?: string;
}

const boundedJobField = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;

/** Validate data loaded from pg-boss before handing it to reconciliation code. */
export function parseDurableDailyJob(input: unknown): DurableDailyJob {
  if (!input || typeof input !== "object") throw new Error("Durable daily job payload is invalid.");
  const value = input as Record<string, unknown>;
  if (value.kind !== "daily_preparation" || value.version !== 1) throw new Error("Durable daily job payload is invalid.");
  for (const field of ["approvalReference", "runId"] as const) {
    const candidate = value[field];
    if (candidate !== undefined && (typeof candidate !== "string" || !boundedJobField.test(candidate))) throw new Error("Durable daily job payload is invalid.");
  }
  return {
    kind: "daily_preparation",
    version: 1,
    ...(typeof value.approvalReference === "string" ? { approvalReference: value.approvalReference } : {}),
    ...(typeof value.runId === "string" ? { runId: value.runId } : {}),
  };
}

export interface DurableQueueClient {
  start(): Promise<unknown>;
  stop(): Promise<void>;
  createQueue(name: string, options?: QueueOptions & { readonly deadLetter?: string }): Promise<void>;
  schedule(name: string, cron: string, data?: object | null, options?: { readonly key?: string; readonly tz?: string }): Promise<void>;
  work<T>(name: string, handler: (jobs: Job<T>[]) => Promise<unknown>): Promise<string>;
}

export interface DurableQueueInspector {
  getQueue(name: string): Promise<{ readonly name: string } | null>;
  getQueueStats(name: string, options?: { readonly force?: boolean }): Promise<readonly { readonly queuedCount: number; readonly failedCount: number; readonly activeCount: number }[]>;
}

export interface DurableQueueSender {
  send(name: string, data?: object | null, options?: { readonly id?: string }): Promise<string | null>;
}

export function getDailyPreparationJobId(now = new Date()): string {
  return `manual-daily-preparation-${now.toISOString().slice(0, 10)}`;
}

export async function enqueueDailyPreparation(sender: DurableQueueSender, now = new Date()): Promise<{ readonly jobId: string; readonly queued: boolean }> {
  const jobId = getDailyPreparationJobId(now);
  const sentId = await sender.send(DAILY_PREPARATION_QUEUE, { kind: "daily_preparation", version: 1 }, { id: jobId });
  return { jobId, queued: sentId !== null };
}

export interface DurableQueueInspection {
  readonly deadLetterQueue: { readonly activeCount: number; readonly failedCount: number; readonly present: boolean; readonly queuedCount: number };
  readonly workQueue: { readonly activeCount: number; readonly failedCount: number; readonly present: boolean; readonly queuedCount: number };
}

async function inspectQueue(inspector: DurableQueueInspector, name: string) {
  const [queue, stats] = await Promise.all([inspector.getQueue(name), inspector.getQueueStats(name, { force: true })]);
  const latest = stats.at(-1);
  return { activeCount: latest?.activeCount ?? 0, failedCount: latest?.failedCount ?? 0, present: queue !== null, queuedCount: latest?.queuedCount ?? 0 };
}

export async function inspectDurableQueues(inspector: DurableQueueInspector): Promise<DurableQueueInspection> {
  const [workQueue, deadLetterQueue] = await Promise.all([
    inspectQueue(inspector, DAILY_PREPARATION_QUEUE),
    inspectQueue(inspector, DAILY_PREPARATION_DEAD_LETTER_QUEUE),
  ]);
  return { deadLetterQueue, workQueue };
}

type BossFactory = (connectionString: string) => DurableQueueClient;

export async function provisionDurableQueues(boss: DurableQueueClient, config: DurableSchedulerConfig): Promise<void> {
  const queueOptions: QueueOptions = {
    deleteAfterSeconds: 604_800,
    expireInSeconds: 900,
    retryBackoff: true,
    retryDelay: config.retryDelaySeconds,
    retryDelayMax: 86_400,
    retryLimit: config.retryLimit,
    retentionSeconds: 1_209_600,
  };
  await boss.createQueue(DAILY_PREPARATION_DEAD_LETTER_QUEUE, { retentionSeconds: 1_209_600 });
  await boss.createQueue(DAILY_PREPARATION_QUEUE, { ...queueOptions, deadLetter: DAILY_PREPARATION_DEAD_LETTER_QUEUE });
}

let schedulerHealth: DurableSchedulerHealth = { enabled: false, status: "disabled" };

export function getDurableSchedulerHealth(): DurableSchedulerHealth { return schedulerHealth; }
export function setDurableSchedulerHealth(next: DurableSchedulerHealth): void { schedulerHealth = next; }

function parseBoolean(name: string, value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be exactly true or false.`);
}

export function getDurableSchedulerConfig(environment = process.env): DurableSchedulerConfig {
  const enabled = parseBoolean("DURABLE_SCHEDULER_ENABLED", environment.DURABLE_SCHEDULER_ENABLED, false);
  const activationApprovalReference = validateDurableSchedulerActivation(environment);
  const cron = environment.DAILY_PREPARATION_CRON ?? DAILY_PREPARATION_CRON;
  if (cron.trim().length === 0 || cron.length > 120) throw new Error("DAILY_PREPARATION_CRON must be a non-empty cron expression no longer than 120 characters.");
  const retryLimit = Number(environment.DAILY_PREPARATION_RETRY_LIMIT ?? "3");
  if (!Number.isSafeInteger(retryLimit) || retryLimit < 0 || retryLimit > 10) throw new Error("DAILY_PREPARATION_RETRY_LIMIT must be an integer from 0 to 10.");
  const retryDelaySeconds = Number(environment.DAILY_PREPARATION_RETRY_DELAY_SECONDS ?? "60");
  if (!Number.isSafeInteger(retryDelaySeconds) || retryDelaySeconds < 1 || retryDelaySeconds > 86_400) throw new Error("DAILY_PREPARATION_RETRY_DELAY_SECONDS must be an integer from 1 to 86400.");
  return { cron, enabled, ...(activationApprovalReference ? { activationApprovalReference } : {}), retryDelaySeconds, retryLimit };
}

function nextDailyRunAt(now: Date, cron: string): string | undefined {
  if (cron !== DAILY_PREPARATION_CRON) return undefined;
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next.toISOString();
}

export function createDurableScheduler(input: {
  readonly config: DurableSchedulerConfig;
  readonly connectionString: string;
  readonly now?: () => Date;
  readonly runDailyPreparation: (job: DurableDailyJob) => Promise<void>;
  readonly bossFactory?: BossFactory;
}) {
  const now = input.now ?? (() => new Date());
  const createBoss = input.bossFactory ?? ((connectionString: string) => new PgBoss(connectionString));
  let boss: DurableQueueClient | undefined;
  let workerId: string | undefined;
  let stopped = true;
  return {
    async start() {
      if (!input.config.enabled || !stopped) return;
      if (!input.connectionString.trim()) throw new Error("DURABLE_SCHEDULER_ENABLED=true requires DATABASE_URL.");
      stopped = false;
      try {
        boss = createBoss(input.connectionString);
        await boss.start();
        await provisionDurableQueues(boss, input.config);
        await boss.schedule(DAILY_PREPARATION_QUEUE, input.config.cron, { kind: "daily_preparation", version: 1 }, { key: "daily-preparation", tz: "UTC" });
        workerId = await boss.work<DurableDailyJob>(DAILY_PREPARATION_QUEUE, async (jobs) => {
          if (jobs.length === 0) return;
          setDurableSchedulerHealth({ ...getDurableSchedulerHealth(), status: "running" });
          try {
            for (const job of jobs) await input.runDailyPreparation(parseDurableDailyJob(job.data));
            const nextRunAt = nextDailyRunAt(now(), input.config.cron);
            setDurableSchedulerHealth({ ...getDurableSchedulerHealth(), lastRunAt: now().toISOString(), ...(nextRunAt ? { nextRunAt } : {}), status: "ready" });
          } catch (error) {
            setDurableSchedulerHealth({ ...getDurableSchedulerHealth(), lastRunAt: now().toISOString(), status: "degraded" });
            throw error;
          }
        });
        const nextRunAt = nextDailyRunAt(now(), input.config.cron);
        setDurableSchedulerHealth({ enabled: true, ...(nextRunAt ? { nextRunAt } : {}), status: "scheduled" });
      } catch (error) {
        stopped = true;
        setDurableSchedulerHealth({ enabled: true, status: "degraded" });
        if (boss) await boss.stop().catch(() => undefined);
        boss = undefined;
        throw error;
      }
    },
    async stop() {
      stopped = true;
      workerId = undefined;
      if (boss) await boss.stop();
      boss = undefined;
      setDurableSchedulerHealth({ enabled: input.config.enabled, status: "disabled" });
    },
    getWorkerId() { return workerId; },
  };
}
