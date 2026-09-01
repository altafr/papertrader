import { describe, expect, it } from "vitest";

import { buildTelegramInitData, verifyTelegramMiniApp } from "./verify-telegram-mini-app.js";

describe("Telegram Mini App smoke verifier", () => {
  it("constructs signed init data and reports only bounded shape metadata", async () => {
    const token = "server-only-token";
    const initData = buildTelegramInitData(token, "12345", 1_700_000_000);
    expect(initData).toContain("auth_date=1700000000");
    const result = await verifyTelegramMiniApp(async (_url, request) => {
      expect(String(new Headers(request?.headers).get("x-telegram-init-data"))).toBe(initData);
      return new Response(JSON.stringify({ portfolio: { positions: [{ symbol: "AAPL" }], orders: [], metrics: { dayPnl: "0" } }, alerts: [], unmanagedPositions: [] }), { status: 200 });
    }, "https://api.example", token, "12345", 1_700_000_000);
    expect(result).toEqual({ alerts: 0, metricKeys: ["dayPnl"], orders: 0, positions: 1, status: 200, unmanagedPositions: 0 });
    expect(JSON.stringify(result)).not.toContain(token);
  });
});
