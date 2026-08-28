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
});
