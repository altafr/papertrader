import { createPaperMarketDataReader, type PaperMarketBar, type PaperMarketDataReader, type PaperMarketSnapshot } from "@momentum/alpaca";
import { Decimal } from "decimal.js";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const chartFontPath = fileURLToPath(new URL("../assets/fonts/NotoSans.ttf", import.meta.url));
let chartFontReady: Promise<unknown> | undefined;

export interface MarketResearchReply { readonly text: string; readonly chart?: Uint8Array; }
const aliases: Readonly<Record<string, string>> = { apple: "AAPL", nvidia: "NVDA", tesla: "TSLA", microsoft: "MSFT", amazon: "AMZN", google: "GOOGL", alphabet: "GOOGL", meta: "META", netflix: "NFLX", palantir: "PLTR", "s&p": "SPY", nasdaq: "QQQ", dow: "DIA" };
const ignored = new Set("I A AN THE WHAT WHY HOW SHOW ME FOR OF AND OR IS IT US USD USA CEO ETF RSI SMA EMA MACD AI PLEASE CAN YOU SUPPORT RESISTANCE QUOTE CHART PRICE MARKET STOCK NEWS LEVELS BUY SELL LONG SHORT ANALYSE ANALYZE TODAY DAILY HKT ET NYSE NASDAQ".split(" "));
export function getMarketResearchSymbols(question: string): readonly string[] {
  const symbolQuestion = question.replace(/\bS&P(?:\s*500)?\b/gi, "SPY");
  const explicit = [...symbolQuestion.matchAll(/(?:\$|\b)([A-Z]{1,5}(?:[.-][A-Z])?)\b/g)].map((match) => match[1]!).filter((symbol) => !ignored.has(symbol));
  const command = /^\/(?:quote|chart|levels|research)(?:@\w+)?\s+([a-z]{1,5}(?:[.-][a-z])?)\b/i.exec(question)?.[1];
  const contextual = /\b(?:quote|price|chart|levels|support|resistance|analy[sz]e)(?:\s+(?:for|of|on))?\s+([a-z]{1,5}(?:[.-][a-z])?)\b/i.exec(question)?.[1];
  const lower = question.toLowerCase();
  const found = explicit.length ? explicit : Object.entries(aliases).filter(([name]) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower)).map(([, symbol]) => symbol);
  const trailing = /\b([a-z]{1,5}(?:[.-][a-z])?)\s+(?:price|chart|support|resistance|quote)\b/i.exec(question)?.[1];
  const conversational = /\b(?:how is|what about|tell me about|what is)\s+([a-z]{1,5}(?:[.-][a-z])?)\b/i.exec(question)?.[1];
  const candidate = command ?? trailing ?? contextual ?? conversational ?? (/^[a-z]{1,5}(?:[.-][a-z])?$/i.test(question.trim()) ? question.trim() : undefined);
  if (!found.length && candidate && !ignored.has(candidate.toUpperCase())) found.push(candidate.toUpperCase());
  return [...new Set(found)].slice(0, 3);
}
export function isMarketToolQuestion(question: string): boolean {
  if (/\b(portfolio|positions?|orders?|trades?|p&l|pnl|scheduler|infrastructure|infra|logs?|exit plan|stop loss|take profit|health|tech[_ -]?solver)\b/i.test(question)) return false;
  if (/\b(bitcoin|btc|ethereum|eth|crypto|fed|inflation|cpi|gdp|interest rates?)\b/i.test(question)) return false;
  return /^\/(?:quote|chart|levels|market|research)\b/i.test(question) || /\b(quotes?|prices?|charts?|support|resistance|technical|trend|moving averages?|rsi|market|sectors?|stocks?)\b/i.test(question) || getMarketResearchSymbols(question).length > 0;
}

