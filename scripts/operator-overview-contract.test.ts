import { describe, expect, it } from "vitest";

import { validateAuditCsvHeader, validateOperatorOverviewContract } from "./operator-overview-contract";

describe("operator overview deployment contract", () => {
  it("accepts the versioned overview and pagination metadata", () => {
    expect(validateOperatorOverviewContract({ agents: [], filteredTrades: [], tradeDecisions: [], strategyLifecycle: [], strategyCatalog: [], auditTimeline: [], history: { page: 1, limit: 100, hasNext: false, totals: { agents: 0, filteredTrades: 0, submissions: 0, lifecycle: 0, schedules: 0 } } })).toEqual({ valid: true });
  });

  it("rejects missing totals", () => {
    expect(validateOperatorOverviewContract({ agents: [], filteredTrades: [], tradeDecisions: [], strategyLifecycle: [], strategyCatalog: [], auditTimeline: [], history: { page: 1, limit: 100, hasNext: false } }).valid).toBe(false);
  });

  it("checks the exported strategy metadata columns", () => {
    expect(validateAuditCsvHeader('"recordType","strategyVersion","assetClass","owner","description","stage","requiredLookbackBars","defaultParameters"')).toEqual({ valid: true });
  });
});
