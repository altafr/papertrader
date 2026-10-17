import { describe, expect, it, vi } from "vitest";
import { buildPositionExitClientOrderId, runPaperPositionManagementOnce } from "./position-management-runner.js";

const position = { assetClass: "us_equity" as const, currentPrice: "95", entryPrice: "100", plannedStopPrice: "95", plannedTargetPrice: "104", quantity: "1", strategyKey: "momentum", strategyVersion: "1.0.0", symbol: "AAPL", intentId: "intent-1" };

describe("paper position management runner", () => {
  it("books long profits and retains the full source intent even when the broker ID is truncated", async () => {
    const submitExit = vi.fn().mockResolvedValue({ symbol: "AAPL" });
    const intentId = "a-very-long-position-lifecycle-id-that-must-not-be-truncated-in-the-ledger";
    const result = await runPaperPositionManagementOnce({ now: "2026-10-16T15:00:00Z", positions: [{ ...position, intentId, currentPrice: "107" }], submitter: { submitExit } });
    expect(result.submitted).toBe(1);
    expect(submitExit).toHaveBeenCalledWith(expect.objectContaining({ sourceIntentId: intentId, closingSide: "sell", quantity: "1" }));
  });
  it("does not submit if broker reconciliation finds the position already closed", async () => {
    const submitExit = vi.fn();
    const result = await runPaperPositionManagementOnce({ now: "2026-10-16T15:00:00Z", positions: [position], prepareExit: async () => undefined, submitter: { submitExit } });
    expect(result.submitted).toBe(0);
    expect(submitExit).not.toHaveBeenCalled();
  });
  it("books a short profit with a positive buy-to-cover quantity", async () => {
    const submitExit = vi.fn().mockResolvedValue({ symbol: "AAPL", status: "accepted" });
    const result = await runPaperPositionManagementOnce({ now: "2026-10-16T15:00:00Z", positions: [{ ...position, side: "short", quantity: "-48.00000000", currentPrice: "90", plannedStopPrice: "105", plannedTargetPrice: "94" }], submitter: { submitExit } });
    expect(result).toMatchObject({ submitted: 1, failures: [] });
    expect(submitExit).toHaveBeenCalledWith(expect.objectContaining({ quantity: "48", closingSide: "buy", timeInForce: "gtc", decision: expect.objectContaining({ reason: "profit_target" }) }));
  });
  it("normalizes long or slash-containing exit IDs to Alpaca-safe format", () => {
    const id = buildPositionExitClientOrderId("legacy-adoption:crypto:BTC/USD:very-long-order-reference", "stop_loss");
    expect(id).toMatch(/^[A-Za-z0-9._:-]{1,48}$/);
    expect(id.endsWith("-exit-stop_loss")).toBe(true);
  });
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

  it("isolates an exit submission failure while evaluating other positions", async () => {
    const submitExit = vi.fn().mockRejectedValue(new Error("broker unavailable"));
    const result = await runPaperPositionManagementOnce({ now: "2026-08-27T00:00:00Z", positions: [position], submitter: { submitExit } });
    expect(result).toMatchObject({ failures: [{ assetClass: "us_equity", error: "broker unavailable", symbol: "AAPL" }], submitted: 0 });
  });

  it("continues to submit an independent position after another broker failure", async () => {
    const submitExit = vi.fn().mockRejectedValueOnce(new Error("crypto entitlement blocked")).mockResolvedValueOnce({ alpacaOrderId: "equity-1" });
    const result = await runPaperPositionManagementOnce({ now: "2026-08-27T00:00:00Z", positions: [{ ...position, assetClass: "crypto", symbol: "BTC/USD" }, position], submitter: { submitExit } });
    expect(result).toMatchObject({ failures: [{ symbol: "BTC/USD" }], submitted: 1, submissions: [{ alpacaOrderId: "equity-1" }] });
  });
});
