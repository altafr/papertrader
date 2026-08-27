import { describe, expect, it, vi } from "vitest";

import type { ResearchAgentInput } from "@momentum/domain";

import { createResearchPreparationPlan, createResearchPreparationQueueHandler, executeResearchPreparation, getResearchPreparationConfig } from "./research-preparation.js";

const input = (assetClass: ResearchAgentInput["assetClass"]): ResearchAgentInput => ({
  assetClass,
  bars: [
    { close: "100", high: "101", low: "99", open: "100", symbol: assetClass === "crypto" ? "BTC/USD" : "AAPL", timestamp: "2026-08-23T00:00:00.000Z", volume: "1000" },
    { close: "101", high: "102", low: "100", open: "101", symbol: assetClass === "crypto" ? "BTC/USD" : "AAPL", timestamp: "2026-08-23T01:00:00.000Z", volume: "1100" },
  ],
  capturedAt: "2026-08-23T02:00:00.000Z",
  freshness: "fresh",
  maxCandidates: 10,
  source: "alpaca",
});

describe("research preparation", () => {
  it("builds bounded stock and crypto plans from explicit symbols", () => {
    const config = getResearchPreparationConfig({ RESEARCH_STOCK_SYMBOLS: " aapl, msft ", RESEARCH_CRYPTO_SYMBOLS: "btc/usd, eth/usd", RESEARCH_LIMIT: "20", RESEARCH_MAX_CANDIDATES: "5" });
    expect(config).toMatchObject({ limit: 20, maxCandidates: 5, stockSymbols: ["AAPL", "MSFT"], cryptoSymbols: ["BTC/USD", "ETH/USD"] });
    expect(createResearchPreparationPlan(config).map((plan) => [plan.agentType, plan.assetClass, plan.symbols])).toEqual([
      ["stock_research", "us_equity", ["AAPL", "MSFT"]],
      ["crypto_research", "crypto", ["BTC/USD", "ETH/USD"]],
    ]);
    expect(createResearchPreparationPlan(config).map((plan) => plan.timeframe)).toEqual(["1Day", "1Hour"]);
  });

  it("rejects duplicate or unbounded preparation configuration", () => {
    expect(() => getResearchPreparationConfig({ RESEARCH_SYMBOLS: "AAPL,AAPL" })).toThrow("duplicate");
    expect(() => getResearchPreparationConfig({ RESEARCH_STOCK_SYMBOLS: "AAPL", RESEARCH_CRYPTO_SYMBOLS: "BTC/USD", RESEARCH_LIMIT: "1001" })).toThrow("integer");
  });

  it("hands fresh source input to the deterministic handler and persistence boundary", async () => {
    const calls: string[] = [];
    const persistence = {
      enqueue: async () => { calls.push("enqueue"); },
      start: async () => { calls.push("start"); },
      succeed: async () => { calls.push("succeed"); },
      fail: async () => { calls.push("fail"); },
    };
    const result = await executeResearchPreparation({
      clock: () => new Date("2026-08-23T02:01:00.000Z"),
      persistence,
      preparation: { agentType: "stock_research", assetClass: "us_equity", limit: 2, maxCandidates: 10, symbols: ["AAPL"], timeframe: "1Day" },
      source: { read: vi.fn(async () => input("us_equity")) },
    });
    expect(result).toEqual({ agentType: "stock_research", recommendationEvidence: ["AAPL: momentum 0.01000000, avg volume 1050.00000000, RSI14 not reported, RV20 not reported"], recommendationSymbols: ["AAPL"], runId: "research-preparation-stock_research-20260823020000", status: "succeeded" });
    expect(calls).toEqual(["enqueue", "start", "succeed"]);
  });

  it("fails closed before source access unless every readiness gate is ready", async () => {
    const source = { read: vi.fn(async () => input("us_equity")) };
    const handler = createResearchPreparationQueueHandler({ environment: { RESEARCH_SCHEDULER_ENABLED: "true" }, persistence: { enqueue: async () => {}, start: async () => {}, succeed: async () => {}, fail: async () => {} }, source });
    await expect(handler({ kind: "research_preparation", version: 1 })).rejects.toThrow("not ready");
    expect(source.read).not.toHaveBeenCalled();
  });

  it("runs both bounded asset-class plans only with explicit readiness", async () => {
    const source = { read: vi.fn(async (plan) => input(plan.assetClass)) };
    const calls: string[] = [];
    const handler = createResearchPreparationQueueHandler({
      clock: () => new Date("2026-08-23T02:01:00.000Z"),
      environment: { ALPACA_API_KEY: "paper-key", ALPACA_SECRET_KEY: "paper-secret", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "true", DATABASE_URL: "postgres://private", RESEARCH_CRYPTO_SYMBOLS: "BTC/USD", RESEARCH_HANDLER_ENABLED: "true", RESEARCH_SCHEDULER_ENABLED: "true", RESEARCH_STOCK_SYMBOLS: "AAPL", TRADING_MODE: "paper" },
      persistence: { enqueue: async () => { calls.push("enqueue"); }, start: async () => { calls.push("start"); }, succeed: async () => { calls.push("succeed"); }, fail: async () => { calls.push("fail"); } },
      source,
    });
    const results = await handler({ kind: "research_preparation", version: 1 });
    expect(results).toHaveLength(2);
    expect(source.read).toHaveBeenCalledTimes(2);
    expect(calls.filter((call) => call === "succeed")).toHaveLength(2);
    expect(calls).not.toContain("fail");
  });

  it("retains a successful asset artifact when another asset source is unavailable", async () => {
    const source = { read: vi.fn(async (plan) => {
      if (plan.assetClass === "crypto") throw new Error("insufficient bars");
      return input("us_equity");
    }) };
    const handler = createResearchPreparationQueueHandler({
      environment: { ALPACA_API_KEY: "paper-key", ALPACA_SECRET_KEY: "paper-secret", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "true", DATABASE_URL: "postgres://private", RESEARCH_CRYPTO_SYMBOLS: "BTC/USD", RESEARCH_HANDLER_ENABLED: "true", RESEARCH_SCHEDULER_ENABLED: "true", RESEARCH_STOCK_SYMBOLS: "AAPL", TRADING_MODE: "paper" },
      persistence: { enqueue: async () => {}, start: async () => {}, succeed: async () => {}, fail: async () => {} },
      source,
    });
    await expect(handler({ kind: "research_preparation", version: 1 })).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ agentType: "stock_research", recommendationSymbols: ["AAPL"], status: "succeeded", runId: expect.any(String) }), { agentType: "crypto_research", status: "failed", runId: expect.any(String) }]));
  });
});
