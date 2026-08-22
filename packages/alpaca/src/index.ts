import { z } from "zod";

import { ALPACA_MARKET_DATA_BASE_URL, PAPER_TRADING_API_BASE_URL } from "@momentum/config";

export const ALPACA_ADAPTER_STATUS = "not_configured" as const;

const decimalValue = z.union([z.string(), z.number()]).transform(String);
const nullableDecimalValue = decimalValue.nullable().optional();
const accountPayloadSchema = z.object({
  id: z.string().min(1),
  account_number: z.string().optional(),
  status: z.string().min(1),
  currency: z.string().min(1),
  equity: decimalValue,
  cash: decimalValue,
  buying_power: decimalValue,
  last_equity: decimalValue.optional(),
});
const positionPayloadSchema = z.array(
  z.object({
    symbol: z.string().min(1),
    asset_class: z.string().min(1),
    qty: decimalValue,
    avg_entry_price: decimalValue,
    market_value: decimalValue,
    unrealized_pl: decimalValue,
  }),
);
const orderPayloadSchema = z.array(
  z.object({
    id: z.string().min(1),
    client_order_id: z.string().optional(),
    symbol: z.string().min(1),
    asset_class: z.string().min(1),
    side: z.string().min(1),
    type: z.string().min(1),
    qty: nullableDecimalValue,
    filled_qty: nullableDecimalValue,
    status: z.string().min(1),
    submitted_at: z.string().datetime().nullable().optional(),
    updated_at: z.string().datetime().nullable().optional(),
  }),
);
const activityPayloadSchema = z.array(
  z.object({
    id: z.string().min(1),
    activity_type: z.string().min(1),
    symbol: z.string().optional(),
    qty: nullableDecimalValue,
    price: nullableDecimalValue,
    transaction_time: z.string().datetime().nullable().optional(),
  }),
);
const assetPayloadSchema = z.array(
  z.object({
    id: z.string().min(1),
    class: z.string().min(1),
    exchange: z.string().min(1),
    symbol: z.string().min(1),
    name: z.string().min(1),
    status: z.string().min(1),
    tradable: z.boolean(),
  }),
);
const marketBarPayloadSchema = z.object({
  t: z.string().min(1),
  o: decimalValue,
  h: decimalValue,
  l: decimalValue,
  c: decimalValue,
  v: decimalValue,
  n: z.number().int().nonnegative().optional(),
  vw: nullableDecimalValue,
});
const barsPayloadSchema = z.object({
  bars: z.record(z.string(), z.array(marketBarPayloadSchema)),
  next_page_token: z.string().nullable().optional(),
});
const snapshotPayloadSchema = z.record(
  z.string(),
  z.object({
    latestTrade: z
      .object({ p: decimalValue, t: z.string().min(1) })
      .optional(),
    latestQuote: z
      .object({ ap: decimalValue, bp: decimalValue, t: z.string().min(1) })
      .optional(),
    minuteBar: marketBarPayloadSchema.optional(),
    dailyBar: marketBarPayloadSchema.optional(),
    prevDailyBar: marketBarPayloadSchema.optional(),
  }),
);

export interface PaperAccountSnapshot {
  readonly accountId: string;
  readonly accountNumber?: string;
  readonly buyingPower: string;
  readonly cash: string;
  readonly currency: string;
  readonly equity: string;
  readonly lastEquity?: string;
  readonly status: string;
}

export interface PaperPosition {
  readonly assetClass: string;
  readonly averageEntryPrice: string;
  readonly marketValue: string;
  readonly quantity: string;
  readonly symbol: string;
  readonly unrealizedPl: string;
}

export interface PaperOrder {
  readonly alpacaOrderId: string;
  readonly assetClass: string;
  readonly clientOrderId?: string;
  readonly filledQuantity?: string;
  readonly quantity?: string;
  readonly side: string;
  readonly status: string;
  readonly submittedAt?: string;
  readonly symbol: string;
  readonly type: string;
  readonly updatedAt?: string;
}

export interface PaperActivity {
  readonly activityId: string;
  readonly activityType: string;
  readonly price?: string;
  readonly quantity?: string;
  readonly symbol?: string;
  readonly transactionTime?: string;
}

export interface PaperAccountState {
  readonly account: PaperAccountSnapshot;
  readonly activities: readonly PaperActivity[];
  readonly capturedAt: string;
  readonly orders: readonly PaperOrder[];
  readonly positions: readonly PaperPosition[];
}

export interface PaperAsset {
  readonly assetClass: string;
  readonly assetId: string;
  readonly exchange: string;
  readonly name: string;
  readonly status: string;
  readonly symbol: string;
  readonly tradable: boolean;
}

export interface PaperAssetReader {
  readEligibleAssets(): Promise<readonly PaperAsset[]>;
}

export type MarketAssetClass = "crypto" | "us_equity";
export type MarketBarTimeframe = "1Day" | "1Hour" | "1Min" | "1Month" | "1Week" | "5Min" | "15Min";

