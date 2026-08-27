import { createPaperAccountReader, createPaperMarketDataReader } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAccountStateRepository, createAgentRunRepository, createDatabase } from "@momentum/db";
import { classifyPaperBaseline } from "./paper-baseline-readiness.js";
import { reconcilePaperAccount } from "./reconcile.js";

if (process.env.PAPER_ORDER_PREFLIGHT !== "true") throw new Error("PAPER_ORDER_PREFLIGHT must be exactly true.");
const runtime = getPaperOnlyRuntimeConfig();
if (!runtime.brokerConnectionEnabled || !process.env.DATABASE_URL?.trim()) throw new Error("PAPER_ORDER_PREFLIGHT requires paper broker and database configuration.");
if (!process.env.ALPACA_API_KEY?.trim() || !process.env.ALPACA_SECRET_KEY?.trim()) throw new Error("PAPER_ORDER_PREFLIGHT requires paper credentials.");

const symbol = (process.env.PAPER_ORDER_SYMBOL ?? "AAPL").trim().toUpperCase();
const { db, pool } = createDatabase();
try {
  const accountRepository = createAccountStateRepository(db);
  const accountReader = createPaperAccountReader({ apiKey: process.env.ALPACA_API_KEY, secretKey: process.env.ALPACA_SECRET_KEY });
  const snapshot = await reconcilePaperAccount(accountReader, accountRepository);
  const initial = await accountRepository.getInitial(snapshot.accountId);
  const currentBaseline = classifyPaperBaseline(snapshot.equity);
  const initialBaseline = classifyPaperBaseline(initial?.equity);
  const confirmation = await accountRepository.getLatestPaperBaselineConfirmation(snapshot.accountId, "100000");
  const researchRuns = await createAgentRunRepository(db).listRecent(50);
  const research = researchRuns.find((run) => run.agentType === "stock_research" && run.status === "succeeded");
  const payload = research?.artifactPayload;
  const candidateCount = payload && typeof payload === "object" && Array.isArray(payload.candidates) ? payload.candidates.length : 0;
  let snapshotFallbackAvailable = false;
  try {
    const market = await createPaperMarketDataReader({ apiKey: process.env.ALPACA_API_KEY, secretKey: process.env.ALPACA_SECRET_KEY }).readSnapshots({ assetClass: "us_equity", symbols: [symbol] });
    const item = market.find((entry) => entry.symbol === symbol);
    snapshotFallbackAvailable = Boolean(item && (item.latestTrade?.price ?? item.dailyBar?.close ?? item.latestQuote?.askPrice) && (item.latestTrade?.timestamp ?? item.dailyBar?.timestamp ?? item.latestQuote?.timestamp));
  } catch {
    snapshotFallbackAvailable = false;
  }
  const baselineReady = Boolean(confirmation) || currentBaseline === "within_tolerance" || initialBaseline === "within_tolerance";
  const status = baselineReady && Boolean(research) && snapshotFallbackAvailable ? "ready" : "blocked";
  console.log(JSON.stringify({ baseline: { current: currentBaseline, initial: initialBaseline }, research: { candidateCount, runId: research?.runId ?? null, status: research?.status ?? "unavailable" }, snapshotFallbackAvailable, status, symbol }));
} finally {
  await pool.end();
}
