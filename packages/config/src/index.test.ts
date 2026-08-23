import { describe, expect, it } from "vitest";

import { getClerkRuntimeConfig, getPaperAutopilotConfig, getPaperOnlyRuntimeConfig, getPaperOperatingMode, getServerPort } from "./index.js";

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

  it("keeps paper autopilot disabled unless explicitly enabled with broker opt-in", () => {
    expect(getPaperAutopilotConfig({ TRADING_MODE: "paper", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "false" })).toEqual({ enabled: false, mode: "disabled" });
    expect(() => getPaperAutopilotConfig({ PAPER_AUTOPILOT_ENABLED: "true", TRADING_MODE: "paper", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "false" })).toThrow(/BROKER_CONNECTION_ENABLED/);
  });

  it("defaults the explicit operating mode to observe", () => {
    expect(getPaperOperatingMode({ TRADING_MODE: "paper", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "false" })).toBe("observe");
    expect(getPaperOperatingMode({ OPERATING_MODE: "recommend", TRADING_MODE: "paper", ALPACA_PAPER_TRADE: "true" })).toBe("recommend");
  });

  it("rejects contradictory or unsupported operating modes", () => {
    expect(() => getPaperOperatingMode({ OPERATING_MODE: "paper_autopilot", TRADING_MODE: "paper", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "false" })).toThrow(/PAPER_AUTOPILOT_ENABLED/);
    expect(() => getPaperOperatingMode({ OPERATING_MODE: "observe", PAPER_AUTOPILOT_ENABLED: "true", TRADING_MODE: "paper", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "true", ALPACA_API_KEY: "key", ALPACA_SECRET_KEY: "secret" })).toThrow(/conflicts/);
    expect(() => getPaperOperatingMode({ OPERATING_MODE: "live", TRADING_MODE: "paper" })).toThrow(/OPERATING_MODE/);
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
