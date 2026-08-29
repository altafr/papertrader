import { getExitPlanMissingFields, type ExitPlanMissingField } from "@momentum/domain";

export const EXIT_PLAN_BACKFILL_INPUTS: Readonly<Record<ExitPlanMissingField, string>> = {
  alpacaOrderId: "Existing broker-linked submission is required; no CLI value is accepted.",
  entryPrice: "EXIT_PLAN_ENTRY_PRICE",
  plannedStopPrice: "EXIT_PLAN_STOP_PRICE",
  strategyKey: "EXIT_PLAN_STRATEGY_KEY",
  strategyVersion: "EXIT_PLAN_STRATEGY_VERSION",
  plannedTargetPriceOrTimeStop: "EXIT_PLAN_TARGET_PRICE or EXIT_PLAN_TIME_STOP_AT",
};

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
  readonly updatedAt?: Date | null;
  readonly createdAt?: Date | null;
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
  for (const plan of plans) {
    const key = `${plan.assetClass}:${plan.symbol}`;
    const current = latest.get(key);
    const planTime = plan.updatedAt?.getTime() ?? plan.createdAt?.getTime() ?? 0;
    const currentTime = current?.updatedAt?.getTime() ?? current?.createdAt?.getTime() ?? 0;
    if (!current || planTime > currentTime || (planTime === currentTime && plan.intentId > current.intentId)) latest.set(key, plan);
  }
  return [...positions]
    .sort((left, right) => `${left.assetClass}:${left.symbol}`.localeCompare(`${right.assetClass}:${right.symbol}`))
    .slice(0, 100)
    .map((position) => {
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
