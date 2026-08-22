import { z } from "zod";

import type { MarketAssetClass, MarketBarTimeframe, PaperMarketBar } from "./index.js";

const streamBarSchema = z.object({
  T: z.literal("b"),
  S: z.string().min(1),
  c: z.union([z.string(), z.number()]).transform(String),
  h: z.union([z.string(), z.number()]).transform(String),
  l: z.union([z.string(), z.number()]).transform(String),
  n: z.number().int().nonnegative().optional(),
  o: z.union([z.string(), z.number()]).transform(String),
  t: z.string().min(1),
  v: z.union([z.string(), z.number()]).transform(String),
  vw: z.union([z.string(), z.number()]).transform(String).optional(),
});

const streamSuccessSchema = z.object({
  T: z.literal("success"),
  msg: z.string().min(1),
});

export interface MarketStreamSocket {
  send(message: string): void;
}

export interface MarketStreamBackfillRequest {
  readonly assetClass: MarketAssetClass;
  readonly end: string;
  readonly start: string;
  readonly symbols: readonly string[];
  readonly timeframe: MarketBarTimeframe;
}

export interface MarketStreamSupervisorOptions {
  readonly apiKey: string;
  readonly assetClass: MarketAssetClass;
  readonly backfill: (request: MarketStreamBackfillRequest) => Promise<void>;
  readonly expectedBarIntervalMs: number;
  readonly now?: () => Date;
  readonly onBar?: (bar: PaperMarketBar) => void;
  readonly secretKey: string;
  readonly socket: MarketStreamSocket;
  readonly symbols: readonly string[];
  readonly timeframe: MarketBarTimeframe;
}

export type MarketStreamState = "authenticated" | "connecting" | "degraded" | "stopped" | "subscribed";

export interface MarketStreamStatus {
  readonly gapCount: number;
  readonly lastBarAtBySymbol: Readonly<Record<string, string>>;
  readonly lastMessageAt?: string;
  readonly reconnectCount: number;
  readonly state: MarketStreamState;
}

export function parseMarketStreamBars(payload: string): readonly PaperMarketBar[] {
  let decoded: unknown;
  try {
    decoded = JSON.parse(payload);
  } catch {
    return [];
  }
  if (!Array.isArray(decoded)) return [];
  return decoded.flatMap((message) => {
    const parsed = streamBarSchema.safeParse(message);
    if (!parsed.success) return [];
    const bar = parsed.data;
    return [
      {
        close: bar.c,
        high: bar.h,
        low: bar.l,
        open: bar.o,
        symbol: bar.S,
        timestamp: bar.t,
        ...(bar.n !== undefined ? { tradeCount: bar.n } : {}),
        volume: bar.v,
        ...(bar.vw !== undefined ? { vwap: bar.vw } : {}),
      } satisfies PaperMarketBar,
    ];
  });
}

export function createMarketStreamSupervisor(options: MarketStreamSupervisorOptions) {
  let state: MarketStreamState = "stopped";
  let lastMessageAt: string | undefined;
  let reconnectCount = 0;
  let gapCount = 0;
  const lastBarAtBySymbol: Record<string, string> = {};
  const now = options.now ?? (() => new Date());

  const send = (message: Record<string, unknown>) => options.socket.send(JSON.stringify(message));

  const backfillSymbol = async (symbol: string, previousTimestamp: string, currentTimestamp: string) => {
    const previous = Date.parse(previousTimestamp);
    const current = Date.parse(currentTimestamp);
    if (!Number.isFinite(previous) || !Number.isFinite(current) || current - previous <= options.expectedBarIntervalMs) {
      return;
    }
    gapCount += 1;
    state = "degraded";
    await options.backfill({
      assetClass: options.assetClass,
      end: currentTimestamp,
      start: new Date(previous + options.expectedBarIntervalMs).toISOString(),
      symbols: [symbol],
      timeframe: options.timeframe,
    });
    state = "subscribed";
  };

  return {
    handleSocketClose() {
      state = "degraded";
      reconnectCount += 1;
    },
    async handleSocketMessage(payload: string) {
      lastMessageAt = now().toISOString();
      let decoded: unknown;
      try {
        decoded = JSON.parse(payload);
      } catch {
        state = "degraded";
        return;
      }
      if (!Array.isArray(decoded)) {
        state = "degraded";
        return;
      }
      for (const message of decoded) {
        const success = streamSuccessSchema.safeParse(message);
        if (success.success && success.data.msg === "authenticated") {
          state = "authenticated";
          send({ action: "subscribe", bars: options.symbols });
          state = "subscribed";
          continue;
        }
        const bars = parseMarketStreamBars(JSON.stringify([message]));
        for (const bar of bars) {
          const previous = lastBarAtBySymbol[bar.symbol];
          if (previous) await backfillSymbol(bar.symbol, previous, bar.timestamp);
          lastBarAtBySymbol[bar.symbol] = bar.timestamp;
          options.onBar?.(bar);
        }
      }
    },
    handleSocketOpen() {
      state = "connecting";
      send({ action: "auth", key: options.apiKey, secret: options.secretKey });
    },
    start() {
      state = "connecting";
      send({ action: "auth", key: options.apiKey, secret: options.secretKey });
    },
    status(): MarketStreamStatus {
      return {
        gapCount,
        lastBarAtBySymbol: { ...lastBarAtBySymbol },
        ...(lastMessageAt ? { lastMessageAt } : {}),
        reconnectCount,
        state,
      };
    },
    stop() {
      state = "stopped";
    },
  };
}
