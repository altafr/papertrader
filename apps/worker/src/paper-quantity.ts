import * as DecimalModule from "decimal.js";

import type { ResearchWatchlistCandidate } from "@momentum/domain";

interface DecimalValue { isNegative(): boolean; isZero(): boolean; }
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
