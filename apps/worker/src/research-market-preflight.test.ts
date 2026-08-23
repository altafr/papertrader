import { describe, expect, it } from "vitest";

import { validateResearchMarketPreflight } from "./research-market-preflight.js";

const complete = {
  ALPACA_API_KEY: "paper-key",
  ALPACA_PAPER_TRADE: "true",
  ALPACA_SECRET_KEY: "paper-secret",
  BROKER_CONNECTION_ENABLED: "true",
  DATABASE_URL: "postgres://private",
  RESEARCH_AGENT_TYPE: "stock_research",
  RESEARCH_LIMIT: "20",
  RESEARCH_MARKET_APPROVAL_REFERENCE: "ticket-123",
  RESEARCH_MARKET_OPERATOR_APPROVAL: "true",
  RESEARCH_MARKET_RUN_ONCE: "true",
  RESEARCH_MAX_CANDIDATES: "5",
  RESEARCH_SYMBOLS: "AAPL,MSFT",
  RESEARCH_TIMEFRAME: "1Day",
  TRADING_MODE: "paper",
};

describe("research market preflight", () => {
  it("returns bounded safe metadata for a complete paper command", () => {
    expect(validateResearchMarketPreflight(complete)).toEqual({ agentType: "stock_research", approvalReference: "ticket-123", brokerConnectionEnabled: true, databaseConfigured: true, limit: 20, maxCandidates: 5, paperMode: true, symbolCount: 2, timeframe: "1Day" });
  });

  it("fails before clients when approval, database, or symbols are incomplete", () => {
    expect(() => validateResearchMarketPreflight({ ...complete, RESEARCH_MARKET_OPERATOR_APPROVAL: "false" })).toThrow("OPERATOR_APPROVAL");
    expect(() => validateResearchMarketPreflight({ ...complete, DATABASE_URL: "" })).toThrow("DATABASE_URL");
    expect(() => validateResearchMarketPreflight({ ...complete, RESEARCH_SYMBOLS: "" })).toThrow("RESEARCH_SYMBOLS");
  });
});
