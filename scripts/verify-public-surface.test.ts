import { describe, expect, it, vi } from "vitest";

import { verifyPublicSurface } from "./verify-public-surface.js";

describe("public surface verifier", () => {
  it("accepts a reachable public page", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("<title>Momentum Autopilot</title>", { status: 200 }));
    await expect(verifyPublicSurface(fetcher, "https://web.example")).resolves.toEqual({ status: 200, url: "https://web.example" });
  });

  it("fails closed on a non-success response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("down", { status: 503 }));
    await expect(verifyPublicSurface(fetcher, "https://web.example")).rejects.toThrow("public_surface_check_failed:503");
  });

  it("fails closed when a different site answers successfully", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("placeholder", { status: 200 }));
    await expect(verifyPublicSurface(fetcher, "https://web.example")).rejects.toThrow("public_surface_check_failed:unexpected_content");
  });
});
