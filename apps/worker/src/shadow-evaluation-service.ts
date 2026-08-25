import type { PaperMarketDataReader } from "@momentum/alpaca";
import type { createShadowObservationRepository } from "@momentum/db";
import { runShadowEvaluationBatch, type MarketIndicatorSnapshot, type ShadowEvaluationPersistence, type FinalizedShadowBarSource } from "@momentum/domain";
import type { ShadowObservation } from "@momentum/domain";
import type { StrategyBar } from "@momentum/domain";
import { getShadowScheduleHealth, setShadowScheduleHealth } from "./shadow-evaluation.js";

type ShadowRepository = ReturnType<typeof createShadowObservationRepository>;

type PersistedOpenRow = {
  readonly assetClass: string; readonly createdAt: Date; readonly expiresAt: Date; readonly observationId: string; readonly plannedExitPrice: string | null;
  readonly plannedStopPrice: string; readonly proposedEntryPrice: string; readonly rationale: string; readonly score: string; readonly signalTime: Date;
  readonly strategyKey: string; readonly strategyVersion: string; readonly symbol: string; readonly timeStopAt: Date | null;
  readonly marketSnapshot?: Readonly<Record<string, string | null>> | null;
};

function toObservation(row: PersistedOpenRow): ShadowObservation {
  if (row.assetClass !== "crypto" && row.assetClass !== "us_equity") throw new Error("Shadow observation asset class is unsupported.");
  const marketSnapshot = row.marketSnapshot && typeof row.marketSnapshot.asOf === "string" && typeof row.marketSnapshot.close === "string" && typeof row.marketSnapshot.volume === "string" && (row.marketSnapshot.ema20 === null || typeof row.marketSnapshot.ema20 === "string") && (row.marketSnapshot.ema50 === null || typeof row.marketSnapshot.ema50 === "string") && (row.marketSnapshot.rsi14 === null || typeof row.marketSnapshot.rsi14 === "string") && (row.marketSnapshot.atr14 === null || typeof row.marketSnapshot.atr14 === "string") && (row.marketSnapshot.relativeVolume20 === null || typeof row.marketSnapshot.relativeVolume20 === "string") ? row.marketSnapshot as unknown as MarketIndicatorSnapshot : undefined;
  return {
    assetClass: row.assetClass, expiresAt: row.expiresAt.toISOString(), observationId: row.observationId,
    ...(row.plannedExitPrice ? { plannedExitPrice: row.plannedExitPrice } : {}), plannedStopPrice: row.plannedStopPrice, proposedEntryPrice: row.proposedEntryPrice,
    rationale: row.rationale, ...(marketSnapshot ? { marketSnapshot } : {}), score: row.score, signalTime: row.signalTime.toISOString(), status: "open", strategyKey: row.strategyKey, strategyVersion: row.strategyVersion,
    symbol: row.symbol, ...(row.timeStopAt ? { timeStopAt: row.timeStopAt.toISOString() } : {}),
  };
}

export function createAlpacaShadowBarSource(reader: PaperMarketDataReader): FinalizedShadowBarSource {
  return {
    async getFinalizedBars(observation) {
      const result = await reader.readHistoricalBars({ assetClass: observation.assetClass, end: observation.expiresAt, limit: 1_000, start: observation.signalTime, symbols: [observation.symbol], timeframe: "1Min" });
      return result.bars satisfies readonly StrategyBar[];
    },
  };
}

export function createDatabaseShadowPersistence(repository: ShadowRepository): ShadowEvaluationPersistence {
  return {
    async isClosed(observationId) { return Boolean((await repository.get(observationId))?.outcome); },
    async recordOutcome(observationId, outcome) {
      return repository.recordOutcome({ exitPrice: outcome.exitPrice, observedAt: new Date(outcome.observedAt), observationId, reason: outcome.reason, returnPercent: outcome.returnPercent });
    },
  };
}

export async function runShadowEvaluationOnce(input: { readonly barSource: FinalizedShadowBarSource; readonly repository: ShadowRepository }): Promise<ReturnType<typeof runShadowEvaluationBatch>> {
  const openRows = await input.repository.listOpen();
  return runShadowEvaluationBatch({ barSource: input.barSource, observations: openRows.map(toObservation), persistence: createDatabaseShadowPersistence(input.repository) });
}

export function createShadowEvaluationScheduler(input: { readonly intervalSeconds: number; readonly run: () => Promise<unknown>; readonly now?: () => Date }) {
  const now = input.now ?? (() => new Date());
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = true;
  const schedule = () => {
    if (stopped) return;
    const nextRunAt = new Date(now().getTime() + input.intervalSeconds * 1_000).toISOString();
    const previous = getShadowScheduleHealth();
    setShadowScheduleHealth({ ...previous, nextRunAt, status: "scheduled" });
    timer = setTimeout(() => { void execute(); }, input.intervalSeconds * 1_000);
  };
  const execute = async () => {
    if (stopped) return;
    setShadowScheduleHealth({ ...getShadowScheduleHealth(), status: "running" });
    try {
      await input.run();
      setShadowScheduleHealth({ lastRunAt: now().toISOString(), status: "ready" });
    } catch {
      setShadowScheduleHealth({ lastRunAt: now().toISOString(), status: "degraded" });
    }
    schedule();
  };
  return {
    start() { if (!stopped) return; stopped = false; schedule(); },
    stop() { stopped = true; if (timer) clearTimeout(timer); timer = undefined; setShadowScheduleHealth({ status: "disabled" }); },
    async runNow() { await execute(); },
  };
}
