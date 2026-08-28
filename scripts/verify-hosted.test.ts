import { describe, expect, it, vi } from "vitest";

import { verifyHosted } from "./verify-hosted.js";

const worker = { status: "healthy", asOf: "2026-08-28T14:44:00Z", alpaca: "configured", database: "configured", operatingMode: "paper_autopilot", paperAutopilotOrderSubmissionEnabled: true, paperAutopilotOrderSubmissionApprovalReferencePresent: true, globalKillSwitchActive: false, marketStream: { status: "connected" }, positionManagement: { status: "ready", blockedReasons: [] }, researchSchedule: { enabled: true, handlerEnabled: true, status: "scheduled", nextRunAt: "2026-08-28T14:45:00Z" }, durableScheduler: { enabled: true, status: "scheduled", nextRunAt: "2026-08-29T00:00:00Z" } };

describe("hosted verifier", () => {
  it("verifies runtime and public surface together", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(worker), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "healthy" }), { status: 200 }))
      .mockResolvedValueOnce(new Response("Momentum Autopilot", { status: 200 }));
    await expect(verifyHosted(fetcher, "https://worker.example", "https://api.example", "https://web.example")).resolves.toMatchObject({ runtime: { verified: true }, web: { status: 200 } });
  });

  it("retries a transient public-surface response", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(worker), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "healthy" }), { status: 200 }))
      .mockResolvedValueOnce(new Response("temporarily unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("Momentum Autopilot", { status: 200 }));
    await expect(verifyHosted(fetcher, "https://worker.example", "https://api.example", "https://web.example")).resolves.toMatchObject({ runtime: { verified: true }, web: { status: 200 } });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("retries a transient worker health response", async () => {
    let workerAttempts = 0;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("worker")) {
        workerAttempts += 1;
        return workerAttempts === 1 ? new Response("temporarily unavailable", { status: 503 }) : new Response(JSON.stringify(worker), { status: 200 });
      }
      if (url.includes("api")) return new Response(JSON.stringify({ status: "healthy" }), { status: 200 });
      return new Response("Momentum Autopilot", { status: 200 });
    });
    await expect(verifyHosted(fetcher, "https://worker.example", "https://api.example", "https://web.example")).resolves.toMatchObject({ runtime: { verified: true } });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("fails when the optional expected release does not match", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...worker, release: "actual" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "healthy" }), { status: 200 }))
      .mockResolvedValueOnce(new Response("Momentum Autopilot", { status: 200 }));
    await expect(verifyHosted(fetcher, "https://worker.example", "https://api.example", "https://web.example", "expected")).rejects.toThrow("hosted_runtime_contract_failed");
  });
});
