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

export function isCompleteExitPlan(input: ExitPlanCompletenessInput): boolean {
  return Boolean(input.alpacaOrderId?.trim() && input.entryPrice?.trim() && input.plannedStopPrice?.trim() && input.strategyKey?.trim() && input.strategyVersion?.trim() && (input.plannedTargetPrice?.trim() || input.timeStopAt));
}
