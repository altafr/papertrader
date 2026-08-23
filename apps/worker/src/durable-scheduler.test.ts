import { describe, expect, it } from "vitest";

import { DAILY_PREPARATION_QUEUE, createDurableScheduler, enqueueDailyPreparation, getDailyPreparationJobId, getDurableSchedulerConfig, getDurableSchedulerHealth, getDurableSchedulerReadiness, inspectDurableQueues, provisionDurableQueues, validateDurableOneRunId, validateDurableSchedulerApprovalReference, validateDurableSchedulerOneRun } from "./durable-scheduler.js";

describe("durable scheduler", () => {
  it("is disabled by default and validates bounded retry configuration", () => {
    expect(getDurableSchedulerConfig({})).toEqual({ cron: "0 0 * * *", enabled: false, retryDelaySeconds: 60, retryLimit: 3 });
    expect(() => getDurableSchedulerConfig({ DAILY_PREPARATION_RETRY_LIMIT: "11" })).toThrow("must be an integer");
  });

  it("reports disabled, blocked, and ready activation states without exposing credentials", () => {
    expect(getDurableSchedulerReadiness({})).toMatchObject({ status: "disabled", blockedReasons: [] });
    expect(getDurableSchedulerReadiness({ DURABLE_SCHEDULER_ENABLED: "true", TRADING_MODE: "paper", ALPACA_PAPER_TRADE: "true" })).toMatchObject({
      status: "blocked",
      blockedReasons: ["database_not_configured", "broker_connection_disabled", "paper_credentials_not_configured", "daily_preparation_handler_disabled"],
    });
    const ready = getDurableSchedulerReadiness({
      ALPACA_API_KEY: "secret-key",
      ALPACA_SECRET_KEY: "secret-secret",
      ALPACA_PAPER_TRADE: "true",
      BROKER_CONNECTION_ENABLED: "true",
      DAILY_PREPARATION_HANDLER_ENABLED: "true",
      DATABASE_URL: "postgres://redacted",
      DURABLE_SCHEDULER_ENABLED: "true",
      TRADING_MODE: "paper",
    });
    expect(ready).toMatchObject({ status: "ready", blockedReasons: [] });
    expect(JSON.stringify(ready)).not.toContain("secret-key");
    expect(JSON.stringify(ready)).not.toContain("secret-secret");
  });

  it("requires explicit command-scoped gates for one-run activation", () => {
    expect(() => validateDurableSchedulerOneRun({})).toThrow("DAILY_PREPARATION_HANDLER_ENABLED");
    expect(() => validateDurableSchedulerOneRun({ BROKER_CONNECTION_ENABLED: "true", DAILY_PREPARATION_HANDLER_ENABLED: "true", DURABLE_SCHEDULER_ENABLED: "true" })).toThrow("DURABLE_SCHEDULER_ENABLED");
    expect(() => validateDurableSchedulerOneRun({ BROKER_CONNECTION_ENABLED: "true", DAILY_PREPARATION_HANDLER_ENABLED: "true" })).not.toThrow();
    expect(() => validateDurableSchedulerOneRun({ BROKER_CONNECTION_ENABLED: "true", DAILY_PREPARATION_HANDLER_ENABLED: "true", PAPER_AUTOPILOT_ENABLED: "true" })).toThrow("PAPER_AUTOPILOT_ENABLED");
  });

  it("requires a bounded non-secret operator reference for the hosted one-run", () => {
    expect(() => validateDurableSchedulerApprovalReference({})).toThrow("DURABLE_SCHEDULER_APPROVAL_REFERENCE");
    expect(() => validateDurableSchedulerApprovalReference({ DURABLE_SCHEDULER_APPROVAL_REFERENCE: "bad value" })).toThrow("bounded");
    expect(validateDurableSchedulerApprovalReference({ DURABLE_SCHEDULER_APPROVAL_REFERENCE: "ticket-123" })).toBe("ticket-123");
  });

  it("requires a bounded non-secret one-run identifier", () => {
    expect(() => validateDurableOneRunId({})).toThrow("DURABLE_ONE_RUN_ID");
    expect(validateDurableOneRunId({ DURABLE_ONE_RUN_ID: "run-2026-08-23" })).toBe("run-2026-08-23");
  });

  it("creates a UTC schedule and marks failed jobs degraded while preserving the queue boundary", async () => {
    const calls: string[] = [];
    let handler: ((jobs: { data: { kind: "daily_preparation"; version: 1 } }[]) => Promise<unknown>) | undefined;
    const scheduler = createDurableScheduler({
      config: { cron: "0 0 * * *", enabled: true, retryDelaySeconds: 10, retryLimit: 2 },
      connectionString: "postgres://redacted",
      now: () => new Date("2026-08-22T12:00:00.000Z"),
      runDailyPreparation: async () => { throw new Error("controlled failure"); },
      bossFactory: () => ({
        async start() { calls.push("start"); },
        async stop() { calls.push("stop"); },
        async createQueue(name) { calls.push(`queue:${name}`); },
        async schedule(name, cron, _data, options) { calls.push(`schedule:${name}:${cron}:${options?.tz ?? ""}`); },
        async work(_name, nextHandler) { handler = nextHandler as typeof handler; return "worker-1"; },
      }),
    });
    await scheduler.start();
    expect(calls).toContain(`schedule:${DAILY_PREPARATION_QUEUE}:0 0 * * *:UTC`);
    expect(getDurableSchedulerHealth()).toMatchObject({ enabled: true, nextRunAt: "2026-08-23T00:00:00.000Z", status: "scheduled" });
    await expect(handler?.([{ data: { kind: "daily_preparation", version: 1 } }])).rejects.toThrow("controlled failure");
    expect(getDurableSchedulerHealth()).toMatchObject({ status: "degraded" });
    await scheduler.stop();
    expect(calls).toContain("stop");
  });

  it("can be stopped and started again without losing the durable queue registration", async () => {
    let starts = 0;
    let schedules = 0;
    const boss = {
      async start() { starts += 1; },
      async stop() {},
      async createQueue() {},
      async schedule() { schedules += 1; },
      async work() { return "worker"; },
    };
    const scheduler = createDurableScheduler({ config: { cron: "0 0 * * *", enabled: true, retryDelaySeconds: 10, retryLimit: 2 }, connectionString: "postgres://redacted", bossFactory: () => boss, runDailyPreparation: async () => {} });
    await scheduler.start();
    await scheduler.stop();
    await scheduler.start();
    expect(starts).toBe(2);
    expect(schedules).toBe(2);
  });

  it("provisions both the work and dead-letter queues", async () => {
    const queues: string[] = [];
    await provisionDurableQueues({
      async start() {}, async stop() {}, async createQueue(name) { queues.push(name); }, async schedule() {}, async work() { return "worker"; },
    }, getDurableSchedulerConfig({}));
    expect(queues).toEqual(["momentum.daily-preparation.dead-letter", "momentum.daily-preparation"]);
  });

  it("reports queue presence and current counts without exposing connection details", async () => {
    const inspection = await inspectDurableQueues({
      async getQueue(name) { return name === "momentum.daily-preparation" ? { name } : null; },
      async getQueueStats(name) { return name === "momentum.daily-preparation" ? [{ activeCount: 1, failedCount: 2, queuedCount: 3 }] : []; },
    });
    expect(inspection).toEqual({
      deadLetterQueue: { activeCount: 0, failedCount: 0, present: false, queuedCount: 0 },
      workQueue: { activeCount: 1, failedCount: 2, present: true, queuedCount: 3 },
    });
  });

  it("uses a deterministic UTC job ID so a run-once trigger is idempotent", async () => {
    const sent: { readonly data: object | null | undefined; readonly id: string | undefined; readonly name: string }[] = [];
    const now = new Date("2026-08-23T15:30:00.000Z");
    const first = await enqueueDailyPreparation({ async send(name, data, options) { sent.push({ data, id: options?.id, name }); return options?.id ?? null; } }, now);
    const second = await enqueueDailyPreparation({ async send() { return null; } }, now);
    expect(first).toEqual({ jobId: getDailyPreparationJobId(now), queued: true });
    expect(second).toEqual({ jobId: getDailyPreparationJobId(now), queued: false });
    expect(sent[0]).toEqual({ data: { kind: "daily_preparation", version: 1 }, id: "manual-daily-preparation-2026-08-23", name: DAILY_PREPARATION_QUEUE });
  });
});
