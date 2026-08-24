import { describe, expect, it } from "vitest";

import { DAILY_PREPARATION_QUEUE, createDurableScheduler, enqueueDailyPreparation, ensureDurableQueues, getDailyPreparationJobId, getDurableOneRunJobId, getDurableSchedulerConfig, getDurableSchedulerHealth, getDurableSchedulerReadiness, inspectDurableQueues, parseDurableDailyJob, provisionDurableQueues, validateDurableOneRunId, validateDurableSchedulerActivation, validateDurableSchedulerAuditActivation, validateDurableSchedulerApprovalReference, validateDurableSchedulerOneRun } from "./durable-scheduler.js";

describe("durable scheduler", () => {
  it("is disabled by default and validates bounded retry configuration", () => {
    expect(getDurableSchedulerConfig({})).toEqual({ cron: "0 0 * * *", enabled: false, retryDelaySeconds: 60, retryLimit: 3 });
    expect(() => getDurableSchedulerConfig({ DAILY_PREPARATION_RETRY_LIMIT: "11" })).toThrow("must be an integer");
  });

  it("reports disabled, blocked, and ready activation states without exposing credentials", () => {
    expect(getDurableSchedulerReadiness({})).toMatchObject({ status: "disabled", blockedReasons: [] });
    expect(getDurableSchedulerReadiness({ DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE: "scheduler-review-123", DURABLE_SCHEDULER_ENABLED: "true", TRADING_MODE: "paper", ALPACA_PAPER_TRADE: "true" })).toMatchObject({
      status: "blocked",
      blockedReasons: ["database_not_configured", "broker_connection_disabled", "paper_credentials_not_configured", "daily_preparation_handler_disabled"],
      checks: { activationApprovalReferencePresent: true },
    });
    const ready = getDurableSchedulerReadiness({
      ALPACA_API_KEY: "secret-key",
      ALPACA_SECRET_KEY: "secret-secret",
      ALPACA_PAPER_TRADE: "true",
      BROKER_CONNECTION_ENABLED: "true",
      DAILY_PREPARATION_HANDLER_ENABLED: "true",
      DATABASE_URL: "postgres://redacted",
      DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE: "scheduler-review-123",
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

  it("requires a separate activation reference only for persistent scheduling", () => {
    expect(validateDurableSchedulerActivation({})).toBeUndefined();
    expect(() => validateDurableSchedulerActivation({ DURABLE_SCHEDULER_ENABLED: "true" })).toThrow("ACTIVATION_APPROVAL_REFERENCE");
    expect(validateDurableSchedulerActivation({ DURABLE_SCHEDULER_ENABLED: "true", DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE: "scheduler-review-123" })).toBe("scheduler-review-123");
    expect(getDurableSchedulerReadiness({ DURABLE_SCHEDULER_ENABLED: "true", TRADING_MODE: "paper", ALPACA_PAPER_TRADE: "true" }).blockedReasons).toContain("scheduler_activation_approval_reference_missing");
    expect(getDurableSchedulerReadiness({ DURABLE_SCHEDULER_ENABLED: "true", TRADING_MODE: "paper", ALPACA_PAPER_TRADE: "true" }).checks.activationApprovalReferencePresent).toBe(false);
    expect(getDurableSchedulerConfig({ DURABLE_SCHEDULER_ENABLED: "true", DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE: "scheduler-review-123" })).toMatchObject({ enabled: true, activationApprovalReference: "scheduler-review-123" });
  });

  it("requires a separate bounded reference before scheduler audit writes can start", () => {
    expect(validateDurableSchedulerAuditActivation({})).toBeUndefined();
    expect(() => validateDurableSchedulerAuditActivation({ DURABLE_SCHEDULER_AUDIT_ENABLED: "true" })).toThrow("AUDIT_ACTIVATION_APPROVAL_REFERENCE");
    expect(() => validateDurableSchedulerAuditActivation({ DURABLE_SCHEDULER_AUDIT_ENABLED: "true", DURABLE_SCHEDULER_AUDIT_ACTIVATION_APPROVAL_REFERENCE: "bad value" })).toThrow("bounded");
    expect(validateDurableSchedulerAuditActivation({ DURABLE_SCHEDULER_AUDIT_ENABLED: "true", DURABLE_SCHEDULER_AUDIT_ACTIVATION_APPROVAL_REFERENCE: "scheduler-audit-activate-123" })).toBe("scheduler-audit-activate-123");
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

  it("validates queue payloads before scheduler handlers receive them", () => {
    expect(parseDurableDailyJob({ kind: "daily_preparation", version: 1, runId: "run-1" })).toEqual({ kind: "daily_preparation", version: 1, runId: "run-1" });
    expect(() => parseDurableDailyJob({ kind: "unexpected", version: 1 })).toThrow("payload is invalid");
    expect(() => parseDurableDailyJob({ kind: "daily_preparation", version: 2 })).toThrow("payload is invalid");
    expect(() => parseDurableDailyJob({ kind: "daily_preparation", version: 1, runId: "bad value" })).toThrow("payload is invalid");
  });

  it("creates a UTC schedule and marks failed jobs degraded while preserving the queue boundary", async () => {
    const calls: string[] = [];
    const alerts: string[] = [];
    let handler: ((jobs: { data: { kind: "daily_preparation"; version: 1 } }[]) => Promise<unknown>) | undefined;
    const scheduler = createDurableScheduler({
      config: { cron: "0 0 * * *", enabled: true, retryDelaySeconds: 10, retryLimit: 2 },
      connectionString: "postgres://redacted",
      now: () => new Date("2026-08-22T12:00:00.000Z"),
      runDailyPreparation: async () => { throw new Error("controlled failure"); },
      notify: async (alert) => { alerts.push(alert.code); },
      bossFactory: () => ({
        async start() { calls.push("start"); },
        async stop() { calls.push("stop"); },
        async createQueue(name) { calls.push(`queue:${name}`); },
        async getQueue(name) { return { name }; },
        async getQueueStats() { return [{ activeCount: 0, failedCount: 0, queuedCount: 0 }]; },
        async schedule(name, cron, _data, options) { calls.push(`schedule:${name}:${cron}:${options?.tz ?? ""}`); },
        async work(_name, nextHandler) { handler = nextHandler as typeof handler; return "worker-1"; },
      }),
    });
    await scheduler.start();
    expect(calls).toContain(`schedule:${DAILY_PREPARATION_QUEUE}:0 0 * * *:UTC`);
    expect(getDurableSchedulerHealth()).toMatchObject({ enabled: true, nextRunAt: "2026-08-23T00:00:00.000Z", status: "scheduled" });
    await expect(handler?.([{ data: { kind: "daily_preparation", version: 1 } }])).rejects.toThrow("controlled failure");
    expect(getDurableSchedulerHealth()).toMatchObject({ status: "degraded" });
    expect(alerts).toEqual(["durable_scheduler_runtime_failed"]);
    await scheduler.stop();
    expect(calls).toContain("stop");
  });

  it("records optional scheduled-run audit transitions without changing the queue contract", async () => {
    const audit: string[] = [];
    let handler: ((jobs: { data: { kind: "daily_preparation"; version: 1 } }[]) => Promise<unknown>) | undefined;
    const scheduler = createDurableScheduler({
      audit: {
        async start(runId) { audit.push(`start:${runId}`); },
        async complete(runId, _completedAt, snapshotId) { audit.push(`complete:${runId}:${snapshotId}`); },
        async fail(runId, _completedAt, code) { audit.push(`fail:${runId}:${code}`); },
      },
      config: { cron: "0 0 * * *", enabled: true, retryDelaySeconds: 10, retryLimit: 2 },
      connectionString: "postgres://redacted",
      now: () => new Date("2026-08-25T00:00:03.000Z"),
      runDailyPreparation: async () => ({ accountSnapshotId: "snapshot-1" }),
      bossFactory: () => ({
        async start() {}, async stop() {}, async createQueue() {}, async getQueue(name) { return { name }; }, async getQueueStats() { return [{ activeCount: 0, failedCount: 0, queuedCount: 0 }]; }, async schedule() {}, async work(_name, nextHandler) { handler = nextHandler as typeof handler; return "worker-1"; },
      }),
    });
    await scheduler.start();
    await handler?.([{ data: { kind: "daily_preparation", version: 1 } }]);
    expect(audit).toEqual(["start:scheduled-daily-preparation-2026-08-25", "complete:scheduled-daily-preparation-2026-08-25:snapshot-1"]);
  });

  it("can be stopped and started again without losing the durable queue registration", async () => {
    let starts = 0;
    let schedules = 0;
    const boss = {
      async start() { starts += 1; },
      async stop() {},
      async createQueue() {},
      async getQueue(name: string) { return { name }; },
      async getQueueStats() { return [{ activeCount: 0, failedCount: 0, queuedCount: 0 }]; },
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

  it("does not reprovision queues that already exist", async () => {
    const created: string[] = [];
    const boss = {
      async createQueue(name: string) { created.push(name); },
      async getQueue(name: string) { return { name }; },
      async getQueueStats() { return []; },
    } as never;
    await ensureDurableQueues(boss, getDurableSchedulerConfig({}));
    expect(created).toEqual([]);
  });

  it("maps operator run IDs to deterministic UUID job IDs for pg-boss", () => {
    const first = getDurableOneRunJobId("paper-reconciliation-retry-20260823-01");
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(getDurableOneRunJobId("paper-reconciliation-retry-20260823-01")).toBe(first);
    expect(getDurableOneRunJobId("paper-reconciliation-retry-20260823-02")).not.toBe(first);
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
