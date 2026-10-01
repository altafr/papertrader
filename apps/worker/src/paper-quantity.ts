import * as DecimalModule from "decimal.js";

import { DEFAULT_PAPER_RISK_POLICY, type ResearchWatchlistCandidate } from "@momentum/domain";

interface DecimalValue { abs(): DecimalValue; isFinite(): boolean; minus(value: DecimalValue | string): DecimalValue; lessThan(value: DecimalValue | string): boolean; div(value: DecimalValue | string): DecimalValue; greaterThan(value: DecimalValue | string): boolean; isNegative(): boolean; isZero(): boolean; plus(value: DecimalValue | string): DecimalValue; times(value: DecimalValue | string): DecimalValue; toDecimalPlaces(decimalPlaces: number, rounding?: number): DecimalValue; toFixed(decimalPlaces?: number): string; }
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

/** Resolve an explicit per-asset quantity override without changing existing defaults. */
export function getPaperAutopilotQuantity(assetClass: ResearchWatchlistCandidate["assetClass"], environment: NodeJS.ProcessEnv = process.env, explicitOverride?: string): string {
  const configured = explicitOverride?.trim() || (assetClass === "crypto" ? environment.PAPER_AUTOPILOT_CRYPTO_QUANTITY : environment.PAPER_AUTOPILOT_STOCK_QUANTITY)?.trim();
  const fallback = environment.PAPER_AUTOPILOT_QUANTITY?.trim() || "1";
  const quantity = configured || fallback;
  let parsed: DecimalValue | undefined;
  try { parsed = new Decimal(quantity); } catch { /* malformed values fail closed below */ }
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(quantity) || !parsed || parsed.isNegative() || parsed.isZero()) throw new Error(`${assetClass === "crypto" ? "PAPER_AUTOPILOT_CRYPTO_QUANTITY" : "PAPER_AUTOPILOT_STOCK_QUANTITY"} must be a positive decimal quantity.`);
  return quantity;
}

export interface PaperAllocationState {
  readonly positions: readonly { readonly symbol: string; readonly marketValue: string }[];
  readonly cash: string;
}

/** Allocate toward 75% gross exposure, respecting directional caps and rounding down. Zero means no allocation. */
export function getPaperAutopilotQuantityForCandidate(candidate: { readonly assetClass: ResearchWatchlistCandidate["assetClass"]; readonly symbol?: string; readonly side?: "long" | "short"; readonly marketSnapshot?: { readonly close?: string } }, equity: string, environment: NodeJS.ProcessEnv = process.env, explicitOverride?: string, allocation?: PaperAllocationState): string {
  const configured = explicitOverride?.trim() || (candidate.assetClass === "crypto" ? environment.PAPER_AUTOPILOT_CRYPTO_QUANTITY : environment.PAPER_AUTOPILOT_STOCK_QUANTITY)?.trim() || environment.PAPER_AUTOPILOT_QUANTITY?.trim();
  if (configured) return getPaperAutopilotQuantity(candidate.assetClass, environment, configured);
  const price = new Decimal(candidate.marketSnapshot?.close ?? "NaN").toDecimalPlaces(candidate.assetClass === "us_equity" ? 2 : 8);
  const accountEquity = new Decimal(equity);
  if (!price.isFinite() || !accountEquity.isFinite() || price.isNegative() || price.isZero() || accountEquity.isNegative() || accountEquity.isZero()) throw new Error("Allocation requires positive finite price and equity.");
  const policy = DEFAULT_PAPER_RISK_POLICY;
  const positions = allocation?.positions ?? [];
  if (positions.some((position) => !new Decimal(position.marketValue).isFinite())) throw new Error("Allocation requires finite position values.");
  // Do not pyramid a held symbol; spread capital across separately qualified candidates.
  if (candidate.symbol && positions.some((position) => position.symbol.replaceAll("/", "").toUpperCase() === candidate.symbol?.replaceAll("/", "").toUpperCase())) return "0";
  if (positions.length >= policy.maxOpenPositions) return "0";
  const gross = positions.reduce((total, position) => total.plus(new Decimal(position.marketValue).abs()), new Decimal("0"));
  const shortGross = positions.filter((position) => new Decimal(position.marketValue).isNegative()).reduce((total, position) => total.plus(new Decimal(position.marketValue).abs()), new Decimal("0"));
  const cap = candidate.side === "short" ? policy.maxShortPositionPercent : candidate.assetClass === "crypto" ? policy.maxCryptoPositionPercent : policy.maxStockPositionPercent;
  const budgets = [accountEquity.times(cap).div("100"), accountEquity.times(policy.targetGrossExposurePercent).div("100").minus(gross), accountEquity.times(policy.maxGrossExposurePercent).div("100").minus(gross)];
  if (candidate.side === "short") budgets.push(accountEquity.times(policy.maxShortGrossExposurePercent).div("100").minus(shortGross));
  if (allocation && candidate.side !== "short") budgets.push(new Decimal(allocation.cash));
  if (budgets.some((budget) => !budget.isFinite())) throw new Error("Allocation requires finite cash and budgets.");
  const budget = budgets.reduce((smallest, value) => value.lessThan(smallest) ? value : smallest);
  if (budget.isNegative() || budget.isZero()) return "0";
  const quantity = budget.div(price).toDecimalPlaces(candidate.assetClass === "crypto" ? 8 : 0, 1);
  // Keep the existing percentage floor; do not force a tiny remainder trade.
  if (quantity.times(price).lessThan(accountEquity.times(policy.minPositionPercent).div("100"))) return "0";
  return quantity.toFixed(candidate.assetClass === "crypto" ? 8 : 0);
}
