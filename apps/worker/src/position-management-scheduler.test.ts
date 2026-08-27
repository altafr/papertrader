import { describe, expect, it, vi } from "vitest";
import { createPositionManagementScheduler } from "./position-management-scheduler.js";

describe("position management scheduler", () => {
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
});
