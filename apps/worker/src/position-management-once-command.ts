import { createPaperAccountReader, createPaperMarketDataReader, createPaperExitOrderSubmitter } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig, isGlobalKillSwitchActive } from "@momentum/config";
import { createAccountStateRepository, createDatabase, createPaperOrderRepository } from "@momentum/db";
import { reconcilePaperAccount } from "./reconcile.js";
import { runPaperPositionManagementOnce } from "./position-management-runner.js";

if (process.env.POSITION_MANAGEMENT_ONCE !== "true") throw new Error("POSITION_MANAGEMENT_ONCE must be exactly true.");
const runtime = getPaperOnlyRuntimeConfig();
if (!runtime.brokerConnectionEnabled || process.env.OPERATING_MODE !== "paper_autopilot") throw new Error("Position management requires paper autopilot and broker connection.");
if (isGlobalKillSwitchActive()) throw new Error("Position management is blocked by the global kill switch.");
if (!process.env.DATABASE_URL?.trim() || !process.env.ALPACA_API_KEY?.trim() || !process.env.ALPACA_SECRET_KEY?.trim()) throw new Error("Position management requires paper credentials and database.");
const now = new Date().toISOString();
const { db, pool } = createDatabase();
try {
  const reader = createPaperAccountReader({ apiKey: process.env.ALPACA_API_KEY, secretKey: process.env.ALPACA_SECRET_KEY });
  const accountRepository = createAccountStateRepository(db);
  const snapshot = await reconcilePaperAccount(reader, accountRepository);
  const model = await accountRepository.getLatestReadModel();
  const rows = await createPaperOrderRepository(db).listExitPlans();
  const plans = new Map(rows.filter((row) => row.alpacaOrderId && row.entryPrice && row.plannedStopPrice && row.strategyKey && row.strategyVersion).map((row) => [row.symbol, row]));
  const symbols = model?.positions.map((position) => position.symbol).filter((symbol) => plans.has(symbol)) ?? [];
  if (symbols.length === 0) {
    console.log(JSON.stringify({ accountStatus: snapshot.status, decisions: [], submitted: 0, status: "no_managed_positions" }));
    process.exit(0);
  }
  const marks = await createPaperMarketDataReader({ apiKey: process.env.ALPACA_API_KEY, secretKey: process.env.ALPACA_SECRET_KEY }).readSnapshots({ assetClass: "us_equity", symbols });
  const managed = (model?.positions ?? []).flatMap((position) => {
    const plan = plans.get(position.symbol);
    const mark = marks.find((item) => item.symbol === position.symbol);
    const currentPrice = mark?.latestTrade?.price ?? mark?.dailyBar?.close ?? mark?.latestQuote?.askPrice;
    if (!plan || !currentPrice) return [];
    return [{ assetClass: "us_equity" as const, currentPrice, entryPrice: plan.entryPrice!, plannedStopPrice: plan.plannedStopPrice!, ...(plan.plannedTargetPrice ? { plannedTargetPrice: plan.plannedTargetPrice } : {}), quantity: position.quantity, strategyKey: plan.strategyKey!, strategyVersion: plan.strategyVersion!, symbol: position.symbol, ...(plan.timeStopAt ? { timeStopAt: plan.timeStopAt.toISOString() } : {}), intentId: plan.intentId }];
  });
  const result = await runPaperPositionManagementOnce({ now, positions: managed, submitter: createPaperExitOrderSubmitter({ apiKey: process.env.ALPACA_API_KEY, brokerConnectionEnabled: true, secretKey: process.env.ALPACA_SECRET_KEY }) });
  console.log(JSON.stringify({ accountStatus: snapshot.status, decisions: result.decisions, submitted: result.submitted, status: "position_management_completed" }));
} finally {
  await pool.end();
}
