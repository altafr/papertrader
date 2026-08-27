import { describe, expect, it } from "vitest";

import { validateAuditCsvHeader, validateOperatorOverviewContract } from "./operator-overview-contract";

describe("operator overview deployment contract", () => {
  it("accepts the versioned overview and pagination metadata", () => {
    expect(validateOperatorOverviewContract({ agents: [], filteredTrades: [], tradeDecisions: [], strategyLifecycle: [], strategyCatalog: [], auditTimeline: [], telegramAlerts: [], history: { page: 1, limit: 100, hasNext: false, totals: { agents: 0, filteredTrades: 0, submissions: 0, lifecycle: 0, schedules: 0, telegramAlerts: 0 } } })).toEqual({ valid: true });
  });

  it("rejects missing totals", () => {
    expect(validateOperatorOverviewContract({ agents: [], filteredTrades: [], tradeDecisions: [], strategyLifecycle: [], strategyCatalog: [], auditTimeline: [], history: { page: 1, limit: 100, hasNext: false } }).valid).toBe(false);
  });

  it("validates Telegram delivery metadata", () => {
    const alert = { eventId: "event-1", code: "paper_entry_submitted", severity: "info", deliveryStatus: "sent", attempts: 1, message: "AAPL entered", occurredAt: "2026-08-28T00:00:00.000Z" };
    const base = { agents: [], filteredTrades: [], tradeDecisions: [], strategyLifecycle: [], strategyCatalog: [], auditTimeline: [], telegramAlerts: [alert], history: { page: 1, limit: 100, hasNext: false, totals: { agents: 0, filteredTrades: 0, submissions: 0, lifecycle: 0, schedules: 0, telegramAlerts: 1 } } };
    expect(validateOperatorOverviewContract(base)).toEqual({ valid: true });
    expect(validateOperatorOverviewContract({ ...base, telegramAlerts: [{ ...alert, attempts: 1.5 }] }).valid).toBe(false);
  });

  it("checks the exported strategy metadata columns", () => {
    expect(validateAuditCsvHeader('"recordType","strategyVersion","assetClass","owner","description","stage","requiredLookbackBars","defaultParameters"')).toEqual({ valid: true });
  });
});
