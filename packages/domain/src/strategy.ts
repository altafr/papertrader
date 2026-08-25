import type { MarketIndicatorSnapshot } from "./indicators.js";

export type StrategyAssetClass = "crypto" | "us_equity";
export type StrategyStage = "disabled" | "eligible_live" | "paper" | "replay" | "shadow";

export const STRATEGY_STAGES: readonly StrategyStage[] = ["disabled", "replay", "shadow", "paper", "eligible_live"];

export interface StrategyBar {
  readonly close: string;
  readonly high: string;
  readonly low: string;
  readonly open: string;
  readonly symbol: string;
  readonly timestamp: string;
  readonly volume: string;
}

export interface StrategyMarketInput {
  readonly bars: readonly StrategyBar[];
  readonly capturedAt: string;
  readonly freshness: "fresh";
  readonly source: "alpaca";
}

export interface StrategyEvaluationContext {
  readonly asOf: string;
  readonly market: StrategyMarketInput;
  readonly positions: readonly { readonly quantity: string; readonly symbol: string }[];
}

export interface StrategySignalCandidate {
  readonly assetClass: StrategyAssetClass;
  readonly expiresAt: string;
  readonly proposedEntryPrice: string;
  readonly plannedExitPrice?: string;
  readonly plannedStopPrice: string;
  readonly rationale: string;
  readonly marketSnapshot?: MarketIndicatorSnapshot;
  readonly recommendedNotional?: string;
  readonly score: string;
  readonly signalTime: string;
  readonly side: "long";
  readonly symbol: string;
  readonly strategyKey: string;
  readonly strategyVersion: string;
  readonly timeStopAt?: string;
}

export interface StrategyParameterSchema<Parameters extends object> {
  readonly defaults: Parameters;
  readonly validate: (value: unknown) => Parameters;
}

export interface StrategyPlugin<Parameters extends object> {
  readonly assetClass: StrategyAssetClass;
  readonly description: string;
  readonly key: string;
  readonly owner: string;
  readonly parameters: StrategyParameterSchema<Parameters>;
  readonly requiredLookbackBars: number;
  readonly stage: StrategyStage;
  readonly version: string;
  /** Pure evaluation: it may propose candidates but never submits or mutates orders. */
  readonly evaluate: (
    context: StrategyEvaluationContext,
    parameters: Parameters,
  ) => readonly StrategySignalCandidate[];
}

const stageIndex = (stage: StrategyStage) => STRATEGY_STAGES.indexOf(stage);

export function canAdvanceStrategyStage(from: StrategyStage, to: StrategyStage): boolean {
  return stageIndex(to) === stageIndex(from) + 1;
}

export function advanceStrategyStage(from: StrategyStage, to: StrategyStage): StrategyStage {
  if (!canAdvanceStrategyStage(from, to)) {
    throw new Error(`Invalid strategy stage transition: ${from} -> ${to}.`);
  }
  return to;
}

export function createStrategyRegistry() {
  const strategies = new Map<string, StrategyPlugin<object>>();
  return {
    get(key: string, version: string) {
      return strategies.get(`${key}@${version}`);
    },
    list() {
      return [...strategies.values()];
    },
    register<Parameters extends object>(strategy: StrategyPlugin<Parameters>) {
      if (strategy.stage !== "disabled") {
        throw new Error("New strategies must be registered disabled until replay validation passes.");
      }
      if (!/^\d+\.\d+\.\d+$/.test(strategy.version)) {
        throw new Error("Strategy version must use semantic version format.");
      }
      if (strategy.requiredLookbackBars < 1 || !Number.isSafeInteger(strategy.requiredLookbackBars)) {
        throw new Error("Strategy requiredLookbackBars must be a positive integer.");
      }
      const key = `${strategy.key}@${strategy.version}`;
      if (strategies.has(key)) throw new Error(`Strategy ${key} is already registered.`);
      strategies.set(key, strategy as unknown as StrategyPlugin<object>);
      return strategy;
    },
  };
}
