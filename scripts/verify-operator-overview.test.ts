import { describe, expect, it, vi } from "vitest";

import { verifyOperatorOverview } from "./verify-operator-overview";

const validOverview = { agents: [], filteredTrades: [], tradeDecisions: [], strategyLifecycle: [], strategyCatalog: [], auditTimeline: [], history: { page: 1, limit: 1, hasNext: false, totals: { agents: 0, filteredTrades: 0, submissions: 0, lifecycle: 0, schedules: 0 } } };

describe("verifyOperatorOverview", () => {
  it("checks both authenticated endpoints and returns statuses", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      expect((init?.headers as Record<string, string>).authorization).toBe("Bearer test-session-token");
      return new Response(init && String(_input).includes(".csv") ? '"recordType","strategyVersion","assetClass","owner","description","stage","requiredLookbackBars","defaultParameters"' : JSON.stringify(validOverview), { status: 200 });
    });
    await expect(verifyOperatorOverview(fetcher, "https://example.test/", "test-session-token")).resolves.toEqual({ csvStatus: 200, overviewStatus: 200 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the authenticated overview is rejected", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response("", { status: 401 }));
    await expect(verifyOperatorOverview(fetcher, "https://example.test", "test-session-token")).rejects.toThrow("overview_http_401");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
