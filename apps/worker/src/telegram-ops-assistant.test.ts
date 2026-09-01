import { describe, expect, it } from "vitest";

import { buildTelegramMiniAppReplyMarkup, buildTelegramOpsAssistantReply, fetchFirecrawlSources, getTelegramResearchAgentType, getTelegramUserIdReply, isResearchQuestion } from "./telegram-ops-assistant.js";

const data = {
  getHealth: () => ({ status: "degraded", operatingMode: "paper_autopilot", marketStream: { status: "connected", freshness: "fresh" }, researchSchedule: { status: "scheduled", nextRunAt: "2026-08-31T01:15:00Z", lastRiskCycleStatus: "completed" }, positionManagement: { status: "degraded", unmanagedCount: 2 }, durableScheduler: { status: "scheduled", nextRunAt: "2026-09-01T00:00:00Z" } }),
  getModel: async () => ({ snapshot: { capturedAt: new Date("2026-08-31T01:00:00Z"), cash: "64000", equity: "99000", buyingPower: "64000", lastEquity: "98800" }, positions: [{ symbol: "AAPL", assetClass: "us_equity", quantity: "4", marketValue: "1200", unrealizedPl: "10" }], orders: [] }),
  getRuns: async () => [{ agentType: "crypto_research", status: "succeeded", runId: "run-1", createdAt: new Date("2026-08-31T01:00:00Z") }],
  getSubmissions: async () => [{ symbol: "BTC/USD", assetClass: "crypto", status: "risk_dry_run_rejected", quantity: "0.001", filledQuantity: null, riskDecision: { approvalStatus: "rejected", reasons: ["Existing positions lack complete exit plans"] } }],
};

describe("Telegram operations assistant", () => {
  it("answers portfolio questions from the reconciled read model", async () => {
    await expect(buildTelegramOpsAssistantReply("show my portfolio and P&L", data)).resolves.toContain("Equity: 99000");
    await expect(buildTelegramOpsAssistantReply("show my portfolio and P&L", data)).resolves.toContain("AAPL 4");
    await expect(buildTelegramOpsAssistantReply("show my portfolio and P&L", data)).resolves.toContain("exit plan review required");
    await expect(buildTelegramOpsAssistantReply("show my portfolio and P&L", data)).resolves.toContain("Day P/L: 200.00");
    await expect(buildTelegramOpsAssistantReply("show my portfolio and P&L", data)).resolves.toContain("Unrealized P/L: 10.00");
  });

  it("keeps exit-plan questions local and reports managed coverage", async () => {
    let researched = false;
    const reply = await buildTelegramOpsAssistantReply("show my exit plan status", {
      ...data,
      getSubmissions: async () => [{ symbol: "AAPL", assetClass: "us_equity", status: "filled", quantity: "4", entryPrice: "100", plannedStopPrice: "95", plannedTargetPrice: "104", strategyKey: "momentum", strategyVersion: "1.0.0" }],
      askResearch: async () => { researched = true; return "incorrect route"; },
    });
    expect(researched).toBe(false);
    expect(reply).toContain("AAPL: managed");
    expect(reply).toContain("stop 95.00");
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

  it("routes company questions to the research agent without order authority", async () => {
    expect(isResearchQuestion("What happened with AAPL earnings?")).toBe(true);
    expect(isResearchQuestion("show market health and scheduler status")).toBe(false);
    expect(getTelegramResearchAgentType("What is the Fed doing with interest rates?")).toBe("macro_advisory");
    expect(getTelegramResearchAgentType("What happened with BTC news?")).toBe("crypto_research");
    const reply = await buildTelegramOpsAssistantReply("What happened with AAPL earnings?", {
      ...data,
      askResearch: async (question) => `Research agent queued: ${question}`,
    });
    expect(reply).toContain("Research agent queued");
    expect(reply).toContain("AAPL earnings");
  });

  it("bounds Firecrawl references and keeps the API key only in the Authorization header", async () => {
    let request: RequestInit | undefined;
    const result = await fetchFirecrawlSources("What happened with AAPL earnings?", "server-only-secret", async (_url, init) => {
      request = init;
      return new Response(JSON.stringify({ data: [{ title: "A", url: "https://example.com/a", description: "context" }, { title: "B", url: "https://example.com/b", description: "context" }, { title: "C", url: "https://example.com/c", description: "context" }, { title: "D", url: "https://example.com/d", description: "ignored" }] }), { status: 200 });
    });
    expect(result).toEqual({ sources: [{ title: "A", url: "https://example.com/a", description: "context" }, { title: "B", url: "https://example.com/b", description: "context" }, { title: "C", url: "https://example.com/c", description: "context" }] });
    expect(request?.headers).toMatchObject({ Authorization: "Bearer server-only-secret" });
    expect(JSON.stringify(result)).not.toContain("server-only-secret");
  });

  it("fails closed when Firecrawl returns a provider error", async () => {
    await expect(fetchFirecrawlSources("AAPL news", "server-only-secret", async () => new Response("unavailable", { status: 503 }))).resolves.toEqual({ error: "unavailable" });
  });

  it("only builds the Mini App button for a bounded HTTPS URL", () => {
    expect(buildTelegramMiniAppReplyMarkup({ TELEGRAM_MINI_APP_URL: "http://insecure.example" }, true)).toBeUndefined();
    expect(buildTelegramMiniAppReplyMarkup({}, true)).toBeUndefined();
    expect(buildTelegramMiniAppReplyMarkup({ TELEGRAM_MINI_APP_URL: "https://papertrader-web.vercel.app/telegram" }, true)).toEqual({ inline_keyboard: [[{ text: "Open portfolio & alerts", web_app: { url: "https://papertrader-web.vercel.app/telegram" } }]] });
  });

  it("gives /dashboard an explicit read-only launch instruction", async () => {
    await expect(buildTelegramOpsAssistantReply("/dashboard", data)).resolves.toContain("Portfolio & Alerts Mini App");
  });

  it("provides the operator Telegram user ID without exposing credentials", () => {
    expect(getTelegramUserIdReply(12345)).toContain("TELEGRAM_MINI_APP_USER_ID");
    expect(getTelegramUserIdReply("not-a-number")).toBeUndefined();
  });
});
