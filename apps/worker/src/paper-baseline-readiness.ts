import { isPaperBaselineVerified } from "./paper-risk-dry-run.js";

export type PaperBaselineClassification = "within_tolerance" | "outside_tolerance" | "unavailable";

export function classifyPaperBaseline(equity: string | number | undefined): PaperBaselineClassification {
  if (equity === undefined || equity === null || equity === "") return "unavailable";
  return isPaperBaselineVerified(equity) ? "within_tolerance" : "outside_tolerance";
}
