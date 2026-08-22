import type { StrategyBar } from "./strategy.js";
import { runShadowEvaluation, type ShadowEvaluationResult } from "./shadow-evaluator.js";
import type { ShadowObservation, ShadowObservationOutcome } from "./shadow.js";

export interface ShadowEvaluationPersistence {
  isClosed(observationId: string): Promise<boolean>;
  recordOutcome(observationId: string, outcome: Omit<ShadowObservationOutcome, "returnPercent"> & { readonly returnPercent: string }): Promise<unknown>;
}

export interface FinalizedShadowBarSource {
  getFinalizedBars(observation: ShadowObservation): Promise<readonly StrategyBar[]>;
}

export interface ShadowRunnerFailure {
  readonly code: "bar_source_failed" | "outcome_persistence_failed";
  readonly observationId: string;
}

export interface ShadowRunnerResult {
  readonly alreadyClosed: number;
  readonly closed: number;
  readonly failures: readonly ShadowRunnerFailure[];
  readonly opened: number;
  readonly processed: number;
}

export async function runShadowEvaluationBatch(input: {
  readonly barSource: FinalizedShadowBarSource;
  readonly observations: readonly ShadowObservation[];
  readonly persistence: ShadowEvaluationPersistence;
}): Promise<ShadowRunnerResult> {
  let alreadyClosed = 0;
  let closed = 0;
  let opened = 0;
  let processed = 0;
  const failures: ShadowRunnerFailure[] = [];
  for (const observation of [...input.observations].sort((left, right) => left.observationId.localeCompare(right.observationId))) {
    processed += 1;
    if (await input.persistence.isClosed(observation.observationId)) {
      alreadyClosed += 1;
      continue;
    }
    let evaluation: ShadowEvaluationResult;
    try {
      evaluation = runShadowEvaluation(observation, await input.barSource.getFinalizedBars(observation));
    } catch {
      failures.push({ code: "bar_source_failed", observationId: observation.observationId });
      continue;
    }
    if (!evaluation.observation.outcome) {
      opened += 1;
      continue;
    }
    try {
      await input.persistence.recordOutcome(observation.observationId, evaluation.observation.outcome);
      closed += 1;
    } catch {
      failures.push({ code: "outcome_persistence_failed", observationId: observation.observationId });
    }
  }
  return { alreadyClosed, closed, failures, opened, processed };
}
