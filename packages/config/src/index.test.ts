import { describe, expect, it } from "vitest";

import { getClerkRuntimeConfig, getPaperOnlyRuntimeConfig, getServerPort } from "./index.js";

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

  it("treats absent Clerk configuration as not provisioned", () => {
    expect(getClerkRuntimeConfig({})).toBeNull();
  });

  it("rejects partial Clerk configuration", () => {
    expect(() => getClerkRuntimeConfig({ CLERK_PUBLISHABLE_KEY: "pk_test_placeholder" })).toThrow(
      /Clerk configuration requires/,
    );
  });

  it("normalizes complete Clerk configuration without exposing the secret in errors", () => {
    expect(
      getClerkRuntimeConfig({
        CLERK_AUTHORIZED_PARTIES: "https://dashboard.example, https://dashboard.example ",
        CLERK_OPERATOR_USER_ID: "user_operator_placeholder",
        CLERK_PUBLISHABLE_KEY: "pk_test_placeholder",
        CLERK_SECRET_KEY: "sk_test_placeholder",
      }),
    ).toEqual({
      authorizedParties: ["https://dashboard.example", "https://dashboard.example"],
      operatorUserId: "user_operator_placeholder",
      publishableKey: "pk_test_placeholder",
      secretKey: "sk_test_placeholder",
    });
  });
});
