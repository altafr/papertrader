import { describe, expect, it, vi } from "vitest";
import { assessResearchSchedulerLiveness, createResearchScheduler, enqueueResearchPreparation, getNextResearchRunAt, getResearchPreparationJobId, getResearchScheduleConfig, getResearchScheduleReadiness, getResearchSchedulerErrorMetadata, getResearchSchedulerHealth, getResearchStartupCatchupJobId, isResearchPreparationJob, provisionResearchQueues, runResearchPreparationJob, setResearchRiskCycleHealth, startWithBoundedRetry, RESEARCH_PREPARATION_CRON, RESEARCH_PREPARATION_DEAD_LETTER_QUEUE, RESEARCH_PREPARATION_QUEUE } from "./research-scheduler.js";

describe("research schedule boundary", () => {
  it("keeps scheduler error telemetry bounded and non-secret", () => {
    expect(getResearchSchedulerErrorMetadata({ code: "ENOTFOUND", name: "Error", message: "postgres://secret" })).toEqual({ errorCode: "ENOTFOUND", errorName: "Error" });
    expect(getResearchSchedulerErrorMetadata({ code: "bad code", name: "Error" })).toEqual({ errorName: "Error" });
    expect(getResearchSchedulerErrorMetadata(new Error("secret"))).toEqual({ errorName: "Error" });
  });
  it("recovers transient scheduler startup failures with bounded retries", async () => {
    let attempts = 0;
    const retries: number[] = [];
    await startWithBoundedRetry({ attempts: 3, delayMs: 1, onRetry: (attempt) => { retries.push(attempt); }, sleep: async () => {}, start: async () => { attempts += 1; if (attempts < 3) throw new Error("transient"); } });
    expect(attempts).toBe(3);
    expect(retries).toEqual([1, 2]);
  });

  it("fails after bounded scheduler startup retries are exhausted", async () => {
    let attempts = 0;
    let exhausted: unknown;
    await expect(startWithBoundedRetry({ attempts: 2, delayMs: 1, onExhausted: (error) => { exhausted = error; }, sleep: async () => {}, start: async () => { attempts += 1; throw new Error("unavailable"); } })).rejects.toThrow("unavailable");
    expect(attempts).toBe(2);
    expect(exhausted).toBeInstanceOf(Error);
  });

  it("is disabled by default with bounded configuration", () => {
    expect(getResearchScheduleConfig()).toEqual({ cron: RESEARCH_PREPARATION_CRON, enabled: false, handlerEnabled: false, retryDelaySeconds: 300, retryLimit: 2 });
    expect(RESEARCH_PREPARATION_QUEUE).toContain("research-preparation");
    expect(() => getResearchScheduleConfig({ RESEARCH_RETRY_LIMIT: "11" })).toThrow("integer");
  });

  it("reports safe readiness without exposing credentials", () => {
    expect(getResearchScheduleReadiness({})).toMatchObject({ status: "disabled", blockedReasons: [] });
    const blocked = getResearchScheduleReadiness({ RESEARCH_SCHEDULER_ENABLED: "true", TRADING_MODE: "paper", ALPACA_PAPER_TRADE: "true" });
    expect(blocked).toMatchObject({ status: "blocked", blockedReasons: ["database_not_configured", "broker_connection_disabled", "paper_credentials_not_configured", "research_handler_disabled"] });
    expect(getResearchScheduleReadiness({ RESEARCH_SCHEDULER_ENABLED: "true", ALPACA_PAPER_TRADE: "unexpected" }).blockedReasons).toContain("paper_runtime_invalid");
    const ready = getResearchScheduleReadiness({ ALPACA_API_KEY: "secret", ALPACA_SECRET_KEY: "secret2", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "true", DATABASE_URL: "postgres://redacted", RESEARCH_HANDLER_ENABLED: "true", RESEARCH_SCHEDULER_ENABLED: "true", TRADING_MODE: "paper" });
    expect(ready).toMatchObject({ status: "ready", blockedReasons: [] });
    expect(JSON.stringify(ready)).not.toContain("secret");
  });

  it("creates a deterministic UTC manual job identity", () => {
    expect(getResearchPreparationJobId(new Date("2026-08-23T14:00:00Z"))).toBe("manual-research-preparation-2026-08-23");
  });

  it("calculates the next 15-minute boundary without relying on wall-clock execution", () => {
    expect(getNextResearchRunAt(new Date("2026-08-28T11:32:50.000Z"), "*/15 * * * *")).toBe("2026-08-28T11:45:00.000Z");
    expect(getNextResearchRunAt(new Date("2026-08-28T11:45:00.000Z"), "*/15 * * * *")).toBe("2026-08-28T12:00:00.000Z");
  });

  it("creates an idempotent startup catch-up identity only for interval schedules", () => {
    expect(getResearchStartupCatchupJobId(new Date("2026-08-28T11:32:50.000Z"), "*/15 * * * *")).toBe("research-startup-20260828T113000000Z");
    expect(getResearchStartupCatchupJobId(new Date("2026-08-28T11:32:50.000Z"), RESEARCH_PREPARATION_CRON)).toBeUndefined();
  });

  it("marks an overdue tick degraded after the bounded grace period", () => {
    const health = { enabled: true, handlerEnabled: true, lastRunAt: "2026-08-28T12:00:00.000Z", nextRunAt: "2026-08-28T12:15:00.000Z", status: "scheduled" as const };
    expect(assessResearchSchedulerLiveness(health, new Date("2026-08-28T12:16:59.000Z"))).toMatchObject({ status: "scheduled" });
    expect(assessResearchSchedulerLiveness(health, new Date("2026-08-28T12:17:01.000Z"))).toMatchObject({ status: "degraded" });
  });

  it("records bounded risk-cycle telemetry in scheduler health", () => {
    setResearchRiskCycleHealth({ approved: 2, decisions: 4, status: "completed", at: "2026-08-28T12:00:00.000Z" });
    expect(getResearchSchedulerHealth()).toMatchObject({ lastRiskApprovedCount: 2, lastRiskCycleAt: "2026-08-28T12:00:00.000Z", lastRiskCycleStatus: "completed", lastRiskDecisionCount: 4 });
  });

  it("provisions a separately named research queue with bounded retries", async () => {
    const calls: Array<{ readonly name: string; readonly options?: object }> = [];
    await provisionResearchQueues({ createQueue: async (name, options) => { calls.push({ name, ...(options ? { options } : {}) }); }, send: async () => null, schedule: async () => {}, work: async () => "worker" }, getResearchScheduleConfig({ RESEARCH_RETRY_DELAY_SECONDS: "30", RESEARCH_RETRY_LIMIT: "1" }));
    expect(calls.map((call) => call.name)).toEqual([RESEARCH_PREPARATION_DEAD_LETTER_QUEUE, RESEARCH_PREPARATION_QUEUE]);
    expect(calls[1]?.options).toMatchObject({ deadLetter: RESEARCH_PREPARATION_DEAD_LETTER_QUEUE, retryDelay: 30, retryLimit: 1 });
  });

  it("enqueues one deterministic research job and rejects malformed payloads", async () => {
    const sent: Array<{ readonly name: string; readonly data: object | null | undefined; readonly id?: string }> = [];
    const result = await enqueueResearchPreparation({ send: async (name, data, options) => { sent.push({ name, data, ...(options?.id ? { id: options.id } : {}) }); return options?.id ?? null; } }, new Date("2026-08-23T01:00:00Z"));
    expect(result).toEqual({ jobId: "manual-research-preparation-2026-08-23", queued: true });
    expect(sent[0]).toMatchObject({ name: RESEARCH_PREPARATION_QUEUE, id: result.jobId, data: { kind: "research_preparation", version: 1 } });
    expect(isResearchPreparationJob(sent[0]?.data)).toBe(true);
    await expect(runResearchPreparationJob({ job: sent[0]?.data, run: async () => {} })).resolves.toBeUndefined();
    await expect(runResearchPreparationJob({ job: { kind: "research_preparation", version: 2 }, run: async () => {} })).rejects.toThrow("Invalid research preparation job");
  });

  it("does not register a blocked scheduler", async () => {
    const clientFactory = vi.fn();
    const scheduler = createResearchScheduler({ clientFactory, config: { cron: RESEARCH_PREPARATION_CRON, enabled: true, handlerEnabled: true, retryDelaySeconds: 1, retryLimit: 1 }, environment: { RESEARCH_SCHEDULER_ENABLED: "true", RESEARCH_HANDLER_ENABLED: "true" }, runPreparation: async () => {} });
    await expect(scheduler.start()).rejects.toThrow("not ready");
    expect(clientFactory).not.toHaveBeenCalled();
    expect(getResearchSchedulerHealth()).toMatchObject({ enabled: true, status: "degraded" });
  });

  it("registers a ready scheduler with UTC scheduling and dispatches validated jobs", async () => {
    const calls: string[] = [];
    let workerHandler: ((jobs: readonly { readonly data: unknown }[]) => Promise<unknown>) | undefined;
    const client = {
      start: async () => { calls.push("start"); },
      stop: async () => { calls.push("stop"); },
      createQueue: async (name: string) => { calls.push(`queue:${name}`); },
      send: async () => null,
      schedule: async (name: string, cron: string, _data?: object | null, options?: { readonly tz?: string }) => { calls.push(`schedule:${name}:${cron}:${options?.tz ?? ""}`); },
      work: async <T>(_name: string, handler: (jobs: readonly { readonly data: T }[]) => Promise<unknown>) => { workerHandler = handler as (jobs: readonly { readonly data: unknown }[]) => Promise<unknown>; calls.push("work"); return "worker"; },
    };
    const runPreparation = vi.fn(async () => { calls.push("run"); });
    const scheduler = createResearchScheduler({ clientFactory: () => client, config: { cron: RESEARCH_PREPARATION_CRON, enabled: true, handlerEnabled: true, retryDelaySeconds: 1, retryLimit: 1 }, environment: { ALPACA_API_KEY: "key", ALPACA_SECRET_KEY: "secret", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "true", DATABASE_URL: "postgres://private", RESEARCH_HANDLER_ENABLED: "true", RESEARCH_SCHEDULER_ENABLED: "true", TRADING_MODE: "paper" }, now: () => new Date("2026-08-23T01:00:00.000Z"), runPreparation });
    await scheduler.start();
    expect(calls).toEqual(["start", `queue:${RESEARCH_PREPARATION_DEAD_LETTER_QUEUE}`, `queue:${RESEARCH_PREPARATION_QUEUE}`, `schedule:${RESEARCH_PREPARATION_QUEUE}:${RESEARCH_PREPARATION_CRON}:UTC`, "work"]);
    await workerHandler?.([{ data: { kind: "research_preparation", version: 1 } }]);
    expect(runPreparation).toHaveBeenCalledTimes(1);
    expect(getResearchSchedulerHealth()).toMatchObject({ enabled: true, handlerEnabled: true, status: "scheduled", lastRunAt: "2026-08-23T01:00:00.000Z", nextRunAt: "2026-08-24T00:00:00.000Z" });
    await scheduler.stop();
    expect(calls.at(-1)).toBe("stop");
  });

  it("enqueues one idempotent recovery job after a missed scheduled tick", async () => {
    vi.useFakeTimers();
    try {
      let current = new Date("2026-08-23T01:00:00.000Z");
      const sent: Array<{ readonly name: string; readonly id?: string }> = [];
      const client = {
        start: async () => {}, stop: async () => {}, createQueue: async () => {},
        send: async (name: string, _data?: object | null, options?: { readonly id?: string }) => { sent.push({ name, ...(options?.id ? { id: options.id } : {}) }); return options?.id ?? null; },
        schedule: async () => {},
        work: async <T>(name: string, handler: (jobs: readonly { readonly data: T }[]) => Promise<unknown>) => { void name; void handler; return "worker"; },
      };
      const onStale = vi.fn();
      const scheduler = createResearchScheduler({ clientFactory: () => client, config: { cron: "*/15 * * * *", enabled: true, handlerEnabled: true, retryDelaySeconds: 1, retryLimit: 1 }, environment: { ALPACA_API_KEY: "key", ALPACA_SECRET_KEY: "secret", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "true", DATABASE_URL: "postgres://private", RESEARCH_HANDLER_ENABLED: "true", RESEARCH_SCHEDULER_ENABLED: "true", TRADING_MODE: "paper" }, now: () => current, onStale, runPreparation: async () => {} });
      await scheduler.start();
      expect(getResearchSchedulerHealth()).toMatchObject({ lastCatchupJobId: "research-startup-20260823T010000000Z", lastCatchupStatus: "queued" });
      current = new Date("2026-08-23T01:18:01.000Z");
      await vi.advanceTimersByTimeAsync(60_000);
      expect(sent).toEqual([
        { name: RESEARCH_PREPARATION_QUEUE, id: "research-startup-20260823T010000000Z" },
        { name: RESEARCH_PREPARATION_QUEUE, id: "research-recovery-20260823T011500000Z" },
      ]);
      expect(onStale).not.toHaveBeenCalled();
      await scheduler.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it("preserves risk-cycle telemetry when a scheduled tick completes", async () => {
    let workerHandler: ((jobs: readonly { readonly data: unknown }[]) => Promise<unknown>) | undefined;
    const client = {
      start: async () => {}, stop: async () => {}, createQueue: async () => {}, send: async () => null, schedule: async () => {},
      work: async <T>(_name: string, handler: (jobs: readonly { readonly data: T }[]) => Promise<unknown>) => { workerHandler = handler as (jobs: readonly { readonly data: unknown }[]) => Promise<unknown>; return "worker"; },
    };
    const scheduler = createResearchScheduler({ clientFactory: () => client, config: { cron: RESEARCH_PREPARATION_CRON, enabled: true, handlerEnabled: true, retryDelaySeconds: 1, retryLimit: 1 }, environment: { ALPACA_API_KEY: "key", ALPACA_SECRET_KEY: "secret", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "true", DATABASE_URL: "postgres://private", RESEARCH_HANDLER_ENABLED: "true", RESEARCH_SCHEDULER_ENABLED: "true", TRADING_MODE: "paper" }, now: () => new Date("2026-08-23T01:00:00.000Z"), runPreparation: async () => { setResearchRiskCycleHealth({ approved: 1, decisions: 2, status: "completed", at: "2026-08-23T01:00:05.000Z" }); } });
    await scheduler.start();
    await workerHandler?.([{ data: { kind: "research_preparation", version: 1 } }]);
    expect(getResearchSchedulerHealth()).toMatchObject({ lastRiskApprovedCount: 1, lastRiskCycleAt: "2026-08-23T01:00:05.000Z", lastRiskCycleStatus: "completed", lastRiskDecisionCount: 2 });
    await scheduler.stop();
  });
});
