import { createAccountStateRepository, createAgentRunRepository, createDatabase, createPaperOrderRepository } from "@momentum/db";
import { getTelegramNotificationConfig } from "@momentum/notifications";

type JsonRecord = Record<string, unknown>;
type AssistantHealth = { readonly status?: string; readonly operatingMode?: string; readonly marketStream?: JsonRecord; readonly researchSchedule?: JsonRecord; readonly positionManagement?: JsonRecord; readonly durableScheduler?: JsonRecord; readonly telegramAlerts?: JsonRecord };
type AssistantModel = { readonly snapshot?: { readonly capturedAt: Date; readonly cash: string; readonly equity: string; readonly buyingPower: string; readonly lastEquity?: string | null }; readonly positions: readonly { readonly symbol: string; readonly assetClass: string; readonly quantity: string; readonly marketValue: string; readonly unrealizedPl: string }[]; readonly orders: readonly { readonly symbol: string; readonly status: string; readonly side: string; readonly filledQuantity?: string | null; readonly updatedAt?: Date | null }[] } | undefined;
type AssistantRun = { readonly agentType: string; readonly status: string; readonly runId: string; readonly createdAt: Date; readonly artifactRationale?: string | null };
type AssistantSubmission = { readonly symbol: string; readonly status: string; readonly assetClass: string; readonly quantity: string; readonly filledQuantity?: string | null; readonly riskDecision?: { readonly approvalStatus?: string; readonly reasons?: readonly string[] } | null; readonly updatedAt?: Date | null };

export interface TelegramOpsAssistantData {
  readonly getHealth: () => AssistantHealth;
  readonly getModel: () => Promise<AssistantModel>;
  readonly getRuns: () => Promise<readonly AssistantRun[]>;
  readonly getSubmissions: () => Promise<readonly AssistantSubmission[]>;
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

export async function buildTelegramOpsAssistantReply(question: string, data: TelegramOpsAssistantData): Promise<string> {
  const normalized = question.trim().toLowerCase();
  if (!normalized) return "Ask about portfolio, positions, trades, risk decisions, scheduler, or infrastructure health.";
  if (normalized === "/help" || normalized === "help" || normalized.includes("what can you")) {
    return "I can answer read-only questions about portfolio/P&L, open positions, recent trades and decisions, agent runs, scheduler health, market-data freshness, and Telegram delivery. I cannot place, cancel, or modify orders.";
  }
  const health = data.getHealth();
  if (normalized.includes("health") || normalized.includes("infra") || normalized.includes("scheduler") || normalized.includes("log") || normalized.includes("status")) {
    const research = health.researchSchedule ?? {};
    const stream = health.marketStream ?? {};
    const positions = health.positionManagement ?? {};
    const durable = health.durableScheduler ?? {};
    const runs = await data.getRuns();
    const latest = runs[0];
    return limit(`Infrastructure health\nWorker: ${scalar(health.status)} · mode ${scalar(health.operatingMode)}\nMarket stream: ${scalar(stream.status)} · freshness ${scalar(stream.freshness)}\nResearch: ${scalar(research.status)} · next ${scalar(research.nextRunAt)} · last risk ${scalar(research.lastRiskCycleStatus)}\nPosition management: ${scalar(positions.status)} · unmanaged ${scalar(positions.unmanagedCount, "0")}\nDurable scheduler: ${scalar(durable.status)} · next ${scalar(durable.nextRunAt)}\nLatest agent run: ${latest ? `${latest.agentType} ${latest.status} at ${utc(latest.createdAt)}` : "none"}`);
  }
  const model = await data.getModel();
  if (normalized.includes("position") || normalized.includes("portfolio") || normalized.includes("p&l") || normalized.includes("pnl") || normalized.includes("equity") || normalized.includes("cash")) {
    if (!model?.snapshot) return "No reconciled paper portfolio snapshot is available.";
    const positions = model.positions.length === 0 ? "none" : model.positions.map((position) => `${position.symbol} ${display(position.quantity)} · value ${display(position.marketValue)} · unrealized P/L ${display(position.unrealizedPl)}`).join("; ");
    return limit(`Paper portfolio as of ${utc(model.snapshot.capturedAt)}\nEquity: ${display(model.snapshot.equity)}\nCash: ${display(model.snapshot.cash)}\nBuying power: ${display(model.snapshot.buyingPower)}\nPositions: ${positions}`);
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

interface TelegramUpdate { readonly update_id?: unknown; readonly message?: { readonly chat?: { readonly id?: unknown }; readonly text?: unknown } }
interface TelegramResponse { readonly ok?: unknown; readonly result?: unknown }

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
  const send = async (chatId: string, text: string) => {
    await fetcher(`${api}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, disable_web_page_preview: true, text: limit(text) }) });
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
      try { await send(String(chatId), await buildTelegramOpsAssistantReply(text, data)); } catch { await send(String(chatId), "The read-only assistant could not complete that query. Trading and risk controls are unaffected."); }
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

export function createTelegramOpsAssistantData(environment: NodeJS.ProcessEnv, health: () => AssistantHealth): { readonly data: TelegramOpsAssistantData; readonly close: () => Promise<void> } {
  if (!environment.DATABASE_URL?.trim()) throw new Error("TELEGRAM_ASSISTANT_ENABLED=true requires DATABASE_URL.");
  const { db, pool } = createDatabase(environment.DATABASE_URL);
  const account = createAccountStateRepository(db);
  const orders = createPaperOrderRepository(db);
  const runs = createAgentRunRepository(db);
  return { close: () => pool.end(), data: {
    getHealth: health,
    getModel: () => account.getLatestReadModel(),
    getRuns: () => runs.listRecent(20),
    getSubmissions: async () => orders.listRecent(20),
  } };
}
