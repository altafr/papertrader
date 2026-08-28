import { describe, expect, it, vi } from "vitest";

import { validateAccountCsvHeader, verifyAuthenticatedAccountCsv, verifyOperatorAuthBoundary } from "./verify-operator-auth-boundary";

describe("verifyOperatorAuthBoundary", () => {
  it("accepts 401 for both protected operator endpoints", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response("unauthorized", { status: 401 }));
    await expect(verifyOperatorAuthBoundary(fetcher, "https://example.test/")).resolves.toEqual({ csvStatus: 401, overviewStatus: 401 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("fails if an operator endpoint becomes public or unavailable", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => new Response("", { status: String(input).includes(".csv") ? 503 : 200 }));
    await expect(verifyOperatorAuthBoundary(fetcher, "https://example.test")).rejects.toThrow("overview_auth_boundary_200");
  });

  it("validates the authenticated account CSV provenance contract", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response('"recordType","exitPlanStatus","strategyKey","strategyVersion","plannedStopPrice","plannedTargetPrice","positionOpenedAt"\n', { status: 200 }));
    await expect(verifyAuthenticatedAccountCsv(fetcher, "https://example.test/", "operator-token")).resolves.toMatchObject({ status: 200 });
    expect(validateAccountCsvHeader('"recordType","exitPlanStatus","strategyKey","strategyVersion","plannedStopPrice","plannedTargetPrice","positionOpenedAt"').columns).toHaveLength(7);
  });

  it("rejects an authenticated CSV that omits provenance columns", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response('"recordType","symbol"\n', { status: 200 }));
    await expect(verifyAuthenticatedAccountCsv(fetcher, "https://example.test", "operator-token")).rejects.toThrow("account_csv_missing_columns");
  });
});
