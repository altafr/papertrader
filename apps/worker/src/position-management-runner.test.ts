import { describe, expect, it, vi } from "vitest";
import { runPaperPositionManagementOnce } from "./position-management-runner.js";

const position = { assetClass: "us_equity" as const, currentPrice: "95", entryPrice: "100", plannedStopPrice: "95", plannedTargetPrice: "104", quantity: "1", strategyKey: "momentum", strategyVersion: "1.0.0", symbol: "AAPL", intentId: "intent-1" };

describe("paper position management runner", () => {
  it("submits one idempotent exit for a deterministic stop", async () => {
    const submitExit = vi.fn().mockResolvedValue({});
    const result = await runPaperPositionManagementOnce({ now: "2026-08-27T00:00:00Z", positions: [position], submitter: { submitExit } });
    expect(result).toMatchObject({ submitted: 1, submissions: [{}] });
    expect(submitExit).toHaveBeenCalledWith(expect.objectContaining({ clientOrderId: "intent-1-exit-stop_loss", quantity: "1" }));
  });

  it("does not submit when no exit threshold is reached", async () => {
    const submitExit = vi.fn();
    const result = await runPaperPositionManagementOnce({ now: "2026-08-27T00:00:00Z", positions: [{ ...position, currentPrice: "101" }], submitter: { submitExit } });
    expect(result).toMatchObject({ submitted: 0, decisions: [{ shouldExit: false }] });
    expect(submitExit).not.toHaveBeenCalled();
  });

  it("does not submit a second exit while the same exit intent is active", async () => {
    const submitExit = vi.fn();
    const result = await runPaperPositionManagementOnce({ now: "2026-08-27T00:00:00Z", positions: [position], activeExitIntentIds: new Set(["intent-1:exit"]), submitter: { submitExit } });
    expect(result).toMatchObject({ submitted: 0, decisions: [{ shouldExit: true, reason: "stop_loss" }] });
    expect(submitExit).not.toHaveBeenCalled();
  });

  it("fails closed when an exit submission fails", async () => {
    const submitExit = vi.fn().mockRejectedValue(new Error("broker unavailable"));
    await expect(runPaperPositionManagementOnce({ now: "2026-08-27T00:00:00Z", positions: [position], submitter: { submitExit } })).rejects.toThrow("broker unavailable");
  });
});
