import { createAccountStateRepository, createAgentRunRepository, createDatabase, createPaperOrderRepository } from "@momentum/db";
import * as DecimalModule from "decimal.js";

interface DecimalValue { minus(value: DecimalValue): DecimalValue; plus(value: DecimalValue): DecimalValue; toFixed(decimalPlaces?: number): string; }
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;
import { getTelegramNotificationConfig } from "@momentum/notifications";
import { buildPaperPerformanceReport, PAPER_EVIDENCE_SNAPSHOT_LIMIT } from "./paper-performance-report.js";

type JsonRecord = Record<string, unknown>;
type AssistantHealth = { readonly status?: string; readonly operatingMode?: string; readonly marketStream?: JsonRecord; readonly researchSchedule?: JsonRecord; readonly positionManagement?: JsonRecord; readonly durableScheduler?: JsonRecord; readonly telegramAlerts?: JsonRecord };
type AssistantModel = { readonly snapshot?: { readonly capturedAt: Date; readonly cash: string; readonly equity: string; readonly buyingPower: string; readonly lastEquity?: string | null }; readonly positions: readonly { readonly symbol: string; readonly assetClass: string; readonly quantity: string; readonly marketValue: string; readonly unrealizedPl: string }[]; readonly orders: readonly { readonly symbol: string; readonly status: string; readonly side: string; readonly filledQuantity?: string | null; readonly updatedAt?: Date | null }[] } | undefined;
type AssistantRun = { readonly agentType: string; readonly status: string; readonly runId: string; readonly createdAt: Date; readonly artifactRationale?: string | null };
type AssistantSubmission = { readonly symbol: string; readonly status: string; readonly assetClass: string; readonly quantity: string; readonly filledQuantity?: string | null; readonly entryPrice?: string | null; readonly plannedStopPrice?: string | null; readonly plannedTargetPrice?: string | null; readonly strategyKey?: string | null; readonly strategyVersion?: string | null; readonly timeStopAt?: Date | null; readonly alpacaOrderId?: string | null; readonly riskDecision?: { readonly approvalStatus?: string; readonly reasons?: readonly string[] } | null; readonly updatedAt?: Date | null };
type AssistantEvidence = { readonly calendarDays: number; readonly consecutiveCalendarDays: number; readonly daysRemaining: number; readonly requiredConsecutiveCalendarDays: number };
export type FirecrawlSource = { readonly title: string; readonly url: string; readonly description: string };

export interface TelegramOpsAssistantData {
  readonly getHealth: () => AssistantHealth;
  readonly getModel: () => Promise<AssistantModel>;
  readonly getRuns: () => Promise<readonly AssistantRun[]>;
  readonly getSubmissions: () => Promise<readonly AssistantSubmission[]>;
  readonly getEvidence?: () => Promise<AssistantEvidence>;
  /** Route a non-trading research question to the appropriate agent/web provider. */
  readonly askResearch?: (question: string) => Promise<string>;
}

const scalar = (value: unknown, fallback = "unknown"): string => typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : fallback;
const display = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "unknown";
  const raw = String(value);
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(raw)) return raw;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : raw;
};
const utc = (value: Date | string | undefined): string => value ? new Date(value).toISOString() : "unknown";
const limit = (value: string, max = 3900): string => value.length <= max ? value : `${value.slice(0, max - 16)}… [truncated]`;
const hasCompleteExitPlan = (submission: AssistantSubmission): boolean => Boolean(submission.entryPrice && submission.plannedStopPrice && submission.strategyKey && submission.strategyVersion && (submission.plannedTargetPrice || submission.timeStopAt));
const positionKey = (assetClass: string, symbol: string): string => `${assetClass}:${symbol.replaceAll("/", "").toUpperCase()}`;
const safeDifference = (left: string, right: string): string => { try { return new Decimal(left).minus(new Decimal(right)).toFixed(2); } catch { return "unknown"; } };
const safeSum = (values: readonly string[]): string => { try { return values.reduce((total, value) => total.plus(new Decimal(value)), new Decimal("0")).toFixed(2); } catch { return "unknown"; } };