const number = (value: string): Decimal => { const result = new Decimal(value); if (!result.isFinite() || result.lte(0)) throw new Error("Invalid market price"); return result; };
const fmt = (value: string | Decimal | undefined): string => value === undefined ? "unavailable" : new Decimal(value).toFixed(2);
const date = (value: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Hong_Kong", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) + " HKT";
const marketDate = (value: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);

export function finalizedResearchBars(bars: readonly PaperMarketBar[], now: Date): readonly PaperMarketBar[] {
  const localTime = new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
  const today = marketDate(now);
  const unique = new Map<string, PaperMarketBar>();
  for (const bar of bars) {
    const timestamp = Date.parse(bar.timestamp);
    if (!Number.isFinite(timestamp) || timestamp > now.getTime()) continue;
    if (marketDate(new Date(timestamp)) === today && localTime < "16:15") continue;
    const open = number(bar.open), high = number(bar.high), low = number(bar.low), close = number(bar.close);
    if (high.lt(Decimal.max(open, close, low)) || low.gt(Decimal.min(open, close, high)) || !new Decimal(bar.volume).isFinite() || new Decimal(bar.volume).lt(0)) throw new Error("Malformed OHLCV bar");
    unique.set(bar.timestamp, bar);
  }
  return [...unique.values()].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)).slice(-100);
}

