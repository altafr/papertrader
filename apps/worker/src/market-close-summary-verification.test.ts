import { describe, expect, it } from "vitest";
import { assessMarketCloseSummaryVerification } from "./market-close-summary-verification.js";

describe("market close summary verification", () => {
  it("requires a sent event in the New York close hour and isolated scope", () => {
    expect(assessMarketCloseSummaryVerification([{ code: "daily_portfolio_summary", deliveryStatus: "sent", occurredAt: "2026-08-28T20:15:00.000Z", dedupeKey: "daily_portfolio_summary:market_close:2026-08-28" }])).toMatchObject({ status: "verified", eventCount: 1 });
    expect(assessMarketCloseSummaryVerification([{ code: "daily_portfolio_summary", deliveryStatus: "sent", occurredAt: "2026-08-28T00:15:00.000Z", dedupeKey: "daily_portfolio_summary:portfolio:2026-08-28" }]).status).toBe("blocked");
  });
});
