import { describe, expect, it } from "vitest";

import { getPaperOnlyRuntimeConfig, getServerPort } from "./index.js";

describe("server configuration", () => {
  it("uses a safe local default", () => {
    expect(getServerPort({})).toBe(3001);
  });

  it("rejects an invalid port", () => {
    expect(() => getServerPort({ PORT: "nope" })).toThrow(/PORT/);
  });

  it("defaults to a disabled paper-only broker boundary", () => {
    expect(getPaperOnlyRuntimeConfig()).toMatchObject({
      brokerConnectionEnabled: false,
      paperTrade: true,
      tradingMode: "paper",
      tradingApiBaseUrl: "https://paper-api.alpaca.markets",
    });
  });

  it("rejects live mode and explicit non-paper operation", () => {
    expect(() => getPaperOnlyRuntimeConfig({ TRADING_MODE: "live" })).toThrow(/TRADING_MODE/);
    expect(() => getPaperOnlyRuntimeConfig({ ALPACA_PAPER_TRADE: "false" })).toThrow(
      /ALPACA_PAPER_TRADE/,
    );
  });

  it("requires both credentials before enabling broker access", () => {
    expect(() =>
      getPaperOnlyRuntimeConfig({
        ALPACA_PAPER_TRADE: "true",
        BROKER_CONNECTION_ENABLED: "true",
      }),
    ).toThrow(/both paper Alpaca credentials/);
  });

  it("accepts paper credentials without returning their values", () => {
    const result = getPaperOnlyRuntimeConfig({
      ALPACA_API_KEY: "paper-key-placeholder",
      ALPACA_SECRET_KEY: "paper-secret-placeholder",
      ALPACA_PAPER_TRADE: "true",
      BROKER_CONNECTION_ENABLED: "true",
    });

    expect(result).toEqual({
      brokerConnectionEnabled: true,
      paperTrade: true,
      tradingMode: "paper",
      tradingApiBaseUrl: "https://paper-api.alpaca.markets",
    });
    expect(JSON.stringify(result)).not.toContain("paper-secret-placeholder");
  });
});
