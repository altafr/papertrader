import {
  createMarketStreamSupervisor,
  createPaperMarketDataReader,
  type MarketAssetClass,
  type MarketBarTimeframe,
  type MarketStreamSocket,
} from "@momentum/alpaca";
import { createDatabase, createTelegramAlertRepository } from "@momentum/db";
import { createRuntimeAlertNotifier } from "./telegram-events.js";

interface RuntimeSocket extends MarketStreamSocket {
  addEventListener(type: "close" | "message" | "open", listener: (event: { data?: unknown }) => void): void;
  close(): void;
}

interface RuntimeWebSocketConstructor {
  new (url: string): RuntimeSocket;
}

const MARKET_STREAM_MAX_MESSAGE_AGE_MS = 5 * 60_000;
let marketStreamHealth: { readonly assetClass?: "crypto" | "us_equity"; readonly lastMessageAt?: string; readonly reconnectCount: number; readonly status: "connected" | "connecting" | "disabled" | "reconnecting" | "stopped" } = { reconnectCount: 0, status: "disabled" };
let marketStreamMaxMessageAgeMs = MARKET_STREAM_MAX_MESSAGE_AGE_MS;

export function classifyMarketStreamFreshness(lastMessageAt: string | undefined, now = new Date(), maxAgeMs = MARKET_STREAM_MAX_MESSAGE_AGE_MS): "fresh" | "stale" | "unknown" {
  if (!lastMessageAt) return "unknown";
  const capturedAt = Date.parse(lastMessageAt);
  const age = now.getTime() - capturedAt;
  return Number.isFinite(capturedAt) && age >= 0 && age <= maxAgeMs ? "fresh" : "stale";
}

/** Translate the configured Alpaca bar timeframe into the supervisor gap interval. */
export function getExpectedBarIntervalMs(timeframe: MarketBarTimeframe): number {
  const intervals: Record<MarketBarTimeframe, number> = {
    "1Min": 60_000,
    "5Min": 5 * 60_000,
    "15Min": 15 * 60_000,
    "1Hour": 60 * 60_000,
    "1Day": 24 * 60 * 60_000,
    "1Week": 7 * 24 * 60 * 60_000,
    "1Month": 30 * 24 * 60 * 60_000,
  };
  return intervals[timeframe];
}

export function getMarketStreamHealth(now = new Date()) {
  if (!marketStreamHealth.lastMessageAt) return { ...marketStreamHealth, ...(marketStreamHealth.status === "connected" ? { freshness: "unknown" as const } : {}) };
  return { ...marketStreamHealth, freshness: classifyMarketStreamFreshness(marketStreamHealth.lastMessageAt, now, marketStreamMaxMessageAgeMs) };
}

function getRuntimeWebSocket(): RuntimeWebSocketConstructor {
  const constructor = (globalThis as unknown as { WebSocket?: RuntimeWebSocketConstructor }).WebSocket;
  if (!constructor) throw new Error("This Node runtime does not provide WebSocket support.");
  return constructor;
}

