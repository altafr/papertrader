import * as DecimalModule from "decimal.js";

import type { ShadowObservation, ShadowOutcomeReason } from "./shadow.js";

interface DecimalValue {
  abs(): DecimalValue;
  isNegative(): boolean;
  greaterThan(value: DecimalValue | string): boolean;
  lessThan(value: DecimalValue | string): boolean;
}
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

export interface ShadowPromotionObservation {
  readonly observationId: string;
  readonly observedAt: string;
  readonly reason: ShadowOutcomeReason;
  readonly returnPercent: string;
  readonly symbol: string;
}

export interface ShadowPromotionEvidence {
  readonly observations: readonly ShadowPromotionObservation[];
  readonly strategyKey: string;
  readonly strategyVersion: string;
}

export interface ShadowPromotionPolicy {
  readonly maxLossPercent: string;
  readonly minimumClosedObservations: number;
  readonly minimumPositiveObservations: number;
}

export interface ShadowPromotionAssessment {
  readonly automatedChecksPass: boolean;
  readonly promotable: false;
  readonly reasons: readonly string[];
  readonly sampleSize: number;
  readonly positiveObservations: number;
  readonly worstLossPercent: string;
}

export function buildShadowPromotionEvidence(observations: readonly ShadowObservation[]): ShadowPromotionEvidence {
  const closed = observations.filter((observation) => observation.status === "closed" && observation.outcome);
  const first = closed[0];
  if (!first) throw new Error("Shadow promotion evidence requires closed observations.");
  if (closed.some((observation) => observation.strategyKey !== first.strategyKey || observation.strategyVersion !== first.strategyVersion)) {
    throw new Error("Shadow promotion observations must match one strategy version.");
  }
  return Object.freeze({
    observations: Object.freeze(closed.map((observation) => Object.freeze({
      observationId: observation.observationId,
      observedAt: observation.outcome!.observedAt,
      reason: observation.outcome!.reason,
      returnPercent: observation.outcome!.returnPercent,
      symbol: observation.symbol,
    }))),
    strategyKey: first.strategyKey,
    strategyVersion: first.strategyVersion,
  });
}

export function assessShadowPromotion(evidence: ShadowPromotionEvidence, policy: ShadowPromotionPolicy): ShadowPromotionAssessment {
  if (!Number.isInteger(policy.minimumClosedObservations) || policy.minimumClosedObservations < 1) throw new Error("Minimum closed observations must be a positive integer.");
  if (!Number.isInteger(policy.minimumPositiveObservations) || policy.minimumPositiveObservations < 0) throw new Error("Minimum positive observations must be a non-negative integer.");
  const maxLoss = new Decimal(policy.maxLossPercent);
  if (maxLoss.isNegative()) throw new Error("Maximum loss percent must be non-negative.");
  const returns = evidence.observations.map((observation) => new Decimal(observation.returnPercent));
  const positiveObservations = returns.filter((value) => value.greaterThan("0")).length;
  const worstLoss = returns.filter((value) => value.isNegative()).reduce<DecimalValue | undefined>((worst, value) => !worst || value.lessThan(worst) ? value : worst, undefined);
  const worstLossPercent = worstLoss ? worstLoss.abs().toString() : "0";
  const reasons: string[] = [];
  if (returns.length < policy.minimumClosedObservations) reasons.push("Shadow evidence does not meet the minimum closed-observation sample size.");
  if (positiveObservations < policy.minimumPositiveObservations) reasons.push("Shadow evidence does not meet the minimum positive-observation count.");
  if (worstLoss && worstLoss.abs().greaterThan(maxLoss)) reasons.push("Shadow evidence contains a loss larger than the configured maximum.");
  reasons.push("Manual operator review is required before any further lifecycle promotion.");
  return { automatedChecksPass: reasons.length === 1, promotable: false, reasons, sampleSize: returns.length, positiveObservations, worstLossPercent };
}
