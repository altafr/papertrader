import { describe, expect, it } from "vitest";
import { evaluatePaperPositionExit } from "./position-management.js";

const base = { assetClass: "us_equity" as const, currentPrice: "100", entryPrice: "100", plannedStopPrice: "95", plannedTargetPrice: "104", quantity: "1", strategyKey: "momentum", strategyVersion: "1.0.0", symbol: "AAPL" };

describe("paper position management", () => {
  it("exits at the stop before considering a target", () => expect(evaluatePaperPositionExit({ ...base, currentPrice: "95" }, "2026-08-27T00:00:00Z")).toMatchObject({ shouldExit: true, reason: "stop_loss" }));
  it("exits at a reached profit target", () => expect(evaluatePaperPositionExit({ ...base, currentPrice: "104" }, "2026-08-27T00:00:00Z")).toMatchObject({ shouldExit: true, reason: "profit_target" }));
  it("exits at a time stop when price thresholds are not reached", () => expect(evaluatePaperPositionExit({ ...base, timeStopAt: "2026-08-27T00:00:00Z" }, "2026-08-27T00:00:01Z")).toMatchObject({ shouldExit: true, reason: "time_stop" }));
  it("holds a position when no exit rule is triggered", () => expect(evaluatePaperPositionExit(base, "2026-08-27T00:00:00Z")).toMatchObject({ shouldExit: false }));
});
