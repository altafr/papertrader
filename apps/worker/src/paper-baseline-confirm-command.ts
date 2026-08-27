import { createPaperAccountReader } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createAccountStateRepository, createDatabase } from "@momentum/db";
import { reconcilePaperAccount } from "./reconcile.js";

if (process.env.PAPER_BASELINE_CONFIRM !== "true") throw new Error("PAPER_BASELINE_CONFIRM must be exactly true.");
const reference = process.env.PAPER_BASELINE_CONFIRMATION_REFERENCE?.trim();
const note = process.env.PAPER_BASELINE_CONFIRMATION_NOTE?.trim();
if (!reference || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(reference)) throw new Error("PAPER_BASELINE_CONFIRMATION_REFERENCE must be a bounded non-secret reference.");
if (!note || note.length > 500) throw new Error("PAPER_BASELINE_CONFIRMATION_NOTE must be non-empty and at most 500 characters.");
const runtime = getPaperOnlyRuntimeConfig();
if (!runtime.brokerConnectionEnabled || !process.env.DATABASE_URL?.trim()) throw new Error("Baseline confirmation requires paper broker and database configuration.");
if (!process.env.ALPACA_API_KEY?.trim() || !process.env.ALPACA_SECRET_KEY?.trim()) throw new Error("Baseline confirmation requires paper credentials.");
const { db, pool } = createDatabase();
try {
  const repository = createAccountStateRepository(db);
  const snapshot = await reconcilePaperAccount(createPaperAccountReader({ apiKey: process.env.ALPACA_API_KEY, secretKey: process.env.ALPACA_SECRET_KEY }), repository, { approvalReference: reference, runId: `paper-baseline-${Date.now()}` });
  await repository.confirmPaperBaseline({ accountId: snapshot.accountId, baseline: "100000", confirmedAt: new Date(), note, reference, snapshotId: snapshot.id });
  console.log(JSON.stringify({ accountStatus: snapshot.status, baseline: "100000", reference, status: "confirmed" }));
} finally {
  await pool.end();
}