export interface TechnicalLevels { readonly sma20?: string | undefined; readonly sma50?: string | undefined; readonly rsi14?: string | undefined; readonly supports: readonly string[]; readonly resistances: readonly string[]; readonly method: string; }
/** Daily confirmed two-bar pivots plus prior-session classic pivots; levels are estimates. */
export function calculateTechnicalLevels(bars: readonly PaperMarketBar[], referencePrice: string): TechnicalLevels {
  const reference = number(referencePrice);
  const average = (length: number) => bars.length < length ? undefined : bars.slice(-length).reduce((sum, bar) => sum.plus(bar.close), new Decimal(0)).div(length).toFixed(8);
  let rsi14: string | undefined;
  if (bars.length >= 15) {
    const changes = bars.slice(1).map((bar, i) => new Decimal(bar.close).minus(bars[i]!.close));
    let gain = changes.slice(0, 14).reduce((sum, value) => sum.plus(Decimal.max(value, 0)), new Decimal(0)).div(14);
    let loss = changes.slice(0, 14).reduce((sum, value) => sum.plus(Decimal.max(value.neg(), 0)), new Decimal(0)).div(14);
    for (const change of changes.slice(14)) { gain = gain.times(13).plus(Decimal.max(change, 0)).div(14); loss = loss.times(13).plus(Decimal.max(change.neg(), 0)).div(14); }
    rsi14 = (gain.eq(0) && loss.eq(0) ? new Decimal(50) : loss.eq(0) ? new Decimal(100) : new Decimal(100).minus(new Decimal(100).div(new Decimal(1).plus(gain.div(loss))))).toFixed(8);
  }
  const candidates: Decimal[] = [];
  for (let i = 2; i < bars.length - 2; i++) {
    const nearby = bars.slice(i - 2, i + 3);
    if (nearby.every((bar) => new Decimal(bars[i]!.low).lte(bar.low))) candidates.push(new Decimal(bars[i]!.low));
    if (nearby.every((bar) => new Decimal(bars[i]!.high).gte(bar.high))) candidates.push(new Decimal(bars[i]!.high));
  }
  const last = bars.at(-1);
  if (last) { const pivot = new Decimal(last.high).plus(last.low).plus(last.close).div(3); candidates.push(pivot.times(2).minus(last.high), pivot.times(2).minus(last.low), new Decimal(last.low), new Decimal(last.high)); }
  const unique = [...new Set(candidates.filter((value) => value.gt(0)).map((value) => value.toFixed(2)))].map((value) => new Decimal(value));
  return { sma20: average(20), sma50: average(50), rsi14, supports: unique.filter((value) => value.lt(reference)).sort((a, b) => b.cmp(a)).slice(0, 3).map((value) => value.toFixed(2)), resistances: unique.filter((value) => value.gt(reference)).sort((a, b) => a.cmp(b)).slice(0, 3).map((value) => value.toFixed(2)), method: "Confirmed 2-bar swing pivots + last completed session classic pivots; daily estimates, not guarantees." };
}

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);
/** One mobile-readable, server-rendered chart; Number is used only for pixel geometry. */
export async function renderResearchChart(symbol: string, bars: readonly PaperMarketBar[], levels: TechnicalLevels, feed: string): Promise<Uint8Array> {
  const data = bars.slice(-60);
  if (data.length < 5) throw new Error("Insufficient chart history");
  // Register the bundled OFL font with libvips/Pango, including on fontless servers.
  if (process.platform === "linux") {
    chartFontReady ??= sharp({ text: { text: "Research 0123456789", font: "Noto Sans", fontfile: chartFontPath, rgba: true } }).png().toBuffer().catch((error: unknown) => { chartFontReady = undefined; throw error; });
    await chartFontReady;
  }
  const min = Decimal.min(...data.map((bar) => new Decimal(bar.low))).times("0.98");
  const max = Decimal.max(...data.map((bar) => new Decimal(bar.high))).times("1.02");
  const x = (i: number) => 65 + i * 650 / Math.max(1, data.length - 1);
  const y = (price: string) => 375 - new Decimal(price).minus(min).div(max.minus(min)).times(280).toNumber();
  const elements: string[] = [];
  for (let i = 0; i < 5; i++) { const value = min.plus(max.minus(min).times(i).div(4)); const py = y(value.toFixed()); elements.push(`<path d="M65 ${py}H725" stroke="#29394a"/><text x="735" y="${py + 5}" font-size="17">${value.toFixed(2)}</text>`); }
  const maxVolume = Decimal.max(1, ...data.map((bar) => new Decimal(bar.volume)));
  data.forEach((bar, i) => { const color = new Decimal(bar.close).gte(bar.open) ? "#36c78c" : "#f16d76"; elements.push(`<path d="M${x(i)} ${y(bar.high)}V${y(bar.low)}" stroke="${color}"/><rect x="${x(i) - 3}" y="${Math.min(y(bar.open), y(bar.close))}" width="6" height="${Math.max(2, Math.abs(y(bar.close) - y(bar.open)))}" fill="${color}"/><rect x="${x(i) - 3}" y="${460 - new Decimal(bar.volume).div(maxVolume).times(55).toNumber()}" width="6" height="${new Decimal(bar.volume).div(maxVolume).times(55).toNumber()}" fill="${color}"/>`); });
  for (const [length, color] of [[20, "#f5c66a"], [50, "#9c9cff"]] as const) {
    const points: string[] = [];
    data.forEach((_bar, i) => { const fullIndex = bars.length - data.length + i; if (fullIndex + 1 >= length) points.push(`${x(i)},${y(bars.slice(fullIndex + 1 - length, fullIndex + 1).reduce((sum, bar) => sum.plus(bar.close), new Decimal(0)).div(length).toFixed())}`); });
    if (points.length) elements.push(`<polyline points="${points.join(" ")}" fill="none" stroke="${color}" stroke-width="2"/>`);
  }
  for (const [values, color] of [[levels.supports, "#62b8f6"], [levels.resistances, "#e6ad42"]] as const) {
    values.slice(0, 2).forEach((value) => { const py = y(value); if (py >= 95 && py <= 375) elements.push(`<path d="M65 ${py}H725" stroke="${color}" stroke-dasharray="5 5"/>`); });
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="850" height="630"><rect width="850" height="630" fill="#081018"/><g fill="#e8eef5" font-family="Noto Sans,sans-serif"><text x="35" y="38" font-size="25">${escapeXml(symbol)} — daily price history</text><text x="35" y="68" font-size="16">SMA20 gold · SMA50 violet · S/R dashed · Volume below</text>${elements.join("")}<text x="65" y="398" font-size="14">Max daily volume: ${maxVolume.toFixed(0)} shares</text><text x="65" y="490" font-size="16">${escapeXml(data[0]!.timestamp.slice(0, 10))}</text><text x="585" y="490" font-size="16">${escapeXml(data.at(-1)!.timestamp.slice(0, 10))}</text><text x="35" y="524" font-size="18" fill="#62b8f6">Support: ${levels.supports.slice(0, 2).join(" / ") || "not established"}</text><text x="35" y="550" font-size="18" fill="#e6ad42">Resistance: ${levels.resistances.slice(0, 2).join(" / ") || "not established"}</text><text x="35" y="582" font-size="16">Alpaca ${escapeXml(feed)} · completed split-adjusted daily bars · USD</text><text x="35" y="608" font-size="15">Support/resistance are calculated estimates; read-only research.</text></g></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function buildMarketResearch(question: string, reader: PaperMarketDataReader, options: { readonly now?: Date; readonly feed?: string } = {}): Promise<{ readonly reply: MarketResearchReply; readonly evidence: Readonly<Record<string, unknown>> }> {
  const now = options.now ?? new Date();
  const feed = options.feed ?? "iex";
  const requested = getMarketResearchSymbols(question);
  if (!requested.length && !/\b(market|sectors?|stocks?|nasdaq|dow)\b|^\/market/i.test(question)) return { reply: { text: "Please include a US ticker, for example /quote AAPL, /chart NVDA or /levels TSLA. For an index overview use /market." }, evidence: { dataStatus: "needs_symbol", symbols: [] } };
  if (!requested.length && /sector/i.test(question)) {
    const sectors: Readonly<Record<string, string>> = { XLK: "Technology", XLF: "Financials", XLE: "Energy", XLV: "Health care", XLY: "Consumer discretionary", XLP: "Consumer staples", XLI: "Industrials", XLB: "Materials", XLU: "Utilities", XLRE: "Real estate", XLC: "Communication services" };
    const snapshots = await reader.readSnapshots({ assetClass: "us_equity", symbols: Object.keys(sectors) });
    const ranked = snapshots.flatMap((snapshot) => {
      const mark = snapshot.latestTrade ?? (snapshot.dailyBar ? { price: snapshot.dailyBar.close, timestamp: snapshot.dailyBar.timestamp } : undefined);
      const previous = snapshot.previousDailyBar?.close;
      if (!mark || !previous || !Number.isFinite(Date.parse(mark.timestamp)) || Date.parse(mark.timestamp) > now.getTime() + 60_000) return [];
      try { return [{ symbol: snapshot.symbol, price: number(mark.price).toFixed(2), timestamp: mark.timestamp, change: number(mark.price).minus(number(previous)).div(previous).times(100) }]; } catch { return []; }
    }).sort((a, b) => b.change.cmp(a.change));
    return { reply: { text: `Stock Research Agent · sector ETF comparison\n${ranked.map((item) => `${item.symbol} ${sectors[item.symbol]}: ${item.change.toFixed(2)}% · $${item.price}\n  ${date(item.timestamp)}`).join("\n")}\n${ranked.length}/11 sector ETFs available. Change is vs the previous session close; timestamps can be historical when markets are closed.\nSource: Alpaca ${feed}${feed === "iex" ? " (single-exchange coverage)" : ""}. ETF performance is a sector proxy, not a forecast. Read-only research.` }, evidence: { dataStatus: ranked.length === 11 ? "complete" : ranked.length ? "partial" : "unavailable", tool: "sector_etf_comparison", snapshots, requestedAt: now.toISOString(), feed } };
  }
  const symbols = requested.length ? requested : /sector/i.test(question) ? ["XLK", "XLF", "XLE"] : ["SPY", "QQQ", "DIA"];
  const wantsChart = /\b(chart|technical|analy[sz]e)\b|^\/chart/i.test(question);
  const snapshots = await reader.readSnapshots({ assetClass: "us_equity", symbols });
  const summaries: string[] = [];
  const evidence: Record<string, unknown>[] = [];
  let chart: Uint8Array | undefined;
  for (const symbol of symbols) {
    try {
      const snapshot: PaperMarketSnapshot | undefined = snapshots.find((item) => item.symbol === symbol);
      const marks = [snapshot?.latestTrade, snapshot?.minuteBar ? { price: snapshot.minuteBar.close, timestamp: snapshot.minuteBar.timestamp } : undefined, snapshot?.dailyBar ? { price: snapshot.dailyBar.close, timestamp: snapshot.dailyBar.timestamp } : undefined];
      const mark = marks.find((item) => item && Number.isFinite(Date.parse(item.timestamp)) && Date.parse(item.timestamp) <= now.getTime() + 60_000 && number(item.price).gt(0));
      if (!mark) { summaries.push(`${symbol}: quote unavailable. Check the US ticker or data entitlement.`); continue; }
      const collected: PaperMarketBar[] = [];
      try {
        const start = new Date(now.getTime() - 180 * 86_400_000).toISOString();
        let pageToken: string | undefined;
        for (let page = 0; page < 3; page++) { const response = await reader.readHistoricalBars({ assetClass: "us_equity", symbols: [symbol], timeframe: "1Day", start, end: now.toISOString(), limit: 100, ...(pageToken ? { pageToken } : {}) }); collected.push(...response.bars.filter((bar) => bar.symbol === symbol)); pageToken = response.nextPageToken; if (!pageToken) break; }
      } catch { summaries.push(`${symbol}: historical bars unavailable; quote below is still available.`); }
      const bars = finalizedResearchBars(collected, now);
      const levels = calculateTechnicalLevels(bars, mark.price);
      const previous = snapshot?.previousDailyBar?.close;
      const change = previous && number(previous).gt(0) ? new Decimal(mark.price).minus(previous).div(previous).times(100).toFixed(2) : undefined;
      const ageMinutes = Math.max(0, Math.floor((now.getTime() - Date.parse(mark.timestamp)) / 60_000));
      const trend = levels.sma20 && levels.sma50 ? new Decimal(mark.price).gt(levels.sma20) && new Decimal(levels.sma20).gt(levels.sma50) ? "Bullish alignment: price > SMA20 > SMA50." : new Decimal(mark.price).lt(levels.sma20) && new Decimal(levels.sma20).lt(levels.sma50) ? "Bearish alignment: price < SMA20 < SMA50." : "Mixed trend; price and moving averages are not aligned." : "Insufficient history for trend alignment.";
      summaries.push(`${symbol} $${fmt(mark.price)}${change ? ` (${change}% vs previous session close)` : ""}\nAs of ${date(mark.timestamp)} — ${ageMinutes <= 5 ? "recent last-reported trade/bar" : `historical last-reported value, ${ageMinutes} min old`}\nBid / ask: ${fmt(snapshot?.latestQuote?.bidPrice)} / ${fmt(snapshot?.latestQuote?.askPrice)}${snapshot?.latestQuote ? ` (quote ${date(snapshot.latestQuote.timestamp)})` : ""}\nSMA20 ${fmt(levels.sma20)} · SMA50 ${fmt(levels.sma50)} · RSI14 ${fmt(levels.rsi14)}\n${trend}\nEstimated support: ${levels.supports.join(", ") || "not established below this price"}\nEstimated resistance: ${levels.resistances.join(", ") || "not established above this price"}\nHistory: ${bars.length} completed sessions through ${bars.at(-1)?.timestamp.slice(0, 10) ?? "unavailable"}.`);
      evidence.push({ symbol, snapshot, levels, bars });
      if (wantsChart && !chart && bars.length >= 5) { try { chart = await renderResearchChart(symbol, bars, levels, feed); } catch { summaries.push("Chart rendering unavailable; numerical analysis is shown above."); } }
      else if (wantsChart && bars.length < 5) summaries.push(`${symbol}: chart unavailable; at least five completed daily candles are required.`);
    } catch { summaries.push(`${symbol}: historical/technical data unavailable; no levels were invented.`); }
  }
  const text = `Stock Research Agent · read-only\n${summaries.join("\n\n")}\n\nSource: Alpaca ${feed}${feed === "iex" ? " (single-exchange coverage, not consolidated US volume)" : ""}. ${requested.length ? "" : /sector/i.test(question) ? "Selected sector ETF sample: technology, financials, energy; not all sectors. " : "SPY/QQQ/DIA are index ETF proxies. "}Levels: confirmed 2-bar swing pivots + last completed session pivots.\nResearching a ticker does not add it to the trading universe.`;
  return { reply: { text, ...(chart ? { chart } : {}) }, evidence: { dataStatus: evidence.length === 0 ? "unavailable" : evidence.length < symbols.length ? "partial" : "complete", symbols, feed, requestedAt: now.toISOString(), studies: evidence } };
}

export function createTelegramMarketReader(environment: NodeJS.ProcessEnv, fetcher: typeof fetch = fetch) {
  const feed = environment.TELEGRAM_MARKET_DATA_FEED ?? "iex";
  if (!["iex", "sip", "delayed_sip"].includes(feed)) throw new Error("Invalid TELEGRAM_MARKET_DATA_FEED");
  return { feed, reader: createPaperMarketDataReader({ apiKey: environment.ALPACA_API_KEY ?? "", secretKey: environment.ALPACA_SECRET_KEY ?? "", stockFeed: feed as "iex" | "sip" | "delayed_sip", stockAdjustment: "split", fetchImpl: (input, init) => fetcher(input, { ...init, signal: AbortSignal.timeout(8_000) }) }) };
}
