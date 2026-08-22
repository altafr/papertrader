import * as DecimalModule from "decimal.js";
import type { StrategyBar } from "./strategy.js";
import { closeShadowObservation, type ShadowObservation, type ShadowObservationOutcome } from "./shadow.js";

interface DecimalValue {
  greaterThanOrEqualTo(value: DecimalValue | string): boolean;
  lessThanOrEqualTo(value: DecimalValue | string): boolean;
  isNegative(): boolean;
}
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

export interface ShadowEvaluationResult {
  readonly evaluatedBars: number;
  readonly observation: ShadowObservation;
}

function price(value: string, name: string): DecimalValue {
  try {
    const parsed = new Decimal(value);
    if (parsed.isNegative()) throw new Error(`${name} must not be negative.`);
    return parsed;
  } catch { throw new Error(`${name} must be a non-negative decimal string.`); }
}

function outcomeForBar(observation: ShadowObservation, bar: StrategyBar): Omit<ShadowObservationOutcome, "returnPercent"> | undefined {
  if (bar.symbol !== observation.symbol || Date.parse(bar.timestamp) <= Date.parse(observation.signalTime)) return undefined;
  if (Number.isNaN(Date.parse(bar.timestamp))) throw new Error("Shadow evaluation bar timestamp must be valid.");
  const low = price(bar.low, "bar low");
  const high = price(bar.high, "bar high");
  const stopHit = low.lessThanOrEqualTo(observation.plannedStopPrice);
  const targetHit = Boolean(observation.plannedExitPrice) && high.greaterThanOrEqualTo(observation.plannedExitPrice!);
  if (stopHit && targetHit) return { exitPrice: bar.close, observedAt: bar.timestamp, reason: "invalidated" };
  if (stopHit) return { exitPrice: observation.plannedStopPrice, observedAt: bar.timestamp, reason: "stop" };
  if (targetHit) return { exitPrice: observation.plannedExitPrice!, observedAt: bar.timestamp, reason: "target" };
  if (observation.timeStopAt && Date.parse(bar.timestamp) >= Date.parse(observation.timeStopAt)) return { exitPrice: bar.close, observedAt: bar.timestamp, reason: "time_stop" };
  if (Date.parse(bar.timestamp) >= Date.parse(observation.expiresAt)) return { exitPrice: bar.close, observedAt: bar.timestamp, reason: "expired" };
  return undefined;
}

export function evaluateShadowBar(observation: ShadowObservation, bar: StrategyBar): ShadowObservation {
  if (observation.status !== "open") throw new Error("Shadow observation is already closed.");
  const outcome = outcomeForBar(observation, bar);
  return outcome ? closeShadowObservation(observation, outcome) : observation;
}

export function runShadowEvaluation(observation: ShadowObservation, bars: readonly StrategyBar[]): ShadowEvaluationResult {
  let current = observation;
  let evaluatedBars = 0;
  for (const bar of [...bars].sort((left, right) => left.timestamp.localeCompare(right.timestamp))) {
    if (bar.symbol !== observation.symbol || Date.parse(bar.timestamp) <= Date.parse(observation.signalTime)) continue;
    evaluatedBars += 1;
    current = evaluateShadowBar(current, bar);
    if (current.status === "closed") break;
  }
  return { evaluatedBars, observation: current };
}