export interface PaperMarketBar {
  readonly close: string;
  readonly high: string;
  readonly low: string;
  readonly open: string;
  readonly symbol: string;
  readonly timestamp: string;
  readonly tradeCount?: number;
  readonly volume: string;
  readonly vwap?: string;
}

export interface PaperMarketSnapshot {
  readonly dailyBar?: PaperMarketBar;
  readonly latestQuote?: { readonly askPrice: string; readonly bidPrice: string; readonly timestamp: string };
  readonly latestTrade?: { readonly price: string; readonly timestamp: string };
  readonly minuteBar?: PaperMarketBar;
  readonly previousDailyBar?: PaperMarketBar;
  readonly symbol: string;
}

export interface PaperMarketDataReader {
  readHistoricalBars(request: {
    readonly assetClass: MarketAssetClass;
    readonly end?: string;
    readonly limit: number;
    readonly start?: string;
    readonly symbols: readonly string[];
    readonly timeframe: MarketBarTimeframe;
  }): Promise<{ readonly bars: readonly PaperMarketBar[]; readonly nextPageToken?: string }>;
  readSnapshots(request: {
    readonly assetClass: MarketAssetClass;
    readonly symbols: readonly string[];
  }): Promise<readonly PaperMarketSnapshot[]>;
}

export interface AlpacaAccountReader {
  readAccount(): Promise<PaperAccountSnapshot>;
  readAccountState(): Promise<PaperAccountState>;
}

export interface AlpacaAccountReaderOptions {
  readonly apiKey: string;
  readonly secretKey: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly activityDate?: string;
}

/** Read-only paper account adapter; no order methods are exposed. */
export function createPaperAccountReader(options: AlpacaAccountReaderOptions): AlpacaAccountReader {
  const apiKey = options.apiKey.trim();
  const secretKey = options.secretKey.trim();
  if (!apiKey || !secretKey) {
    throw new Error("Paper Alpaca credentials are required server-side.");
  }

  const baseUrl = options.baseUrl ?? PAPER_TRADING_API_BASE_URL;
  if (baseUrl !== PAPER_TRADING_API_BASE_URL) {
    throw new Error("The account reader only permits the Alpaca paper endpoint.");
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const requestJson = async <T>(path: string, schema: z.ZodType<T>): Promise<T> => {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      headers: {
        "APCA-API-KEY-ID": apiKey,
        "APCA-API-SECRET-KEY": secretKey,
        accept: "application/json",
      },
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`Alpaca account read failed with HTTP ${response.status}.`);
    }
    return schema.parse(await response.json());
  };

  const readAccount = async (): Promise<PaperAccountSnapshot> => {
    const parsed = await requestJson("/v2/account", accountPayloadSchema);
    return {
      accountId: parsed.id,
      ...(parsed.account_number ? { accountNumber: parsed.account_number } : {}),
      buyingPower: parsed.buying_power,
      cash: parsed.cash,
      currency: parsed.currency,
      equity: parsed.equity,
      ...(parsed.last_equity !== undefined ? { lastEquity: parsed.last_equity } : {}),
      status: parsed.status,
    };
  };

  return {
    readAccount,
    async readAccountState() {
      const [account, positions, orders, activities] = await Promise.all([
        readAccount(),
        requestJson("/v2/positions", positionPayloadSchema),
        requestJson("/v2/orders?status=all&limit=100&direction=desc", orderPayloadSchema),
        requestJson(
          `/v2/account/activities?direction=desc&date=${encodeURIComponent(options.activityDate ?? new Date().toISOString().slice(0, 10))}`,
          activityPayloadSchema,
        ),
      ]);
      return {
        account,
        activities: activities.map((activity) => ({
          activityId: activity.id,
          activityType: activity.activity_type,
          ...(activity.price !== undefined && activity.price !== null ? { price: activity.price } : {}),
          ...(activity.qty !== undefined && activity.qty !== null ? { quantity: activity.qty } : {}),
          ...(activity.symbol ? { symbol: activity.symbol } : {}),
          ...(activity.transaction_time ? { transactionTime: activity.transaction_time } : {}),
        })),
        capturedAt: new Date().toISOString(),
        orders: orders.map((order) => ({
          alpacaOrderId: order.id,
          assetClass: order.asset_class,
          ...(order.client_order_id ? { clientOrderId: order.client_order_id } : {}),
          ...(order.filled_qty !== undefined && order.filled_qty !== null
            ? { filledQuantity: order.filled_qty }
            : {}),
          ...(order.qty !== undefined && order.qty !== null ? { quantity: order.qty } : {}),
          side: order.side,
          status: order.status,
          ...(order.submitted_at ? { submittedAt: order.submitted_at } : {}),
          symbol: order.symbol,
          type: order.type,
          ...(order.updated_at ? { updatedAt: order.updated_at } : {}),
        })),
        positions: positions.map((position) => ({
          assetClass: position.asset_class,
          averageEntryPrice: position.avg_entry_price,
          marketValue: position.market_value,
          quantity: position.qty,
          symbol: position.symbol,
          unrealizedPl: position.unrealized_pl,
        })),
      } satisfies PaperAccountState;
    },
  };
}

