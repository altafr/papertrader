import { describe, expect, it } from "vitest";

import { getClerkRuntimeConfig, getDailyPreparationCron, getPaperAutopilotConfig, getPaperOnlyRuntimeConfig, getPaperOperatingMode, getRecoveryVerificationStatus, getServerPort, isGlobalKillSwitchActive } from "./index.js";

describe("server configuration", () => {
  it("uses a safe local default", () => {
    expect(getServerPort({})).toBe(3001);
  });

  it("centralizes the validated daily preparation cron", () => {
    expect(getDailyPreparationCron({})).toBe("0 0 * * *");
    expect(getDailyPreparationCron({ DAILY_PREPARATION_CRON: "30 2 * * *" })).toBe("30 2 * * *");
    expect(() => getDailyPreparationCron({ DAILY_PREPARATION_CRON: " " })).toThrow(/DAILY_PREPARATION_CRON/);
    expect(() => getDailyPreparationCron({ DAILY_PREPARATION_CRON: "x".repeat(121) })).toThrow(/DAILY_PREPARATION_CRON/);
  });

  it("keeps recovery verification unverified until explicitly recorded", () => {
    expect(getRecoveryVerificationStatus({})).toBe("unverified");
    expect(getRecoveryVerificationStatus({ RECOVERY_DRILL_VERIFIED: "false" })).toBe("unverified");
    expect(getRecoveryVerificationStatus({ RECOVERY_DRILL_VERIFIED: "true" })).toBe("unverified");
    expect(getRecoveryVerificationStatus({ RECOVERY_DRILL_VERIFIED: "true", RECOVERY_DRILL_APPROVAL_REFERENCE: "restore-drill-123", RECOVERY_DRILL_VERIFIED_AT: "2026-08-24T00:00:00.000Z" })).toBe("verified");
    expect(getRecoveryVerificationStatus({ RECOVERY_DRILL_VERIFIED: "true", RECOVERY_DRILL_APPROVAL_REFERENCE: "bad reference", RECOVERY_DRILL_VERIFIED_AT: "2026-08-24T00:00:00.000Z" })).toBe("unverified");
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

  it("defaults the global kill switch to inactive and validates explicit values", () => {
    expect(isGlobalKillSwitchActive({})).toBe(false);
    expect(isGlobalKillSwitchActive({ GLOBAL_KILL_SWITCH_ACTIVE: "true" })).toBe(true);
    expect(() => isGlobalKillSwitchActive({ GLOBAL_KILL_SWITCH_ACTIVE: "on" })).toThrow(/GLOBAL_KILL_SWITCH_ACTIVE/);
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
