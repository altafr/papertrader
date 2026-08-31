import { describe, expect, it } from "vitest";

import { buildTelegramOpsAssistantReply } from "./telegram-ops-assistant.js";

const data = {
  getHealth: () => ({ status: "degraded", operatingMode: "paper_autopilot", marketStream: { status: "connected", freshness: "fresh" }, researchSchedule: { status: "scheduled", nextRunAt: "2026-08-31T01:15:00Z", lastRiskCycleStatus: "completed" }, positionManagement: { status: "degraded", unmanagedCount: 2 }, durableScheduler: { status: "scheduled", nextRunAt: "2026-09-01T00:00:00Z" } }),
  getModel: async () => ({ snapshot: { capturedAt: new Date("2026-08-31T01:00:00Z"), cash: "64000", equity: "99000", buyingPower: "64000" }, positions: [{ symbol: "AAPL", assetClass: "us_equity", quantity: "4", marketValue: "1200", unrealizedPl: "10" }], orders: [] }),
  getRuns: async () => [{ agentType: "crypto_research", status: "succeeded", runId: "run-1", createdAt: new Date("2026-08-31T01:00:00Z") }],
  getSubmissions: async () => [{ symbol: "BTC/USD", assetClass: "crypto", status: "risk_dry_run_rejected", quantity: "0.001", filledQuantity: null, riskDecision: { approvalStatus: "rejected", reasons: ["Existing positions lack complete exit plans"] } }],
};

describe("Telegram operations assistant", () => {
  it("answers portfolio questions from the reconciled read model", async () => {
    await expect(buildTelegramOpsAssistantReply("show my portfolio and P&L", data)).resolves.toContain("Equity: 99000");
    await expect(buildTelegramOpsAssistantReply("show my portfolio and P&L", data)).resolves.toContain("AAPL 4");
  });

  it("answers infra questions with bounded health and agent data", async () => {
    const reply = await buildTelegramOpsAssistantReply("infra status", data);
    expect(reply).toContain("Market stream: connected · freshness fresh");
    expect(reply).toContain("Latest agent run: crypto_research succeeded");
  });

  it("explains recent deterministic decisions and declares read-only authority", async () => {
    const reply = await buildTelegramOpsAssistantReply("why was the BTC trade rejected?", data);
    expect(reply).toContain("Existing positions lack complete exit plans");
    expect(reply).toContain("read-only");
  });

  it("does not claim order authority", async () => {
    await expect(buildTelegramOpsAssistantReply("help", data)).resolves.toContain("cannot place, cancel, or modify orders");
  });
});
