import { describe, expect, it } from "vitest";

import { createPaperAccountReader, createPaperAssetReader, createPaperMarketDataReader } from "./index.js";

describe("paper account reader", () => {
  it("reads and normalizes account values without an order interface", async () => {
    const reader = createPaperAccountReader({
      apiKey: "paper-key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            buying_power: "1000.00",
            cash: "1000.00",
            currency: "USD",
            equity: "1000.00",
            id: "account-1",
            last_equity: "999.00",
            status: "ACTIVE",
          }),
          { status: 200 },
        ),
      secretKey: "paper-secret",
    });

    await expect(reader.readAccount()).resolves.toEqual({
      accountId: "account-1",
      buyingPower: "1000.00",
      cash: "1000.00",
      currency: "USD",
      equity: "1000.00",
      lastEquity: "999.00",
      status: "ACTIVE",
    });
    expect("submitOrder" in reader).toBe(false);
  });

  it("rejects a non-paper endpoint", () => {
    expect(() =>
      createPaperAccountReader({
        apiKey: "paper-key",
        baseUrl: "https://api.alpaca.markets",
        secretKey: "paper-secret",
      }),
    ).toThrow("only permits the Alpaca paper endpoint");
  });

  it("normalizes the read-only account state bundle", async () => {
    const reader = createPaperAccountReader({
      activityDate: "2026-08-22",
      apiKey: "paper-key",
      fetchImpl: async (input) => {
        const url = String(input);
        if (url.endsWith("/v2/account")) {
          return new Response(
            JSON.stringify({
              buying_power: "1000.00",
              cash: "1000.00",
              currency: "USD",
              equity: "1000.00",
              id: "account-1",
              status: "ACTIVE",
            }),
            { status: 200 },
          );
        }
        if (url.endsWith("/v2/positions")) {
          return new Response(
            JSON.stringify([
              {
                asset_class: "us_equity",
                avg_entry_price: "10.00",
                market_value: "20.00",
                qty: "2",
                symbol: "TEST",
                unrealized_pl: "1.00",
              },
            ]),
            { status: 200 },
          );
        }
        if (url.includes("/v2/orders")) {
          return new Response(
            JSON.stringify([
              {
                asset_class: "us_equity",
                id: "order-1",
                side: "buy",
                status: "filled",
                symbol: "TEST",
                type: "market",
              },
            ]),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify([
            { activity_type: "FILL", id: "activity-1", symbol: "TEST" },
          ]),
          { status: 200 },
        );
      },
      secretKey: "paper-secret",
    });

    const state = await reader.readAccountState();
    expect(state.account.accountId).toBe("account-1");
    expect(state.positions[0]?.quantity).toBe("2");
    expect(state.orders[0]?.alpacaOrderId).toBe("order-1");
    expect(state.activities[0]?.activityId).toBe("activity-1");
  });

  it("filters the asset universe to active tradable stocks and crypto", async () => {
    const reader = createPaperAssetReader({
      apiKey: "paper-key",
      fetchImpl: async () =>
        new Response(
          JSON.stringify([
            {
              class: "us_equity",
              exchange: "NASDAQ",
              id: "asset-1",
              name: "Test Equity",
              status: "active",
              symbol: "TEST",
              tradable: true,
            },
            {
              class: "option",
              exchange: "OPRA",
              id: "asset-2",
              name: "Excluded Option",
              status: "active",
              symbol: "TEST2401C",
              tradable: true,
            },
          ]),
          { status: 200 },
        ),
      secretKey: "paper-secret",
    });

    await expect(reader.readEligibleAssets()).resolves.toEqual([
      {
        assetClass: "us_equity",
        assetId: "asset-1",
        exchange: "NASDAQ",
        name: "Test Equity",
        status: "active",
        symbol: "TEST",
        tradable: true,
      },
    ]);
  });

  it("reads and normalizes bounded stock bars and snapshots", async () => {
    const requests: string[] = [];
    const reader = createPaperMarketDataReader({
      apiKey: "paper-key",
      fetchImpl: async (input) => {
        const url = String(input);
        requests.push(url);
        if (url.includes("/v2/stocks/bars")) {
          return new Response(
            JSON.stringify({
              bars: {
                TEST: [{ c: "11.00", h: "12.00", l: "9.00", n: 4, o: "10.00", t: "2026-08-22T00:00:00Z", v: 100, vw: "10.50" }],
              },
              next_page_token: null,
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            TEST: {
              dailyBar: { c: "11.00", h: "12.00", l: "9.00", o: "10.00", t: "2026-08-22T00:00:00Z", v: 100 },
              latestQuote: { ap: "11.10", as: 2, bp: "10.90", bs: 3, t: "2026-08-22T00:01:00Z" },
              latestTrade: { p: "11.00", s: 1, t: "2026-08-22T00:01:00Z" },
            },
          }),
          { status: 200 },
        );
      },
      secretKey: "paper-secret",
    });

    await expect(
      reader.readHistoricalBars({
        assetClass: "us_equity",
        limit: 10,
        start: "2026-08-21T00:00:00Z",
        symbols: ["TEST"],
        timeframe: "1Day",
      }),
    ).resolves.toEqual({
      bars: [
        {
          close: "11.00",
          high: "12.00",
          low: "9.00",
          open: "10.00",
          symbol: "TEST",
          timestamp: "2026-08-22T00:00:00Z",
          tradeCount: 4,
          volume: "100",
          vwap: "10.50",
        },
      ],
    });
    await expect(reader.readSnapshots({ assetClass: "us_equity", symbols: ["TEST"] })).resolves.toEqual([
      {
        dailyBar: {
          close: "11.00",
          high: "12.00",
          low: "9.00",
          open: "10.00",
          symbol: "TEST",
          timestamp: "2026-08-22T00:00:00Z",
          volume: "100",
        },
        latestQuote: { askPrice: "11.10", bidPrice: "10.90", timestamp: "2026-08-22T00:01:00Z" },
        latestTrade: { price: "11.00", timestamp: "2026-08-22T00:01:00Z" },
        symbol: "TEST",
      },
    ]);
    expect(requests[0]).toContain("/v2/stocks/bars?");
    expect(requests[0]).toContain("symbols=TEST");
    expect(requests[1]).toContain("/v2/stocks/snapshots?symbols=TEST");
  });

  it("unwraps Alpaca crypto snapshot responses", async () => {
    const reader = createPaperMarketDataReader({
      apiKey: "paper-key",
      fetchImpl: async () => new Response(JSON.stringify({ snapshots: { "BTC/USD": { latestTrade: { p: "100", t: "2026-08-22T00:01:00Z" } } } }), { status: 200 }),
      secretKey: "paper-secret",
    });
    await expect(reader.readSnapshots({ assetClass: "crypto", symbols: ["BTC/USD"] })).resolves.toEqual([{ latestTrade: { price: "100", timestamp: "2026-08-22T00:01:00Z" }, symbol: "BTC/USD" }]);
  });

  it("rejects a non-market-data endpoint", () => {
    expect(() =>
      createPaperMarketDataReader({
        apiKey: "paper-key",
        baseUrl: "https://api.alpaca.markets",
        secretKey: "paper-secret",
      }),
    ).toThrow("only permits the Alpaca market-data endpoint");
  });
});