function getStreamConfiguration(environment = process.env) {
  const assetClass = environment.MARKET_STREAM_ASSET_CLASS;
  if (assetClass !== "crypto" && assetClass !== "us_equity") {
    throw new Error("MARKET_STREAM_ASSET_CLASS must be crypto or us_equity.");
  }
  const timeframe = environment.MARKET_STREAM_TIMEFRAME ?? "1Min";
  const allowedTimeframes: readonly MarketBarTimeframe[] = ["1Day", "1Hour", "1Min", "1Month", "1Week", "5Min", "15Min"];
  if (!allowedTimeframes.includes(timeframe as MarketBarTimeframe)) {
    throw new Error("MARKET_STREAM_TIMEFRAME is not supported.");
  }
  const symbols = (environment.MARKET_STREAM_SYMBOLS ?? "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
  if (symbols.length < 1 || symbols.length > 10) {
    throw new Error("MARKET_STREAM_SYMBOLS must contain 1 to 10 symbols.");
  }
  if (assetClass === "us_equity" && !environment.ALPACA_STOCK_FEED?.trim()) {
    throw new Error("ALPACA_STOCK_FEED is required for stock market streaming.");
  }
  return { assetClass: assetClass as MarketAssetClass, symbols, timeframe: timeframe as MarketBarTimeframe };
}

function streamUrl(assetClass: MarketAssetClass, stockFeed = "iex") {
  if (assetClass === "crypto") return "wss://stream.data.alpaca.markets/v1beta3/crypto/us";
  return `wss://stream.data.alpaca.markets/v2/${encodeURIComponent(stockFeed)}`;
}

export function startPaperMarketStream(environment = process.env) {
  const configuration = getStreamConfiguration(environment);
  marketStreamMaxMessageAgeMs = Math.max(MARKET_STREAM_MAX_MESSAGE_AGE_MS, getExpectedBarIntervalMs(configuration.timeframe) * 2);
  marketStreamHealth = { assetClass: configuration.assetClass, reconnectCount: 0, status: "connecting" };
  const reader = createPaperMarketDataReader({
    apiKey: environment.ALPACA_API_KEY ?? "",
    secretKey: environment.ALPACA_SECRET_KEY ?? "",
  });
  const WebSocketConstructor = getRuntimeWebSocket();
  let stopped = false;
  let socket: RuntimeSocket | undefined;
  const alertDatabase = environment.DATABASE_URL?.trim() ? createDatabase(environment.DATABASE_URL) : undefined;
  const notifier = createRuntimeAlertNotifier(environment, alertDatabase ? createTelegramAlertRepository(alertDatabase.db) : undefined);
  let staleAlertSent = false;
  const staleWatchdog = setInterval(() => {
    const freshness = getMarketStreamHealth().freshness;
    if (freshness === "fresh") {
      staleAlertSent = false;
      return;
    }
    if (freshness !== "stale" || staleAlertSent) return;
    staleAlertSent = true;
    void notifier.notify({
      code: "market_stream_stale",
      cooldownKey: `market_stream_stale:${configuration.assetClass}`,
      cooldownMs: 86_400_000,
      dedupeKey: `market_stream_stale:${configuration.assetClass}`,
      message: `Market stream is stale for ${configuration.assetClass}; no new decisions should rely on stale data until supervised recovery restores freshness.`,
      severity: "critical",
    });
  }, 60_000);
  staleWatchdog.unref();

  const connect = () => {
    if (stopped) return;
    marketStreamHealth = { ...marketStreamHealth, assetClass: configuration.assetClass, status: "connecting" };
    socket = new WebSocketConstructor(streamUrl(configuration.assetClass, environment.ALPACA_STOCK_FEED));
    const transport = socket;
    const supervisor = createMarketStreamSupervisor({
      apiKey: environment.ALPACA_API_KEY ?? "",
      assetClass: configuration.assetClass,
      backfill: async (request) => {
        await reader.readHistoricalBars({ ...request, limit: 1_000 });
      },
      expectedBarIntervalMs: getExpectedBarIntervalMs(configuration.timeframe),
      secretKey: environment.ALPACA_SECRET_KEY ?? "",
      socket: transport,
      symbols: configuration.symbols,
      timeframe: configuration.timeframe,
    });
    transport.addEventListener("open", () => { supervisor.handleSocketOpen(); marketStreamHealth = { ...marketStreamHealth, assetClass: configuration.assetClass, status: "connected" }; });
    transport.addEventListener("message", (event) => {
      marketStreamHealth = { ...marketStreamHealth, lastMessageAt: new Date().toISOString(), status: "connected" };
      if (typeof event.data === "string") void supervisor.handleSocketMessage(event.data).catch(() => notifier.notify({ code: "market_stream_message_failed", dedupeKey: `market_stream_message_failed:${configuration.assetClass}:${configuration.symbols.join(",")}:${Date.now()}`, message: "Market-stream message processing failed closed; the connection remains under supervised recovery.", severity: "critical" }));
    });
    transport.addEventListener("close", () => {
      supervisor.handleSocketClose();
      marketStreamHealth = { ...marketStreamHealth, assetClass: configuration.assetClass, reconnectCount: supervisor.status().reconnectCount, status: "reconnecting" };
      void notifier.notify({ code: "market_stream_disconnected", dedupeKey: `market_stream_disconnected:${configuration.assetClass}:${supervisor.status().reconnectCount}`, message: `Market stream disconnected for ${configuration.assetClass}; supervised reconnect ${supervisor.status().reconnectCount} scheduled.`, severity: "critical" });
      if (!stopped) setTimeout(connect, Math.min(30_000, 1_000 * (supervisor.status().reconnectCount + 1)));
    });
  };

  connect();
  return () => {
    stopped = true;
    clearInterval(staleWatchdog);
    socket?.close();
    marketStreamHealth = { ...marketStreamHealth, status: "stopped" };
  };
}
