import { describe, expect, it, vi } from "vitest";

import { verifyOperatorOverview } from "./verify-operator-overview";

const validOverview = { agents: [], filteredTrades: [], tradeDecisions: [], strategyLifecycle: [], strategyCatalog: [], auditTimeline: [], telegramAlerts: [], history: { page: 1, limit: 1, hasNext: false, totals: { agents: 0, filteredTrades: 0, submissions: 0, lifecycle: 0, schedules: 0, telegramAlerts: 0 } } };

describe("verifyOperatorOverview", () => {
  it("checks both authenticated endpoints and returns statuses", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_input, init) => {
      expect((init?.headers as Record<string, string>).authorization).toBe("Bearer test-session-token");
      const path = String(_input);
      return new Response(path.includes("read-model.csv") ? '"recordType","exitPlanStatus","exitPlanMissingFields","strategyKey","strategyVersion","plannedStopPrice","plannedTargetPrice","positionOpenedAt"' : path.includes("operator-overview.csv") ? '"recordType","strategyVersion","assetClass","owner","description","stage","requiredLookbackBars","defaultParameters"' : path.includes("read-model") ? JSON.stringify({ model: {}, unmanagedPositions: [] }) : JSON.stringify(validOverview), { status: 200 });
    });
    await expect(verifyOperatorOverview(fetcher, "https://example.test/", "test-session-token")).resolves.toEqual({ accountCsvStatus: 200, csvStatus: 200, overviewStatus: 200, readModelStatus: 200 });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("fails closed when the authenticated overview is rejected", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response("", { status: 401 }));
    await expect(verifyOperatorOverview(fetcher, "https://example.test", "test-session-token")).rejects.toThrow("overview_http_401");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
