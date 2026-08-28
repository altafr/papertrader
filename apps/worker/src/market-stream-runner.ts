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

export function classifyMarketStreamFreshness(lastMessageAt: string | undefined, now = new Date()): "fresh" | "stale" | "unknown" {
  if (!lastMessageAt) return "unknown";
  const capturedAt = Date.parse(lastMessageAt);
  const age = now.getTime() - capturedAt;
  return Number.isFinite(capturedAt) && age >= 0 && age <= MARKET_STREAM_MAX_MESSAGE_AGE_MS ? "fresh" : "stale";
}

export function getMarketStreamHealth(now = new Date()) {
  if (!marketStreamHealth.lastMessageAt) return { ...marketStreamHealth, ...(marketStreamHealth.status === "connected" ? { freshness: "unknown" as const } : {}) };
  return { ...marketStreamHealth, freshness: classifyMarketStreamFreshness(marketStreamHealth.lastMessageAt, now) };
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
      expectedBarIntervalMs: configuration.timeframe === "1Min" ? 60_000 : 60 * 60 * 1_000,
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
    socket?.close();
    marketStreamHealth = { ...marketStreamHealth, status: "stopped" };
  };
}
