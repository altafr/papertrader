import { describe, expect, it } from "vitest";

import { DAILY_PREPARATION_QUEUE, createDurableScheduler, getDurableSchedulerConfig, getDurableSchedulerHealth } from "./durable-scheduler.js";

describe("durable scheduler", () => {
  it("is disabled by default and validates bounded retry configuration", () => {
    expect(getDurableSchedulerConfig({})).toEqual({ cron: "0 0 * * *", enabled: false, retryDelaySeconds: 60, retryLimit: 3 });
    expect(() => getDurableSchedulerConfig({ DAILY_PREPARATION_RETRY_LIMIT: "11" })).toThrow("must be an integer");
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
});
