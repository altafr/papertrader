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
});