/** Fetches only bounded, advisory Firecrawl references; never returns provider credentials. */
export async function fetchFirecrawlSources(question: string, apiKey: string, fetcher: typeof fetch = fetch): Promise<{ readonly sources: readonly FirecrawlSource[] } | { readonly error: "unavailable" | "failed" }> {
  try {
    const response = await fetcher("https://api.firecrawl.dev/v1/search", { body: JSON.stringify({ limit: 3, query: question.slice(0, 300) }), headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, method: "POST", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return { error: "unavailable" };
    const body = await response.json() as { readonly data?: readonly { readonly title?: unknown; readonly url?: unknown; readonly description?: unknown }[] };
    const sources = (body.data ?? []).slice(0, 3).map((item) => ({ title: typeof item.title === "string" ? item.title.slice(0, 160) : "source", url: typeof item.url === "string" ? item.url.slice(0, 500) : "", description: typeof item.description === "string" ? item.description.slice(0, 240) : "" }));
    return { sources };
  } catch {
    return { error: "failed" };
  }
}
export function isResearchQuestion(question: string): boolean {
  if (/\b(portfolio|position|p&l|p\/l|trade|order|risk|health|infra|scheduler|log|status|alert|telegram|exit plan|stop loss|take profit|unmanaged|position management|readiness|evidence|autonomous)\b/i.test(question)) return false;
  return /\b(company|companies|earnings|revenue|fundamentals|news|headline|analyst|sector|industry|fed|federal reserve|interest rate|rates|inflation|cpi|gdp|jobs report|unemployment|yield curve|macro|why is .*moving|what happened to)\b/i.test(question)
    || /\b[A-Z]{1,5}\b/.test(question);
}
export function getTelegramResearchAgentType(question: string): "crypto_research" | "macro_advisory" | "stock_research" {
  if (/\b(fed|federal reserve|interest rate|rates|inflation|cpi|gdp|jobs report|unemployment|yield curve|macro)\b/i.test(question)) return "macro_advisory";
  return /\b(bitcoin|btc|crypto|ethereum|eth)\b/i.test(question) ? "crypto_research" : "stock_research";
}

export async function buildTelegramOpsAssistantReply(question: string, data: TelegramOpsAssistantData): Promise<string> {
  const normalized = question.trim().toLowerCase();
  if (!normalized) return "Ask about portfolio, positions, trades, risk decisions, scheduler, or infrastructure health.";
  if (normalized === "/help" || normalized === "help" || normalized.includes("what can you")) {
    return "I can answer read-only questions about portfolio/P&L, open positions, recent trades and decisions, agent runs, scheduler health, market-data freshness, Telegram delivery, and company, crypto, or macro research via the research agents. Send /dashboard to open the portfolio and alerts Mini App, or /myid to get your numeric Telegram user ID for setup. I cannot place, cancel, or modify orders.";
  }
  if (isMiniAppRequest(question)) return "Open the read-only Portfolio & Alerts Mini App using the button below.";
  if (/(?:readiness|evidence|autonomous)/i.test(normalized)) {
    if (!data.getEvidence) return "Autonomous readiness is monitored by the Worker. Ask for infrastructure status to see runtime health and position coverage.";
    const evidence = await data.getEvidence();
    return `Paper Autopilot readiness\nRuntime and position controls are server-side and read-only here. Evidence: ${evidence.consecutiveCalendarDays}/${evidence.requiredConsecutiveCalendarDays} consecutive days; ${evidence.daysRemaining} days remaining. Calendar days observed: ${evidence.calendarDays}.`;
  }
  if (isResearchQuestion(question)) {
    if (!data.askResearch) return "The research route is not available in this deployment. Trading and risk controls are unaffected.";
    try {
      return limit(await data.askResearch(question));
    } catch {
      return "The research agent could not be reached. The question was not treated as a trading instruction, and trading/risk controls are unaffected.";
    }
  }
  const health = data.getHealth();
  const asksExitPlan = normalized.includes("exit plan") || normalized.includes("stop loss") || normalized.includes("take profit") || normalized.includes("unmanaged") || normalized.includes("position management");
  if (!asksExitPlan && (normalized.includes("health") || normalized.includes("infra") || normalized.includes("scheduler") || normalized.includes("log") || normalized.includes("status"))) {
    const research = health.researchSchedule ?? {};
    const stream = health.marketStream ?? {};
    const positions = health.positionManagement ?? {};
    const durable = health.durableScheduler ?? {};
    const runs = await data.getRuns();
    const latest = runs[0];
    const evidence = data.getEvidence ? await data.getEvidence() : undefined;
    return limit(`Infrastructure health\nWorker: ${scalar(health.status)} · mode ${scalar(health.operatingMode)}\nMarket stream: ${scalar(stream.status)} · freshness ${scalar(stream.freshness)}\nResearch: ${scalar(research.status)} · next ${scalar(research.nextRunAt)} · last risk ${scalar(research.lastRiskCycleStatus)}\nPosition management: ${scalar(positions.status)} · unmanaged ${scalar(positions.unmanagedCount, "0")}\nDurable scheduler: ${scalar(durable.status)} · next ${scalar(durable.nextRunAt)}\nEvidence: ${evidence ? `${evidence.consecutiveCalendarDays}/${evidence.requiredConsecutiveCalendarDays} consecutive days · ${evidence.daysRemaining} remaining` : "unavailable"}\nLatest agent run: ${latest ? `${latest.agentType} ${latest.status} at ${utc(latest.createdAt)}` : "none"}`);
  }
  const model = await data.getModel();
  if (asksExitPlan) {
    const submissions = await data.getSubmissions();
    if (!model?.positions.length) return "No reconciled paper positions are available for exit-plan review.";
    const status = model.positions.map((position) => {
      const key = positionKey(position.assetClass, position.symbol);
      const plan = submissions.find((submission) => positionKey(submission.assetClass, submission.symbol) === key && hasCompleteExitPlan(submission));
      if (plan) return `${position.symbol}: managed (stop ${display(plan.plannedStopPrice)}, ${plan.plannedTargetPrice ? `target ${display(plan.plannedTargetPrice)}` : `time stop ${utc(plan.timeStopAt!)}`})`;
      return `${position.symbol}: review required (no complete stored exit plan)`;
    }).join("; ");
    return limit(`Exit-plan coverage as of ${utc(model.snapshot?.capturedAt)}\n${status}\nUnmanaged positions remain fail-closed and receive no automatic exits.`);
  }
  if (normalized.includes("position") || normalized.includes("portfolio") || normalized.includes("p&l") || normalized.includes("pnl") || normalized.includes("equity") || normalized.includes("cash")) {
    if (!model?.snapshot) return "No reconciled paper portfolio snapshot is available.";
    const submissions = await data.getSubmissions();
    const positions = model.positions.length === 0 ? "none" : model.positions.map((position) => {
      const managed = submissions.some((submission) => positionKey(submission.assetClass, submission.symbol) === positionKey(position.assetClass, position.symbol) && hasCompleteExitPlan(submission));
      return `${position.symbol} ${display(position.quantity)} · value ${display(position.marketValue)} · unrealized P/L ${display(position.unrealizedPl)} · exit plan ${managed ? "managed" : "review required"}`;
    }).join("; ");
    const dayPnl = model.snapshot.lastEquity ? safeDifference(model.snapshot.equity, model.snapshot.lastEquity) : "unknown";
    const unrealizedPnl = safeSum(model.positions.map((position) => position.unrealizedPl));
    return limit(`Paper portfolio as of ${utc(model.snapshot.capturedAt)}\nEquity: ${display(model.snapshot.equity)}\nDay P/L: ${dayPnl}\nUnrealized P/L: ${unrealizedPnl}\nCash: ${display(model.snapshot.cash)}\nBuying power: ${display(model.snapshot.buyingPower)}\nPositions: ${positions}`);
  }
  if (normalized.includes("trade") || normalized.includes("order") || normalized.includes("decision") || normalized.includes("why") || normalized.includes("agent")) {
    const [submissions, runs] = await Promise.all([data.getSubmissions(), data.getRuns()]);
    const recent = submissions.slice(0, 8).map((submission) => {
      const reasons = submission.riskDecision?.reasons?.join("; ") ?? "no stored reason";
      return `${submission.symbol} ${submission.status} ${submission.filledQuantity ?? submission.quantity} · ${submission.riskDecision?.approvalStatus ?? "no risk status"} · ${reasons}`;
    });
    const runSummary = runs.slice(0, 3).map((run) => `${run.agentType} ${run.status} (${run.runId})`).join("; ");
    return limit(`Recent paper decisions\n${recent.length ? recent.join("\n") : "none"}\nRecent agent runs: ${runSummary || "none"}\nAll decisions are read-only here; deterministic risk code remains the only order authority.`);
  }
  return "I did not recognize that question. Try /help, or ask about portfolio, positions, trades, risk decisions, scheduler, logs, or infrastructure health.";
}

interface TelegramUpdate { readonly update_id?: unknown; readonly message?: { readonly chat?: { readonly id?: unknown }; readonly from?: { readonly id?: unknown }; readonly text?: unknown } }
interface TelegramResponse { readonly ok?: unknown; readonly result?: unknown }
const isMiniAppRequest = (question: string): boolean => /^(?:\/)?(?:dashboard|portfolio dashboard)$/i.test(question.trim());
export function getTelegramUserIdReply(userId: unknown): string | undefined {
  return typeof userId === "number" && Number.isSafeInteger(userId) && userId > 0 ? `Your Telegram user ID is ${userId}. Use this value for TELEGRAM_MINI_APP_USER_ID; it is not a credential.` : undefined;
}
export type TelegramMiniAppReplyMarkup = { readonly inline_keyboard: readonly (readonly { readonly text: string; readonly web_app: { readonly url: string } }[])[] };
export function buildTelegramMiniAppReplyMarkup(environment: NodeJS.ProcessEnv, open: boolean): TelegramMiniAppReplyMarkup | undefined {
  const url = environment.TELEGRAM_MINI_APP_URL?.trim();
  return open && url && /^https:\/\//i.test(url) && url.length <= 2_000 ? { inline_keyboard: [[{ text: "Open portfolio & alerts", web_app: { url } }]] } : undefined;
}

export function createTelegramOpsAssistant(environment: NodeJS.ProcessEnv, data: TelegramOpsAssistantData, fetcher: typeof fetch = fetch) {
  const enabledRaw = environment.TELEGRAM_ASSISTANT_ENABLED ?? "false";
  if (enabledRaw !== "true" && enabledRaw !== "false") throw new Error("TELEGRAM_ASSISTANT_ENABLED must be exactly true or false.");
  if (enabledRaw !== "true") return { enabled: false as const, start: async () => undefined };
  const config = getTelegramNotificationConfig(environment);
  if (!config.enabled) throw new Error("TELEGRAM_ASSISTANT_ENABLED=true requires Telegram alerts configuration.");
  const pollSeconds = Number(environment.TELEGRAM_ASSISTANT_POLL_SECONDS ?? "20");
  if (!Number.isSafeInteger(pollSeconds) || pollSeconds < 5 || pollSeconds > 120) throw new Error("TELEGRAM_ASSISTANT_POLL_SECONDS must be an integer from 5 to 120.");
  const authorizedChatId = environment.TELEGRAM_CHAT_ID!.trim();
  let offset = 0;
  let running = false;
  const api = `https://api.telegram.org/bot${config.botToken}`;
  const send = async (chatId: string, text: string, openMiniApp = false) => {
    const replyMarkup = buildTelegramMiniAppReplyMarkup(environment, openMiniApp);
    await fetcher(`${api}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, disable_web_page_preview: true, text: limit(text), ...(replyMarkup ? { reply_markup: replyMarkup } : {}) }) });
  };
  const poll = async () => {
    const response = await fetcher(`${api}/getUpdates?timeout=${pollSeconds}&offset=${offset}&allowed_updates=%5B%22message%22%5D`, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("telegram_assistant_poll_failed");
    const body = await response.json() as TelegramResponse;
    if (body.ok !== true || !Array.isArray(body.result)) throw new Error("telegram_assistant_poll_failed");
    for (const item of body.result as TelegramUpdate[]) {
      if (typeof item.update_id === "number" && Number.isSafeInteger(item.update_id)) offset = item.update_id + 1;
      const chatId = item.message?.chat?.id;
      const text = item.message?.text;
      if ((typeof chatId !== "number" && typeof chatId !== "string") || typeof text !== "string" || String(chatId) !== authorizedChatId) continue;
      try {
        const userIdReply = /^(?:\/)?myid$/i.test(text.trim()) ? getTelegramUserIdReply(item.message?.from?.id) : undefined;
        await send(String(chatId), userIdReply ?? await buildTelegramOpsAssistantReply(text, data), !userIdReply && isMiniAppRequest(text));
      } catch { await send(String(chatId), "The read-only assistant could not complete that query. Trading and risk controls are unaffected."); }
    }
  };
  return {
    enabled: true as const,
    async start() {
      if (running) return;
      running = true;
      while (running) {
        try { await poll(); } catch { await new Promise((resolve) => setTimeout(resolve, 5_000)); }
      }
    },
  };
}

export function createTelegramOpsAssistantData(environment: NodeJS.ProcessEnv, health: () => AssistantHealth, fetcher: typeof fetch = fetch): { readonly data: TelegramOpsAssistantData; readonly close: () => Promise<void> } {
  if (!environment.DATABASE_URL?.trim()) throw new Error("TELEGRAM_ASSISTANT_ENABLED=true requires DATABASE_URL.");
  const { db, pool } = createDatabase(environment.DATABASE_URL);
  const account = createAccountStateRepository(db);
  const orders = createPaperOrderRepository(db);
  const runs = createAgentRunRepository(db);
  const askResearch = async (question: string): Promise<string> => {
    const now = new Date();
    const runId = `telegram-research-${now.getTime()}`;
    const agentType = getTelegramResearchAgentType(question);
    await runs.enqueue({ agentType, createdAt: now, inputRefs: [`telegram-question:${runId}`], modelProvider: "telegram_ops_assistant", promptVersion: "telegram-research-router@1", runId, status: "queued", task: `Answer this operator research question using current market evidence: ${question.slice(0, 500)}` });
    await runs.start(runId, new Date());
    const firecrawlKey = environment.FIRECRAWL_API_KEY?.trim();
    if (!firecrawlKey) {
      await runs.fail(runId, new Date(), "web_search_not_configured");
      return `Research agent failed closed (${runId}). Web lookup is not configured; add FIRECRAWL_API_KEY on Railway to include current company/news sources.`;
    }
    try {
      const lookup = await fetchFirecrawlSources(question, firecrawlKey, fetcher);
      if ("error" in lookup) {
        await runs.fail(runId, new Date(), "web_search_unavailable");
        return `Research agent failed closed (${runId}). Web lookup is currently ${lookup.error === "unavailable" ? "unavailable" : "failed"}.`;
      }
      const bounded = lookup.sources;
      const evidenceRefs = bounded.map((item) => item.url).filter(Boolean);
      await runs.succeed(runId, new Date(), { artifactConfidence: "untrusted_reference", artifactEvidenceRefs: evidenceRefs, artifactPayload: { question: question.slice(0, 500), sources: bounded }, artifactRationale: "Bounded web references supplied for operator research; this artifact is advisory and cannot approve or submit an order.", artifactSchemaVersion: "telegram-web-research@1", artifactType: "telegram_web_research" });
      const sources = bounded.map((item) => `${item.title} — ${item.url || "url unavailable"}${item.description ? `: ${item.description}` : ""}`).join("\n");
      return `Research agent completed (${runId}). Firecrawl sources (untrusted reference material; not trading instructions):\n${sources || "none returned"}`;
    } catch {
      await runs.fail(runId, new Date(), "web_search_failed");
      return `Research agent failed closed (${runId}). Web lookup failed; trading and risk controls are unaffected.`;
    }
  };
  return { close: () => pool.end(), data: {
    getHealth: health,
    getModel: () => account.getLatestReadModel(),
    getRuns: () => runs.listRecent(20),
    getSubmissions: async () => orders.listRecent(20),
    getEvidence: async () => {
      const result = await pool.query<{ readonly captured_at: Date; readonly equity: string }>("SELECT captured_at, equity FROM account_snapshots ORDER BY captured_at DESC LIMIT $1", [PAPER_EVIDENCE_SNAPSHOT_LIMIT]);
      const report = buildPaperPerformanceReport(result.rows.map((row) => ({ capturedAt: row.captured_at.toISOString(), equity: String(row.equity) })));
      return { calendarDays: report.calendarDays, consecutiveCalendarDays: report.consecutiveCalendarDays, daysRemaining: Math.max(0, 30 - report.consecutiveCalendarDays), requiredConsecutiveCalendarDays: 30 };
    },
    askResearch,
  } };
}