export function createPaperAssetReader(options: AlpacaAccountReaderOptions): PaperAssetReader {
  const apiKey = options.apiKey.trim();
  const secretKey = options.secretKey.trim();
  if (!apiKey || !secretKey) {
    throw new Error("Paper Alpaca credentials are required server-side.");
  }
  const baseUrl = options.baseUrl ?? PAPER_TRADING_API_BASE_URL;
  if (baseUrl !== PAPER_TRADING_API_BASE_URL) {
    throw new Error("The asset reader only permits the Alpaca paper endpoint.");
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    async readEligibleAssets() {
      const response = await fetchImpl(`${baseUrl}/v2/assets?status=active&tradable=true`, {
        headers: {
          "APCA-API-KEY-ID": apiKey,
          "APCA-API-SECRET-KEY": secretKey,
          accept: "application/json",
        },
        method: "GET",
      });
      if (!response.ok) {
        throw new Error(`Alpaca asset read failed with HTTP ${response.status}.`);
      }
      const assets = assetPayloadSchema.parse(await response.json());
      return assets
        .filter((asset) => asset.class === "us_equity" || asset.class === "crypto")
        .map((asset) => ({
          assetClass: asset.class,
          assetId: asset.id,
          exchange: asset.exchange,
          name: asset.name,
          status: asset.status,
          symbol: asset.symbol,
          tradable: asset.tradable,
        } satisfies PaperAsset));
    },
  };
}

export interface AlpacaMarketDataReaderOptions {
  readonly apiKey: string;
  readonly secretKey: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

function normalizeBar(symbol: string, bar: z.infer<typeof marketBarPayloadSchema>): PaperMarketBar {
  return {
    close: bar.c,
    high: bar.h,
    low: bar.l,
    open: bar.o,
    symbol,
    timestamp: bar.t,
    ...(bar.n !== undefined ? { tradeCount: bar.n } : {}),
    volume: bar.v,
    ...(bar.vw !== undefined && bar.vw !== null ? { vwap: bar.vw } : {}),
  };
}

export function createPaperMarketDataReader(options: AlpacaMarketDataReaderOptions): PaperMarketDataReader {
  const apiKey = options.apiKey.trim();
  const secretKey = options.secretKey.trim();
  if (!apiKey || !secretKey) {
    throw new Error("Paper Alpaca credentials are required server-side.");
  }
  const baseUrl = options.baseUrl ?? ALPACA_MARKET_DATA_BASE_URL;
  if (baseUrl !== ALPACA_MARKET_DATA_BASE_URL) {
    throw new Error("The market-data reader only permits the Alpaca market-data endpoint.");
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const requestJson = async <T>(path: string, schema: z.ZodType<T>): Promise<T> => {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      headers: {
        "APCA-API-KEY-ID": apiKey,
        "APCA-API-SECRET-KEY": secretKey,
        accept: "application/json",
      },
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`Alpaca market-data read failed with HTTP ${response.status}.`);
    }
    return schema.parse(await response.json());
  };

  return {
    async readHistoricalBars(request) {
      const symbols = request.symbols.join(",");
      const path = request.assetClass === "us_equity" ? "/v2/stocks/bars" : "/v1beta3/crypto/us/bars";
      const query = new URLSearchParams({
        limit: String(request.limit),
        symbols,
        timeframe: request.timeframe,
      });
      if (request.start) query.set("start", request.start);
      if (request.end) query.set("end", request.end);
      const parsed = await requestJson(`${path}?${query.toString()}`, barsPayloadSchema);
      const bars = Object.entries(parsed.bars).flatMap(([symbol, symbolBars]) =>
        symbolBars.map((bar) => normalizeBar(symbol, bar)),
      );
      return {
        bars,
        ...(parsed.next_page_token ? { nextPageToken: parsed.next_page_token } : {}),
      };
    },
    async readSnapshots(request) {
      const symbols = request.symbols.join(",");
      const path =
        request.assetClass === "us_equity"
          ? "/v2/stocks/snapshots"
          : "/v1beta3/crypto/us/snapshots";
      const parsed = await requestJson(`${path}?${new URLSearchParams({ symbols }).toString()}`, snapshotPayloadSchema);
      return Object.entries(parsed).map(([symbol, snapshot]) => ({
        ...(snapshot.dailyBar ? { dailyBar: normalizeBar(symbol, snapshot.dailyBar) } : {}),
        ...(snapshot.latestQuote
          ? {
              latestQuote: {
                askPrice: snapshot.latestQuote.ap,
                bidPrice: snapshot.latestQuote.bp,
                timestamp: snapshot.latestQuote.t,
              },
            }
          : {}),
        ...(snapshot.latestTrade
          ? { latestTrade: { price: snapshot.latestTrade.p, timestamp: snapshot.latestTrade.t } }
          : {}),
        ...(snapshot.minuteBar ? { minuteBar: normalizeBar(symbol, snapshot.minuteBar) } : {}),
        ...(snapshot.prevDailyBar ? { previousDailyBar: normalizeBar(symbol, snapshot.prevDailyBar) } : {}),
        symbol,
      } satisfies PaperMarketSnapshot));
    },
  };
}
