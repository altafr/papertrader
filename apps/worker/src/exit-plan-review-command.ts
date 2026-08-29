import { createAccountStateRepository, createDatabase, createPaperOrderRepository } from "@momentum/db";
import { buildExitPlanReviewReport } from "./exit-plan-review.js";

if (process.env.EXIT_PLAN_REVIEW !== "true") throw new Error("EXIT_PLAN_REVIEW must be exactly true.");
if (!process.env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL is required.");

const { db, pool } = createDatabase();
try {
  const account = await createAccountStateRepository(db).getLatestReadModel();
  const plans = await createPaperOrderRepository(db).listExitPlans();
  const report = buildExitPlanReviewReport(account?.positions ?? [], plans);
  console.log(JSON.stringify({ positions: report, reviewRequired: report.filter((row) => row.status === "review_required").length, status: "exit_plan_review" }));
} finally { await pool.end(); }
