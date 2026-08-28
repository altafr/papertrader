import { describe, expect, it, vi } from "vitest";

import { readHealthWithRetry } from "./verify-paper-runtime.js";

describe("hosted health retry", () => {
  it("retries transient failures and returns the first valid response", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("starting"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "healthy" }), { status: 200, headers: { "content-type": "application/json" } }));
    await expect(readHealthWithRetry(fetcher, "https://worker.example/health", 3, 0)).resolves.toEqual({ status: "healthy" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("fails closed after all attempts are exhausted", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify({ status: "starting" }), { status: 503 }));
    await expect(readHealthWithRetry(fetcher, "https://worker.example/health", 2, 0)).rejects.toThrow("health_check_failed:503");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
