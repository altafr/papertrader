import { describe, expect, it, vi } from "vitest";
import { createPositionManagementScheduler, getPositionManagementHealth, setPositionManagementUnmanagedCount } from "./position-management-scheduler.js";

describe("position management scheduler", () => {
  it("records a bounded unmanaged-position count for operator health", () => {
    setPositionManagementUnmanagedCount(3.9);
    expect(getPositionManagementHealth()).toMatchObject({ unmanagedCount: 3 });
    setPositionManagementUnmanagedCount(0);
  });

  it("runs immediately, records readiness, and stops", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const scheduler = createPositionManagementScheduler({ intervalSeconds: 30, run });
    scheduler.start();
    await vi.waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    expect(scheduler.status().status).toBe("ready");
    await scheduler.stop();
    expect(scheduler.status().status).toBe("disabled");
  });

  it("marks failures degraded without throwing from the timer", async () => {
    const scheduler = createPositionManagementScheduler({ intervalSeconds: 30, run: vi.fn().mockRejectedValue(new Error("broker unavailable")) });
    scheduler.start();
    await vi.waitFor(() => expect(scheduler.status()).toMatchObject({ status: "degraded", lastError: "broker unavailable" }));
    await scheduler.stop();
  });

  it("fires one stale-pass callback after two missed intervals", async () => {
    vi.useFakeTimers();
    try {
      const onFailure = vi.fn();
      const run = vi.fn().mockResolvedValueOnce(undefined).mockImplementationOnce(() => new Promise<void>(() => {}));
      const scheduler = createPositionManagementScheduler({ intervalSeconds: 30, onFailure, run });
      scheduler.start();
      await vi.waitFor(() => expect(scheduler.status().status).toBe("ready"));
      vi.advanceTimersByTime(91_000);
      await Promise.resolve();
      expect(onFailure).toHaveBeenCalledTimes(1);
      expect(scheduler.status()).toMatchObject({ lastError: "position_management_stale", status: "degraded" });
      await scheduler.stop();
    } finally { vi.useRealTimers(); }
  });
});
