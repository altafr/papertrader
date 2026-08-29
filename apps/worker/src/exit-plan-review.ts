import { getExitPlanMissingFields, type ExitPlanMissingField } from "@momentum/domain";

export interface ExitPlanReviewPosition {
  readonly assetClass: string;
  readonly symbol: string;
}

export interface ExitPlanReviewPlan {
  readonly alpacaOrderId?: string | null;
  readonly assetClass: string;
  readonly entryPrice?: string | null;
  readonly intentId: string;
  readonly plannedStopPrice?: string | null;
  readonly plannedTargetPrice?: string | null;
  readonly strategyKey?: string | null;
  readonly strategyVersion?: string | null;
  readonly symbol: string;
  readonly timeStopAt?: Date | null;
}

export interface ExitPlanReviewRow {
  readonly assetClass: string;
  readonly missingFields: readonly ExitPlanMissingField[];
  readonly status: "managed" | "review_required";
  readonly symbol: string;
}

/** Build a bounded review report from broker positions and persisted plan provenance. */
export function buildExitPlanReviewReport(
  positions: readonly ExitPlanReviewPosition[],
  plans: readonly ExitPlanReviewPlan[],
): readonly ExitPlanReviewRow[] {
  const latest = new Map<string, ExitPlanReviewPlan>();
  for (const plan of plans) latest.set(`${plan.assetClass}:${plan.symbol}`, plan);
  return positions.map((position) => {
    const plan = latest.get(`${position.assetClass}:${position.symbol}`);
    const missingFields = getExitPlanMissingFields(plan ? {
      ...(plan.alpacaOrderId == null ? {} : { alpacaOrderId: plan.alpacaOrderId }),
      ...(plan.entryPrice == null ? {} : { entryPrice: plan.entryPrice }),
      ...(plan.plannedStopPrice == null ? {} : { plannedStopPrice: plan.plannedStopPrice }),
      ...(plan.plannedTargetPrice == null ? {} : { plannedTargetPrice: plan.plannedTargetPrice }),
      ...(plan.strategyKey == null ? {} : { strategyKey: plan.strategyKey }),
      ...(plan.strategyVersion == null ? {} : { strategyVersion: plan.strategyVersion }),
      ...(plan.timeStopAt == null ? {} : { timeStopAt: plan.timeStopAt }),
    } : {});
    return { assetClass: position.assetClass, missingFields, status: missingFields.length === 0 ? "managed" : "review_required", symbol: position.symbol };
  });
}
