import * as DecimalModule from "decimal.js";
import type { StrategyPlugin, StrategySignalCandidate } from "./strategy.js";

interface DecimalValue {
  div(value: DecimalValue | string): DecimalValue;
  minus(value: DecimalValue | string): DecimalValue;
  times(value: DecimalValue | string): DecimalValue;
  isNegative(): boolean;
  isZero(): boolean;
  toDecimalPlaces(decimalPlaces: number): DecimalValue;
  toFixed(decimalPlaces?: number): string;
}
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

export type ShadowObservationStatus = "closed" | "open";
export type ShadowOutcomeReason = "expired" | "invalidated" | "stop" | "target" | "time_stop";

export interface ShadowObservationOutcome {
  readonly exitPrice: string;
  readonly observedAt: string;
  readonly reason: ShadowOutcomeReason;
  readonly returnPercent: string;
}

export interface ShadowObservation {
  readonly assetClass: "crypto" | "us_equity";
  readonly expiresAt: string;
  readonly observationId: string;
  readonly plannedExitPrice?: string;
  readonly plannedStopPrice: string;
  readonly proposedEntryPrice: string;
  readonly rationale: string;
  readonly score: string;
  readonly signalTime: string;
  readonly status: ShadowObservationStatus;
  readonly strategyKey: string;
  readonly strategyVersion: string;
  readonly symbol: string;
  readonly timeStopAt?: string;
  readonly outcome?: ShadowObservationOutcome;
}

function decimal(value: string, name: string): DecimalValue {
  try {
    const parsed = new Decimal(value);
    if (parsed.isNegative()) throw new Error(`${name} must not be negative.`);
    return parsed;
  } catch { throw new Error(`${name} must be a non-negative decimal string.`); }
}

function output(value: DecimalValue): string { return value.toDecimalPlaces(8).toFixed(8); }

export function createShadowObservation<Parameters extends object>(input: {
  readonly candidate: StrategySignalCandidate;
  readonly createdAt: string;
  readonly observationId: string;
  readonly strategy: StrategyPlugin<Parameters>;
}): ShadowObservation {
  if (input.strategy.stage !== "shadow") throw new Error("Only shadow-stage strategies may create shadow observations.");
  if (!input.observationId.trim()) throw new Error("Shadow observation ID is required.");
  if (Number.isNaN(Date.parse(input.createdAt)) || Number.isNaN(Date.parse(input.candidate.signalTime))) throw new Error("Shadow observation timestamps must be valid.");
  if (Date.parse(input.createdAt) < Date.parse(input.candidate.signalTime)) throw new Error("Observation creation cannot precede the signal time.");
  decimal(input.candidate.proposedEntryPrice, "proposed entry price");
  decimal(input.candidate.plannedStopPrice, "planned stop price");
  if (input.candidate.plannedExitPrice) decimal(input.candidate.plannedExitPrice, "planned exit price");
  return Object.freeze({
    assetClass: input.candidate.assetClass, expiresAt: input.candidate.expiresAt, observationId: input.observationId,
    ...(input.candidate.plannedExitPrice ? { plannedExitPrice: input.candidate.plannedExitPrice } : {}),
    plannedStopPrice: input.candidate.plannedStopPrice, proposedEntryPrice: input.candidate.proposedEntryPrice,
    rationale: input.candidate.rationale, score: input.candidate.score, signalTime: input.candidate.signalTime, status: "open",
    strategyKey: input.candidate.strategyKey, strategyVersion: input.candidate.strategyVersion, symbol: input.candidate.symbol,
    ...(input.candidate.timeStopAt ? { timeStopAt: input.candidate.timeStopAt } : {}),
  });
}

export function closeShadowObservation(observation: ShadowObservation, outcome: Omit<ShadowObservationOutcome, "returnPercent">): ShadowObservation {
  if (observation.status !== "open") throw new Error("Shadow observation is already closed.");
  if (Number.isNaN(Date.parse(outcome.observedAt)) || Date.parse(outcome.observedAt) < Date.parse(observation.signalTime)) throw new Error("Shadow outcome timestamp must be after the signal.");
  const entry = decimal(observation.proposedEntryPrice, "proposed entry price");
  const exit = decimal(outcome.exitPrice, "exit price");
  if (exit.isZero()) throw new Error("Shadow exit price must be greater than zero.");
  const returnPercent = output(exit.div(entry).minus("1").times("100"));
  return Object.freeze({ ...observation, outcome: Object.freeze({ ...outcome, returnPercent }), status: "closed" });
}

export function createShadowObservationStore() {
  const observations = new Map<string, ShadowObservation>();
  return {
    append(observation: ShadowObservation) {
      if (observations.has(observation.observationId)) throw new Error("Shadow observation already exists.");
      observations.set(observation.observationId, observation);
      return observation;
    },
    close(observationId: string, outcome: Omit<ShadowObservationOutcome, "returnPercent">) {
      const observation = observations.get(observationId);
      if (!observation) throw new Error("Shadow observation was not found.");
      const closed = closeShadowObservation(observation, outcome);
      observations.set(observationId, closed);
      return closed;
    },
    get(observationId: string) { return observations.get(observationId); },
    list() { return [...observations.values()]; },
  };
}
