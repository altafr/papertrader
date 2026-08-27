import { createPaperAccountReader } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAccountStateRepository, createDatabase } from "@momentum/db";
import { classifyPaperBaseline } from "./paper-baseline-readiness.js";
import { reconcilePaperAccount } from "./reconcile.js";

if (process.env.PAPER_BASELINE_READINESS !== "true") throw new Error("PAPER_BASELINE_READINESS must be exactly true.");
if (!process.env.DATABASE_URL?.trim()) throw new Error("PAPER_BASELINE_READINESS requires DATABASE_URL.");
if (process.env.PAPER_BASELINE_READINESS_LIVE === "true") {
  const runtime = getPaperOnlyRuntimeConfig();
  if (!runtime.brokerConnectionEnabled) throw new Error("PAPER_BASELINE_READINESS_LIVE=true requires BROKER_CONNECTION_ENABLED=true.");
  if (!process.env.ALPACA_API_KEY?.trim() || !process.env.ALPACA_SECRET_KEY?.trim()) throw new Error("PAPER_BASELINE_READINESS_LIVE=true requires paper credentials.");
}

const { db, pool } = createDatabase();
try {
  const repository = createAccountStateRepository(db);
  if (process.env.PAPER_BASELINE_READINESS_LIVE === "true") {
    await reconcilePaperAccount(createPaperAccountReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" }), repository);
  }
  const model = await repository.getLatestReadModel();
  const initial = model ? await repository.getInitial(model.snapshot.accountId) : undefined;
  const confirmation = model ? await repository.getLatestPaperBaselineConfirmation(model.snapshot.accountId, "100000") : undefined;
  const initialClassification = classifyPaperBaseline(initial?.equity);
  const currentClassification = classifyPaperBaseline(model?.snapshot.equity);
  const status = confirmation || initialClassification === "within_tolerance" || currentClassification === "within_tolerance" ? "ready" : "blocked";
  console.log(JSON.stringify({ currentBaseline: currentClassification, initialBaseline: initialClassification, status }));
} finally {
  await pool.end();
}
