import * as DecimalModule from "decimal.js";

import { MAX_SINGLE_TRADE_STOP_LOSS_PERCENT } from "./metrics.js";

interface DecimalValue {
  div(value: DecimalValue | string): DecimalValue;
  equals(value: DecimalValue | string): boolean;
  greaterThan(value: DecimalValue | string): boolean;
  isZero(): boolean;
  lessThanOrEqualTo(value: DecimalValue | string): boolean;
  minus(value: DecimalValue | string): DecimalValue;
  times(value: DecimalValue | string): DecimalValue;
}
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

/** A complete exit plan is required before automatic position management. */
export interface ExitPlanCompletenessInput {
  readonly entryPrice?: string | null;
  readonly plannedStopPrice?: string | null;
  readonly plannedTargetPrice?: string | null;
  readonly timeStopAt?: Date | string | null;
  readonly strategyKey?: string | null;
  readonly strategyVersion?: string | null;
  readonly alpacaOrderId?: string | null;
}

export type ExitPlanMissingField = "alpacaOrderId" | "entryPrice" | "plannedStopPrice" | "strategyKey" | "strategyVersion" | "plannedTargetPriceOrTimeStop";

/** Validate operator-supplied remediation values before they can mark a position managed. */
export function validateExitPlanValues(input: { readonly entryPrice: string; readonly plannedStopPrice: string; readonly plannedTargetPrice?: string; readonly timeStopAt?: Date | string | null }): void {
  let entry: DecimalValue;
  let stop: DecimalValue;
  try {
    entry = new Decimal(input.entryPrice);
    stop = new Decimal(input.plannedStopPrice);
  } catch {
    throw new Error("Exit-plan prices must be valid decimal strings.");
  }
  if (entry.isZero() || entry.lessThanOrEqualTo("0")) throw new Error("Exit-plan entry price must be greater than zero.");
  if (stop.isZero() || stop.lessThanOrEqualTo("0")) throw new Error("Exit-plan stop price must be greater than zero.");
  if (stop.greaterThan(input.entryPrice) || stop.equals(input.entryPrice)) throw new Error("Exit-plan stop price must be below the entry price.");
  if (entry.minus(stop).div(entry).times("100").greaterThan(MAX_SINGLE_TRADE_STOP_LOSS_PERCENT)) throw new Error("Exit-plan stop cannot exceed the maximum 5% adverse-loss distance.");
  if (input.plannedTargetPrice !== undefined) {
    let target: DecimalValue;
    try { target = new Decimal(input.plannedTargetPrice); } catch { throw new Error("Exit-plan target price must be a valid decimal string."); }
    if (target.lessThanOrEqualTo(input.entryPrice)) throw new Error("Exit-plan target price must be above the entry price.");
  }
  if (input.timeStopAt !== undefined && input.timeStopAt !== null && !Number.isFinite(Date.parse(typeof input.timeStopAt === "string" ? input.timeStopAt : input.timeStopAt.toISOString()))) {
    throw new Error("Exit-plan time stop must be a valid timestamp.");
  }
  if (!input.plannedTargetPrice?.trim() && !input.timeStopAt) throw new Error("Exit-plan requires a target price or time stop.");
}

export function getExitPlanMissingFields(input: ExitPlanCompletenessInput): readonly ExitPlanMissingField[] {
  return [
    ...(input.alpacaOrderId?.trim() ? [] : ["alpacaOrderId" as const]),
    ...(input.entryPrice?.trim() ? [] : ["entryPrice" as const]),
    ...(input.plannedStopPrice?.trim() ? [] : ["plannedStopPrice" as const]),
    ...(input.strategyKey?.trim() ? [] : ["strategyKey" as const]),
    ...(input.strategyVersion?.trim() ? [] : ["strategyVersion" as const]),
    ...(input.plannedTargetPrice?.trim() || input.timeStopAt ? [] : ["plannedTargetPriceOrTimeStop" as const]),
  ];
}

export function isCompleteExitPlan(input: ExitPlanCompletenessInput): boolean {
  return getExitPlanMissingFields(input).length === 0;
}
