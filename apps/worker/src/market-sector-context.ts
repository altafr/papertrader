import type { ResearchWatchlistCandidate } from "@momentum/domain";

export type TrendDirection = "bullish" | "bearish" | "neutral";
export type MarketSectorConfirmation = { readonly market: TrendDirection; readonly sector: TrendDirection; readonly sectorSymbol: string; readonly confirmed: boolean; readonly confirmationBasis: "opening_window_5m" };

const sectorBySymbol: Readonly<Record<string, string>> = {
  AAPL: "XLK", MSFT: "XLK", NVDA: "XLK", AMD: "XLK", AVGO: "XLK", INTC: "XLK", PLTR: "XLK", CRWD: "XLK", SMCI: "XLK", PATH: "XLK", NOK: "XLC", GOOGL: "XLC", META: "XLC", NFLX: "XLC", AMZN: "XLY", TSLA: "XLY", AAL: "XLI", JPM: "XLF", BAC: "XLF", NU: "XLF", COIN: "XLF", MARA: "XLF", MSTR: "XLF", RIOT: "XLF", CLSK: "XLF", IONQ: "XLK", RGTI: "XLK", QBTS: "XLK", SOUN: "XLK", RKLB: "XLI", ASTS: "XLI", JOBY: "XLI", IREN: "XLK", CRWV: "XLK", OKLO: "XLI", PLUG: "XLI",
};

export interface IntradayBar {
  readonly timestamp: number;
  readonly open: number;
  readonly close: number;
}

/** Classify the current regular session against its first 5–10 minutes. */
export function classifyIntradayDirection(bars: readonly IntradayBar[], timeZone = "America/New_York"): TrendDirection {
  const valid = bars.filter((bar) => Number.isFinite(bar.timestamp) && Number.isFinite(bar.open) && Number.isFinite(bar.close) && bar.open > 0 && bar.close > 0).sort((left, right) => left.timestamp - right.timestamp);
  if (valid.length === 0) return "neutral";
  const parts = (timestamp: number) => new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(timestamp * 1_000));
  const local = (timestamp: number) => {
    const formatted = parts(timestamp);
    const year = formatted.find((part) => part.type === "year")?.value ?? "";
    const month = formatted.find((part) => part.type === "month")?.value ?? "";
    const day = formatted.find((part) => part.type === "day")?.value ?? "";
    return { dateKey: `${year}-${month}-${day}`, weekday: formatted.find((part) => part.type === "weekday")?.value, minutes: Number(formatted.find((part) => part.type === "hour")?.value ?? "-1") * 60 + Number(formatted.find((part) => part.type === "minute")?.value ?? "-1") };
  };
  const regular = valid.filter((bar) => {
    const current = local(bar.timestamp);
    return ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(current.weekday ?? "") && current.minutes >= 570 && current.minutes < 960;
  });
  if (regular.length === 0) return "neutral";
  const latestDay = local(regular.at(-1)!.timestamp);
  const session = regular.filter((bar) => {
    const current = local(bar.timestamp);
    return current.dateKey === latestDay.dateKey && current.minutes <= latestDay.minutes;
  });
  if (session.length === 0) return "neutral";
  const openingWindow = session.filter((bar) => local(bar.timestamp).minutes < 580).slice(0, 2);
  if (openingWindow.length < 2) return "neutral";
  const reference = openingWindow.at(-1)!.close;
  const latest = session.at(-1)!.close;
  if (latest > reference) return "bullish";
  if (latest < reference) return "bearish";
  return "neutral";
}

async function yahooTrend(symbol: string, fetcher: typeof fetch): Promise<TrendDirection> {
  const response = await fetcher(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=5m`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`market_context_http_${response.status}`);
  const body = await response.json() as { readonly chart?: { readonly result?: readonly { readonly timestamp?: readonly number[]; readonly indicators?: { readonly quote?: readonly { readonly open?: readonly (number | null)[]; readonly close?: readonly (number | null)[] }[] } }[] } };
  const result = body.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const opens = result?.indicators?.quote?.[0]?.open ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const bars = timestamps.flatMap((timestamp, index) => typeof opens[index] === "number" && typeof closes[index] === "number" ? [{ timestamp, open: opens[index], close: closes[index] }] : []);
  return classifyIntradayDirection(bars);
}

export async function confirmMarketAndSector(candidate: ResearchWatchlistCandidate, fetcher: typeof fetch = fetch): Promise<MarketSectorConfirmation> {
  const sectorSymbol = sectorBySymbol[candidate.symbol.toUpperCase()] ?? "XLK";
  const [market, sector] = await Promise.all([yahooTrend("SPY", fetcher), yahooTrend(sectorSymbol, fetcher)]);
  return { confirmed: market !== "neutral" && market === sector, market, sector, sectorSymbol, confirmationBasis: "opening_window_5m" };
}

/** Fail-closed filter: web trend data is advisory evidence, never an order authority. */
export async function filterByMarketAndSector(candidates: readonly ResearchWatchlistCandidate[], fetcher: typeof fetch = fetch): Promise<readonly ResearchWatchlistCandidate[]> {
  const eligible: ResearchWatchlistCandidate[] = [];
  for (const candidate of candidates) {
    if (candidate.assetClass !== "us_equity") continue;
    try {
      const confirmation = await confirmMarketAndSector(candidate, fetcher);
      console.log(JSON.stringify({ event: "market_sector_confirmation", basis: confirmation.confirmationBasis, sector: confirmation.sectorSymbol, symbol: candidate.symbol, marketTrend: confirmation.market, sectorTrend: confirmation.sector, confirmed: confirmation.confirmed }));
      if (confirmation.confirmed) eligible.push(candidate);
    } catch (error: unknown) {
      console.warn(JSON.stringify({ event: "market_sector_confirmation_unavailable", symbol: candidate.symbol, reason: error instanceof Error ? error.message.replace(/[^A-Za-z0-9_.:-]+/g, "_").slice(0, 80) : "unknown" }));
    }
  }
  return eligible;
}
