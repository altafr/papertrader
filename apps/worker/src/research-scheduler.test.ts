import { describe, expect, it, vi } from "vitest";
import { createResearchScheduler, enqueueResearchPreparation, getNextResearchRunAt, getResearchPreparationJobId, getResearchScheduleConfig, getResearchScheduleReadiness, getResearchSchedulerHealth, isResearchPreparationJob, provisionResearchQueues, runResearchPreparationJob, RESEARCH_PREPARATION_CRON, RESEARCH_PREPARATION_DEAD_LETTER_QUEUE, RESEARCH_PREPARATION_QUEUE } from "./research-scheduler.js";

describe("research schedule boundary", () => {
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

  it("provisions a separately named research queue with bounded retries", async () => {
    const calls: Array<{ readonly name: string; readonly options?: object }> = [];
    await provisionResearchQueues({ createQueue: async (name, options) => { calls.push({ name, ...(options ? { options } : {}) }); }, schedule: async () => {}, work: async () => "worker" }, getResearchScheduleConfig({ RESEARCH_RETRY_DELAY_SECONDS: "30", RESEARCH_RETRY_LIMIT: "1" }));
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
});
