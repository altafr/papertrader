import { describe, expect, it } from "vitest";

import { computeMarketIndicatorSnapshot } from "./indicators.js";
import type { StrategyBar } from "./strategy.js";

function bars(count: number): StrategyBar[] {
  return Array.from({ length: count }, (_, index) => {
    const close = String(100 + index + (index % 3 === 0 ? 2 : 0));
    return { close, high: String(Number(close) + 1), low: String(Number(close) - 1), open: close, symbol: "AAA", timestamp: new Date(Date.UTC(2026, 0, 1, index)).toISOString(), volume: String(1_000 + index * 10) };
  });
}

describe("market indicator snapshots", () => {
  it("captures standard indicators from finalized bars", () => {
    const snapshot = computeMarketIndicatorSnapshot({ bars: bars(60) });
    expect(snapshot).toMatchObject({ asOf: "2026-01-03T11:00:00.000Z", close: expect.any(String), ema20: expect.any(String), ema50: expect.any(String), rsi14: expect.any(String), atr14: expect.any(String), relativeVolume20: expect.any(String) });
  });

  it("marks indicators unavailable when lookback is insufficient", () => {
    const snapshot = computeMarketIndicatorSnapshot({ bars: bars(10) });
    expect(snapshot).toMatchObject({ ema20: null, ema50: null, rsi14: null, atr14: null, relativeVolume20: null });
  });
});
