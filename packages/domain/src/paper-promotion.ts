import * as DecimalModule from "decimal.js";

interface DecimalValue {
  isNegative(): boolean;
  greaterThan(value: DecimalValue | string): boolean;
}
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

export interface PaperPromotionEvidence {
  readonly closedTrades: number;
  readonly consecutiveCalendarDays: number;
  readonly duplicateOrderCount: number;
  readonly maxDrawdownPercent: string;
  readonly positiveTrades: number;
  readonly riskViolationCount: number;
  readonly staleDataBreachCount: number;
  readonly strategyKey: string;
  readonly strategyVersion: string;
}

export interface PaperPromotionPolicy {
  readonly maximumDrawdownPercent: string;
  readonly minimumClosedTrades: number;
  readonly minimumConsecutiveCalendarDays: number;
}

export interface PaperPromotionAssessment {
  readonly automatedChecksPass: boolean;
  readonly promotable: false;
  readonly reasons: readonly string[];
}

export const DEFAULT_PAPER_PROMOTION_POLICY: PaperPromotionPolicy = {
  maximumDrawdownPercent: "5",
  minimumClosedTrades: 20,
  minimumConsecutiveCalendarDays: 30,
};

export function assessPaperPromotion(evidence: PaperPromotionEvidence, policy: PaperPromotionPolicy = DEFAULT_PAPER_PROMOTION_POLICY): PaperPromotionAssessment {
  if (!Number.isInteger(evidence.closedTrades) || evidence.closedTrades < 0) throw new Error("Closed paper trades must be a non-negative integer.");
  if (!Number.isInteger(evidence.positiveTrades) || evidence.positiveTrades < 0 || evidence.positiveTrades > evidence.closedTrades) throw new Error("Positive paper trades must be within the closed-trade count.");
  if (!Number.isInteger(evidence.consecutiveCalendarDays) || evidence.consecutiveCalendarDays < 0) throw new Error("Consecutive paper days must be a non-negative integer.");
  for (const [name, value] of [["risk violations", evidence.riskViolationCount], ["stale-data breaches", evidence.staleDataBreachCount], ["duplicate orders", evidence.duplicateOrderCount]] as const) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer.`);
  }
  if (!Number.isInteger(policy.minimumClosedTrades) || policy.minimumClosedTrades < 1) throw new Error("Minimum closed paper trades must be positive.");
  if (!Number.isInteger(policy.minimumConsecutiveCalendarDays) || policy.minimumConsecutiveCalendarDays < 1) throw new Error("Minimum consecutive paper days must be positive.");
  const drawdown = new Decimal(evidence.maxDrawdownPercent);
  const maximumDrawdown = new Decimal(policy.maximumDrawdownPercent);
  if (drawdown.isNegative() || maximumDrawdown.isNegative()) throw new Error("Drawdown percentages must be non-negative.");
  const reasons: string[] = [];
  if (evidence.consecutiveCalendarDays < policy.minimumConsecutiveCalendarDays) reasons.push("Paper evidence does not meet the minimum consecutive-calendar-day requirement.");
  if (evidence.closedTrades < policy.minimumClosedTrades) reasons.push("Paper evidence does not meet the minimum closed-trade requirement.");
  if (drawdown.greaterThan(maximumDrawdown)) reasons.push("Paper evidence exceeds the maximum drawdown policy.");
  if (evidence.riskViolationCount > 0) reasons.push("Paper evidence contains deterministic risk-policy violations.");
  if (evidence.staleDataBreachCount > 0) reasons.push("Paper evidence contains stale-data breaches.");
  if (evidence.duplicateOrderCount > 0) reasons.push("Paper evidence contains duplicate-order events.");
  reasons.push("Manual operator review is required before any live-readiness decision.");
  return { automatedChecksPass: reasons.length === 1, promotable: false, reasons };
}
