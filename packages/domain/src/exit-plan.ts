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
