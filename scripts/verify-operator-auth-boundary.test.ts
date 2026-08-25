import { describe, expect, it, vi } from "vitest";

import { verifyOperatorAuthBoundary } from "./verify-operator-auth-boundary";

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
});
