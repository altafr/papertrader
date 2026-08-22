import {
  createMarketStreamSupervisor,
  createPaperMarketDataReader,
  type MarketAssetClass,
  type MarketBarTimeframe,
  type MarketStreamSocket,
} from "@momentum/alpaca";

interface RuntimeSocket extends MarketStreamSocket {
  addEventListener(type: "close" | "message" | "open", listener: (event: { data?: unknown }) => void): void;
  close(): void;
}

interface RuntimeWebSocketConstructor {
  new (url: string): RuntimeSocket;
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
  const reader = createPaperMarketDataReader({
    apiKey: environment.ALPACA_API_KEY ?? "",
    secretKey: environment.ALPACA_SECRET_KEY ?? "",
  });
  const WebSocketConstructor = getRuntimeWebSocket();
  let stopped = false;
  let socket: RuntimeSocket | undefined;

  const connect = () => {
    if (stopped) return;
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
    transport.addEventListener("open", () => supervisor.handleSocketOpen());
    transport.addEventListener("message", (event) => {
      if (typeof event.data === "string") void supervisor.handleSocketMessage(event.data);
    });
    transport.addEventListener("close", () => {
      supervisor.handleSocketClose();
      if (!stopped) setTimeout(connect, Math.min(30_000, 1_000 * (supervisor.status().reconnectCount + 1)));
    });
  };

  connect();
  return () => {
    stopped = true;
    socket?.close();
  };
}
