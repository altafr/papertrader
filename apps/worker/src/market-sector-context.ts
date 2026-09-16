import type { ResearchWatchlistCandidate } from "@momentum/domain";

export type TrendDirection = "bullish" | "bearish" | "neutral";
export type MarketSectorConfirmation = { readonly market: TrendDirection; readonly sector: TrendDirection; readonly sectorSymbol: string; readonly confirmed: boolean };

const sectorBySymbol: Readonly<Record<string, string>> = {
  AAPL: "XLK", MSFT: "XLK", NVDA: "XLK", AMD: "XLK", AVGO: "XLK", INTC: "XLK", PLTR: "XLK", CRWD: "XLK", SMCI: "XLK", PATH: "XLK", NOK: "XLC", GOOGL: "XLC", META: "XLC", NFLX: "XLC", AMZN: "XLY", TSLA: "XLY", AAL: "XLI", JPM: "XLF", BAC: "XLF", NU: "XLF", COIN: "XLF", MARA: "XLF", MSTR: "XLF", RIOT: "XLF", CLSK: "XLF", IONQ: "XLK", RGTI: "XLK", QBTS: "XLK", SOUN: "XLK", RKLB: "XLI", ASTS: "XLI", JOBY: "XLI", IREN: "XLK", CRWV: "XLK", OKLO: "XLI", PLUG: "XLI",
};

function classify(closes: readonly number[]): TrendDirection {
  const values = closes.filter((value) => Number.isFinite(value) && value > 0);
  if (values.length < 20) return "neutral";
  const latest = values.at(-1)!;
  const fast = values.slice(-20).reduce((sum, value) => sum + value, 0) / Math.min(20, values.length);
  const slow = values.slice(-50).reduce((sum, value) => sum + value, 0) / Math.min(50, values.length);
  const return5 = values.length > 5 ? latest / values.at(-6)! - 1 : 0;
  if (latest > fast && fast > slow && return5 > 0) return "bullish";
  if (latest < fast && fast < slow && return5 < 0) return "bearish";
  return "neutral";
}

async function yahooTrend(symbol: string, fetcher: typeof fetch): Promise<TrendDirection> {
  const response = await fetcher(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`market_context_http_${response.status}`);
  const body = await response.json() as { readonly chart?: { readonly result?: readonly { readonly indicators?: { readonly quote?: readonly { readonly close?: readonly (number | null)[] }[] } }[] } };
  const closes = body.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter((value): value is number => typeof value === "number") ?? [];
  return classify(closes);
}

export async function confirmMarketAndSector(candidate: ResearchWatchlistCandidate, fetcher: typeof fetch = fetch): Promise<MarketSectorConfirmation> {
  const sectorSymbol = sectorBySymbol[candidate.symbol.toUpperCase()] ?? "XLK";
  const [market, sector] = await Promise.all([yahooTrend("SPY", fetcher), yahooTrend(sectorSymbol, fetcher)]);
  return { confirmed: market !== "neutral" && market === sector, market, sector, sectorSymbol };
}

/** Fail-closed filter: web trend data is advisory evidence, never an order authority. */
export async function filterByMarketAndSector(candidates: readonly ResearchWatchlistCandidate[], fetcher: typeof fetch = fetch): Promise<readonly ResearchWatchlistCandidate[]> {
  const eligible: ResearchWatchlistCandidate[] = [];
  for (const candidate of candidates) {
    if (candidate.assetClass !== "us_equity") continue;
    try {
      const confirmation = await confirmMarketAndSector(candidate, fetcher);
      console.log(JSON.stringify({ event: "market_sector_confirmation", sector: confirmation.sectorSymbol, symbol: candidate.symbol, marketTrend: confirmation.market, sectorTrend: confirmation.sector, confirmed: confirmation.confirmed }));
      if (confirmation.confirmed) eligible.push(candidate);
    } catch (error: unknown) {
      console.warn(JSON.stringify({ event: "market_sector_confirmation_unavailable", symbol: candidate.symbol, reason: error instanceof Error ? error.message.replace(/[^A-Za-z0-9_.:-]+/g, "_").slice(0, 80) : "unknown" }));
    }
  }
  return eligible;
}
