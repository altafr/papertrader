import { describe, expect, it } from "vitest";
import { getResearchPreparationJobId, getResearchScheduleConfig, getResearchScheduleReadiness, RESEARCH_PREPARATION_CRON, RESEARCH_PREPARATION_QUEUE } from "./research-scheduler.js";

describe("research schedule boundary", () => {
  it("is disabled by default with bounded configuration", () => {
    expect(getResearchScheduleConfig()).toEqual({ cron: RESEARCH_PREPARATION_CRON, enabled: false, handlerEnabled: false, retryDelaySeconds: 300, retryLimit: 2 });
    expect(RESEARCH_PREPARATION_QUEUE).toContain("research-preparation");
    expect(() => getResearchScheduleConfig({ RESEARCH_RETRY_LIMIT: "11" })).toThrow("integer");
  });

  it("reports safe readiness without exposing credentials", () => {
    expect(getResearchScheduleReadiness({})).toMatchObject({ status: "disabled", blockedReasons: [] });
    const blocked = getResearchScheduleReadiness({ RESEARCH_SCHEDULER_ENABLED: "true", TRADING_MODE: "paper", ALPACA_PAPER_TRADE: "true" });
    expect(blocked).toMatchObject({ status: "blocked", blockedReasons: ["database_not_configured", "broker_connection_disabled", "paper_credentials_not_configured", "research_handler_disabled"] });
    expect(getResearchScheduleReadiness({ RESEARCH_SCHEDULER_ENABLED: "true", ALPACA_PAPER_TRADE: "unexpected" }).blockedReasons).toContain("paper_runtime_invalid");
    const ready = getResearchScheduleReadiness({ ALPACA_API_KEY: "secret", ALPACA_SECRET_KEY: "secret2", ALPACA_PAPER_TRADE: "true", BROKER_CONNECTION_ENABLED: "true", DATABASE_URL: "postgres://redacted", RESEARCH_HANDLER_ENABLED: "true", RESEARCH_SCHEDULER_ENABLED: "true", TRADING_MODE: "paper" });
    expect(ready).toMatchObject({ status: "ready", blockedReasons: [] });
    expect(JSON.stringify(ready)).not.toContain("secret");
  });

  it("creates a deterministic UTC manual job identity", () => {
    expect(getResearchPreparationJobId(new Date("2026-08-23T14:00:00Z"))).toBe("manual-research-preparation-2026-08-23");
  });
});
