import { describe, expect, it, vi } from "vitest";

import { reconcileBeforeSchedulerStart } from "./startup-recovery.js";

describe("startup recovery gate", () => {
  it("starts scheduling only after reconciliation succeeds", async () => {
    const reconcile = vi.fn(async () => undefined);
    const startScheduler = vi.fn(async () => undefined);
    const result = await reconcileBeforeSchedulerStart({ reconcile, onFailure: vi.fn(), startScheduler });
    expect(result).toBe(true);
    expect(reconcile).toHaveBeenCalledOnce();
    expect(startScheduler).toHaveBeenCalledOnce();
  });

  it("keeps scheduling paused when reconciliation fails", async () => {
    const reconcile = vi.fn(async () => { throw new Error("provider detail"); });
    const onFailure = vi.fn(async () => undefined);
    const startScheduler = vi.fn(async () => undefined);
    const result = await reconcileBeforeSchedulerStart({ reconcile, onFailure, startScheduler });
    expect(result).toBe(false);
    expect(onFailure).toHaveBeenCalledOnce();
    expect(startScheduler).not.toHaveBeenCalled();
  });
});
