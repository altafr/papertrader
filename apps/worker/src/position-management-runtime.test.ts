import { describe, expect, it } from "vitest";

import { buildPaperExitSubmittedMessage, buildPositionExitDecisionLog, buildPositionExitDecisionMessage, buildPositionManagementLog, buildUnmanagedPositionLog, getActiveExitIntentIds, getFreshPositionMark, getPaperOrderStatusTransitions, getPositionDetectedDedupeKey, getPositionExitDecisionDedupeKey, getPositionExitIntentId, groupPositionSymbolsByAssetClass, isTerminalPaperOrderStatus } from "./position-management-runtime.js";
import { assessPositionManagementLiveness } from "./position-management-scheduler.js";

describe("paper order status transitions", () => {
  it("returns only changed orders", () => {
    expect(getPaperOrderStatusTransitions([{ alpacaOrderId: "one", status: "accepted", symbol: "AAPL" }, { alpacaOrderId: "two", status: "filled", symbol: "MSFT" }], [{ alpacaOrderId: "one", status: "filled", symbol: "AAPL" }, { alpacaOrderId: "two", status: "filled", symbol: "MSFT" }, { alpacaOrderId: "three", status: "accepted", symbol: "TSLA" }])).toEqual([{ alpacaOrderId: "one", from: "accepted", status: "filled", symbol: "AAPL" }]);
  });

  it("classifies broker terminal states including failure and cancellation variants", () => {
    expect(isTerminalPaperOrderStatus("filled")).toBe(true);
    expect(isTerminalPaperOrderStatus("CANCELLED")).toBe(true);
    expect(isTerminalPaperOrderStatus("failed")).toBe(true);
    expect(isTerminalPaperOrderStatus("accepted")).toBe(false);
  });
});

describe("position market-data grouping", () => {
  it("keeps equity and crypto symbols on their own Alpaca data routes", () => {
    expect(groupPositionSymbolsByAssetClass([
      { assetClass: "us_equity", symbol: "AAPL" },
      { assetClass: "crypto", symbol: "BTC/USD" },
      { assetClass: "crypto", symbol: "BTC/USD" },
    ])).toEqual([
      { assetClass: "us_equity", symbols: ["AAPL"] },
      { assetClass: "crypto", symbols: ["BTC/USD"] },
    ]);
  });

  it("rejects stale marks and accepts a fresh timestamped trade", () => {
    const now = new Date("2026-08-29T00:05:00.000Z");
    expect(getFreshPositionMark({ symbol: "BTC/USD", latestTrade: { price: "100", timestamp: "2026-08-28T23:59:00.000Z" } }, now)).toBeUndefined();
    expect(getFreshPositionMark({ symbol: "BTC/USD", latestTrade: { price: "100", timestamp: "2026-08-29T00:04:30.000Z" } }, now)).toBe("100");
    expect(getFreshPositionMark({ symbol: "BTC/USD", latestQuote: { askPrice: "101", bidPrice: "99", timestamp: "2026-08-29T00:04:30.000Z" } }, now)).toBe("99");
  });
});

describe("position alert deduplication", () => {
  it("uses stable keys across scheduler restarts and repeated passes", () => {
    expect(getPositionDetectedDedupeKey("crypto", "BTC/USD", "intent-1")).toBe("position_detected:crypto:BTC/USD:intent-1");
    expect(getPositionDetectedDedupeKey("unexpected", "AAPL")).toBe("position_detected:us_equity:AAPL:unknown");
    expect(getPositionExitDecisionDedupeKey("intent-1", "stop_loss")).toBe("position_exit_decision:intent-1:stop_loss");
    expect(getPositionExitIntentId("intent-1-exit-stop_loss")).toBe("intent-1:exit");
  });

  it("recognizes only non-terminal exit submissions as active", () => {
    expect([...getActiveExitIntentIds([
      { clientOrderId: "intent-1-exit-stop_loss", intentId: "intent-1:exit", status: "accepted" },
      { clientOrderId: "intent-2-exit-profit_target", intentId: "intent-2:exit", status: "filled" },
      { clientOrderId: "intent-3-paper", intentId: "intent-3", status: "accepted" },
    ])]).toEqual(["intent-1:exit"]);
  });
});

