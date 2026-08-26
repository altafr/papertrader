import { createAccountStateRepository, createDatabase } from "@momentum/db";
import { classifyPaperBaseline } from "./paper-baseline-readiness.js";

if (process.env.PAPER_BASELINE_READINESS !== "true") throw new Error("PAPER_BASELINE_READINESS must be exactly true.");
if (!process.env.DATABASE_URL?.trim()) throw new Error("PAPER_BASELINE_READINESS requires DATABASE_URL.");

const { db, pool } = createDatabase();
try {
  const repository = createAccountStateRepository(db);
  const model = await repository.getLatestReadModel();
  const initial = model ? await repository.getInitial(model.snapshot.accountId) : undefined;
  const initialClassification = classifyPaperBaseline(initial?.equity);
  const currentClassification = classifyPaperBaseline(model?.snapshot.equity);
  const status = initialClassification === "within_tolerance" || currentClassification === "within_tolerance" ? "ready" : "blocked";
  console.log(JSON.stringify({ currentBaseline: currentClassification, initialBaseline: initialClassification, status }));
} finally {
  await pool.end();
}
