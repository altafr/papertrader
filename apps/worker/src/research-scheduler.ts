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
  schedule(name: string, cron: string, data?: object | null, options?: { readonly key?: string; readonly tz?: string }): Promise<void>;
  work<T>(name: string, handler: (jobs: readonly { readonly data: T }[]) => Promise<unknown>): Promise<string>;
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
