import { describe, expect, it } from "vitest";

import { createPaperAccountReader } from "./index.js";

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
});
