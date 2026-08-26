import { classifyPaperBaseline as classifyDomainPaperBaseline } from "@momentum/domain";

export type PaperBaselineClassification = "within_tolerance" | "outside_tolerance" | "unavailable";

export function classifyPaperBaseline(equity: string | number | undefined): PaperBaselineClassification {
  if (equity === undefined || equity === null || equity === "") return "unavailable";
  return classifyDomainPaperBaseline(equity) === "within_tolerance" ? "within_tolerance" : "outside_tolerance";
}
