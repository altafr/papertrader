import { PgBoss, type Job, type QueueOptions } from "pg-boss";

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
  readonly retryDelaySeconds: number;
  readonly retryLimit: number;
}

export interface DurableDailyJob {
  readonly kind: "daily_preparation";
  readonly version: 1;
}

export interface DurableQueueClient {
  start(): Promise<unknown>;
  stop(): Promise<void>;
  createQueue(name: string, options?: QueueOptions & { readonly deadLetter?: string }): Promise<void>;
  schedule(name: string, cron: string, data?: object | null, options?: { readonly key?: string; readonly tz?: string }): Promise<void>;
  work<T>(name: string, handler: (jobs: Job<T>[]) => Promise<unknown>): Promise<string>;
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
  const cron = environment.DAILY_PREPARATION_CRON ?? DAILY_PREPARATION_CRON;
  if (cron.trim().length === 0 || cron.length > 120) throw new Error("DAILY_PREPARATION_CRON must be a non-empty cron expression no longer than 120 characters.");
  const retryLimit = Number(environment.DAILY_PREPARATION_RETRY_LIMIT ?? "3");
  if (!Number.isSafeInteger(retryLimit) || retryLimit < 0 || retryLimit > 10) throw new Error("DAILY_PREPARATION_RETRY_LIMIT must be an integer from 0 to 10.");
  const retryDelaySeconds = Number(environment.DAILY_PREPARATION_RETRY_DELAY_SECONDS ?? "60");
  if (!Number.isSafeInteger(retryDelaySeconds) || retryDelaySeconds < 1 || retryDelaySeconds > 86_400) throw new Error("DAILY_PREPARATION_RETRY_DELAY_SECONDS must be an integer from 1 to 86400.");
  return { cron, enabled, retryDelaySeconds, retryLimit };
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
            for (const job of jobs) await input.runDailyPreparation(job.data);
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