describe("position scheduler liveness", () => {
  it("degrades after two missed intervals", () => {
    const health = { lastRunAt: "2026-08-29T00:00:00.000Z", status: "ready" as const };
    expect(assessPositionManagementLiveness(health, 60, new Date("2026-08-29T00:01:59.000Z"))).toBe("ready");
    expect(assessPositionManagementLiveness(health, 60, new Date("2026-08-29T00:02:01.000Z"))).toBe("degraded");
  });
});

describe("position pass observability", () => {
  it("builds a bounded unmanaged-position warning", () => {
    expect(buildUnmanagedPositionLog(["BTC/USD", "", "ETH/USD"])).toEqual({ event: "unmanaged_position_detected", level: "warn", symbols: ["BTC/USD", "ETH/USD"] });
  });

  it("builds a bounded credential-free pass record", () => {
    expect(buildPositionManagementLog({ managed: 1, positions: 2, submitted: 0 })).toEqual({ event: "position_management_pass", managed: 1, positions: 2, submitted: 0 });
    expect(buildPositionManagementLog({ managed: 2, positions: 3, submitted: 0, symbols: ["AAPL", "BTC/USD"] })).toEqual({ event: "position_management_pass", managed: 2, positions: 3, submitted: 0, symbols: ["AAPL", "BTC/USD"] });
  });

  it("builds a bounded decision record with an explicit no-exit reason", () => {
    expect(buildPositionExitDecisionLog({ shouldExit: false, symbol: "AAPL" })).toEqual({ event: "position_exit_decision", reason: null, shouldExit: false, submitted: false, symbol: "AAPL" });
    expect(buildPositionExitDecisionLog({ reason: "stop_loss", shouldExit: true, submitted: true, symbol: "BTC/USD" })).toEqual({ event: "position_exit_decision", reason: "stop_loss", shouldExit: true, submitted: true, symbol: "BTC/USD" });
    expect(buildPositionExitDecisionLog({ currentPrice: "95", entryPrice: "100", plannedStopPrice: "95", reason: "stop_loss", shouldExit: true, strategyKey: "momentum", strategyVersion: "1.0.0", symbol: "AAPL", timeStopAt: "2026-08-30T00:00:00.000Z" })).toMatchObject({ currentPrice: "95", entryPrice: "100", plannedStopPrice: "95", strategyKey: "momentum", strategyVersion: "1.0.0", timeStopAt: "2026-08-30T00:00:00.000Z" });
  });

  it("explains an exit with the stored deterministic plan", () => {
    expect(buildPositionExitDecisionMessage({ currentPrice: "95", entryPrice: "100", plannedStopPrice: "95", plannedTargetPrice: "104", reason: "stop_loss", strategyKey: "momentum", strategyVersion: "1.0.0", symbol: "AAPL" })).toContain("Strategy momentum 1.0.0; entry 100, stop 95, target 104");
    expect(buildPositionExitDecisionMessage({ currentPrice: "95", entryPrice: "100", plannedStopPrice: "95", reason: "time_stop", strategyKey: "momentum", strategyVersion: "1.0.0", symbol: "AAPL", timeStopAt: "2026-08-30T00:00:00.000Z" })).toContain("time stop 2026-08-30T00:00:00.000Z");
  });

  it("includes bounded symbols and deterministic reasons in the aggregate exit alert", () => {
    expect(buildPaperExitSubmittedMessage([{ symbol: "AAPL", reason: "stop_loss" }, { symbol: "BTC/USD", reason: "profit_target" }])).toContain("AAPL (stop_loss), BTC/USD (profit_target)");
  });
});
