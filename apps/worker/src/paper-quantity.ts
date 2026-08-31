import * as DecimalModule from "decimal.js";

import type { ResearchWatchlistCandidate } from "@momentum/domain";

interface DecimalValue { div(value: DecimalValue | string): DecimalValue; isNegative(): boolean; isZero(): boolean; plus(value: DecimalValue | string): DecimalValue; times(value: DecimalValue | string): DecimalValue; toDecimalPlaces(decimalPlaces: number): DecimalValue; toFixed(decimalPlaces?: number): string; }
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

/**
 * Resolve the default quantity so a new trade invests at least the configured
 * two-percent portfolio minimum. Explicit operator overrides remain intact,
 * but the deterministic risk gate still rejects undersized overrides.
 */
export function getPaperAutopilotQuantityForCandidate(candidate: { readonly assetClass: ResearchWatchlistCandidate["assetClass"]; readonly marketSnapshot?: { readonly close?: string } }, equity: string, environment: NodeJS.ProcessEnv = process.env, explicitOverride?: string): string {
  const configured = explicitOverride?.trim() || (candidate.assetClass === "crypto" ? environment.PAPER_AUTOPILOT_CRYPTO_QUANTITY : environment.PAPER_AUTOPILOT_STOCK_QUANTITY)?.trim() || environment.PAPER_AUTOPILOT_QUANTITY?.trim();
  if (configured) return getPaperAutopilotQuantity(candidate.assetClass, environment, configured);
  const close = candidate.marketSnapshot?.close?.trim();
  if (!close) throw new Error("Research candidate must include a positive close for minimum-notional sizing.");
  let target: DecimalValue;
  try {
    const price = new Decimal(close);
    const accountEquity = new Decimal(equity);
    if (price.isNegative() || price.isZero() || accountEquity.isNegative() || accountEquity.isZero()) throw new Error("invalid sizing values");
    const increment = candidate.assetClass === "crypto" ? "0.00000001" : "1";
    target = accountEquity.times("0.02").div(price).toDecimalPlaces(candidate.assetClass === "crypto" ? 8 : 0).plus(increment);
    return target.toFixed(candidate.assetClass === "crypto" ? 8 : 0);
  } catch {
    throw new Error("Unable to derive a positive two-percent portfolio quantity.");
  }
}
