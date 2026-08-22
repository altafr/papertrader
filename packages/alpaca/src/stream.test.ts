import { describe, expect, it } from "vitest";

import { createMarketStreamSupervisor, parseMarketStreamBars } from "./stream.js";

describe("market stream supervisor", () => {
  it("authenticates, subscribes to bars, and normalizes stream messages", async () => {
    const sent: string[] = [];
    const bars: string[] = [];
    const supervisor = createMarketStreamSupervisor({
      apiKey: "paper-key",
      assetClass: "us_equity",
      backfill: async () => {},
      expectedBarIntervalMs: 60 * 60 * 1_000,
      onBar: (bar) => bars.push(`${bar.symbol}:${bar.close}`),
      secretKey: "paper-secret",
      socket: { send: (message) => sent.push(message) },
      symbols: ["TEST"],
      timeframe: "1Hour",
    });

    supervisor.start();
    expect(JSON.parse(sent[0] ?? "{}")).toEqual({ action: "auth", key: "paper-key", secret: "paper-secret" });
    await supervisor.handleSocketMessage(JSON.stringify([{ T: "success", msg: "authenticated" }]));
    expect(JSON.parse(sent[1] ?? "{}")).toEqual({ action: "subscribe", bars: ["TEST"] });
    await supervisor.handleSocketMessage(
      JSON.stringify([
        { T: "b", S: "TEST", c: "11", h: "12", l: "9", o: "10", t: "2026-08-22T00:00:00Z", v: 100 },
      ]),
    );
    expect(supervisor.status().state).toBe("subscribed");
    expect(bars).toEqual(["TEST:11"]);
  });

  it("marks a timestamp gap degraded, requests REST backfill, then resumes", async () => {
    const backfills: Array<{ start: string; end: string }> = [];
    const supervisor = createMarketStreamSupervisor({
      apiKey: "paper-key",
      assetClass: "crypto",
      backfill: async (request) => {
        backfills.push({ end: request.end, start: request.start });
      },
      expectedBarIntervalMs: 60 * 60 * 1_000,
      secretKey: "paper-secret",
      socket: { send: () => {} },
      symbols: ["BTC/USD"],
      timeframe: "1Hour",
    });

    await supervisor.handleSocketMessage(JSON.stringify([{ T: "success", msg: "authenticated" }]));
    const makeBar = (timestamp: string) => ({ T: "b", S: "BTC/USD", c: "11", h: "12", l: "9", o: "10", t: timestamp, v: 100 });
    await supervisor.handleSocketMessage(JSON.stringify([makeBar("2026-08-22T00:00:00Z")]));
    await supervisor.handleSocketMessage(JSON.stringify([makeBar("2026-08-22T02:00:00Z")]));

    expect(backfills).toEqual([
      { end: "2026-08-22T02:00:00Z", start: "2026-08-22T01:00:00.000Z" },
    ]);
    expect(supervisor.status()).toMatchObject({ gapCount: 1, state: "subscribed" });
  });

  it("ignores malformed stream payloads and exposes reconnect degradation", () => {
    expect(parseMarketStreamBars("not-json")).toEqual([]);
    const supervisor = createMarketStreamSupervisor({
      apiKey: "paper-key",
      assetClass: "us_equity",
      backfill: async () => {},
      expectedBarIntervalMs: 60_000,
      secretKey: "paper-secret",
      socket: { send: () => {} },
      symbols: ["TEST"],
      timeframe: "1Min",
    });
    supervisor.handleSocketClose();
    expect(supervisor.status()).toMatchObject({ reconnectCount: 1, state: "degraded" });
  });
});
