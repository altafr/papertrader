import * as DecimalModule from "decimal.js";

interface DecimalValue {
  isZero(): boolean;
  lessThanOrEqualTo(value: string): boolean;
  greaterThanOrEqualTo(value: string): boolean;
}
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

export type PositionExitReason = "profit_target" | "stop_loss" | "time_stop";

export interface ManagedPaperPosition {
  readonly assetClass: "crypto" | "us_equity";
  readonly currentPrice: string;
  readonly entryPrice: string;
  readonly plannedStopPrice: string;
  readonly plannedTargetPrice?: string;
  readonly quantity: string;
  readonly strategyKey: string;
  readonly strategyVersion: string;
  readonly symbol: string;
  readonly timeStopAt?: string;
}

export interface PositionExitDecision {
  readonly exitPrice: string;
  readonly reason?: PositionExitReason;
  readonly shouldExit: boolean;
  readonly symbol: string;
}

/** Evaluate one long paper position using its immutable entry/exit plan. No broker access or mutation. */
export function evaluatePaperPositionExit(position: ManagedPaperPosition, now: string): PositionExitDecision {
  if (!position.symbol.trim() || !position.strategyKey.trim() || !position.strategyVersion.trim()) throw new Error("Position identity is required.");
  const current = new Decimal(position.currentPrice);
  const entry = new Decimal(position.entryPrice);
  const stop = new Decimal(position.plannedStopPrice);
  if (current.isZero() || entry.isZero() || stop.isZero()) throw new Error("Position prices must be greater than zero.");
  if (current.lessThanOrEqualTo(position.plannedStopPrice)) return { exitPrice: position.currentPrice, reason: "stop_loss", shouldExit: true, symbol: position.symbol };
  if (position.plannedTargetPrice) {
    const target = new Decimal(position.plannedTargetPrice);
    if (target.isZero()) throw new Error("Position target price must be greater than zero.");
    if (current.greaterThanOrEqualTo(position.plannedTargetPrice)) return { exitPrice: position.currentPrice, reason: "profit_target", shouldExit: true, symbol: position.symbol };
  }
  if (position.timeStopAt) {
    const nowMs = Date.parse(now);
    const stopMs = Date.parse(position.timeStopAt);
    if (!Number.isFinite(nowMs) || !Number.isFinite(stopMs)) throw new Error("Position time-stop timestamps must be valid.");
    if (nowMs >= stopMs) return { exitPrice: position.currentPrice, reason: "time_stop", shouldExit: true, symbol: position.symbol };
  }
  return { exitPrice: position.currentPrice, shouldExit: false, symbol: position.symbol };
}
