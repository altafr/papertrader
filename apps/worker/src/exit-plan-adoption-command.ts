import { createPaperAccountReader } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createDatabase, createPaperOrderRepository } from "@momentum/db";
import { validateExitPlanValues } from "@momentum/domain";
import { getWeightedAverageFilledPrice, matchesWeightedBrokerEntryPrice, selectLegacyPositionBrokerOrders } from "./exit-plan-adoption.js";

if (process.env.EXIT_PLAN_ADOPT !== "true") throw new Error("EXIT_PLAN_ADOPT must be exactly true.");
const runtime = getPaperOnlyRuntimeConfig();
if (!runtime.brokerConnectionEnabled) throw new Error("EXIT_PLAN_ADOPT requires broker connectivity.");
const required = (name: string): string => { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required.`); return value; };
const bounded = (name: string): string => { const value = required(name); if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value)) throw new Error(`${name} must be a bounded non-secret reference.`); return value; };
const assetClass = required("EXIT_PLAN_ASSET_CLASS");
if (assetClass !== "crypto" && assetClass !== "us_equity") throw new Error("EXIT_PLAN_ASSET_CLASS must be crypto or us_equity.");
const symbol = required("EXIT_PLAN_SYMBOL");
const orderIdInput = process.env.EXIT_PLAN_ALPACA_ORDER_IDS?.trim() || required("EXIT_PLAN_ALPACA_ORDER_ID");
const alpacaOrderIds = orderIdInput.split(",").map((value) => value.trim()).filter(Boolean).map((value) => { if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value)) throw new Error("EXIT_PLAN_ALPACA_ORDER_IDS must contain bounded order IDs."); return value; });
if (alpacaOrderIds.length === 0 || alpacaOrderIds.length > 100 || new Set(alpacaOrderIds).size !== alpacaOrderIds.length) throw new Error("EXIT_PLAN_ALPACA_ORDER_IDS must contain 1 to 100 unique order IDs.");
const plannedStopPrice = required("EXIT_PLAN_STOP_PRICE");
const plannedTargetPrice = process.env.EXIT_PLAN_TARGET_PRICE?.trim();
const timeStopAt = process.env.EXIT_PLAN_TIME_STOP_AT?.trim();
if (!plannedTargetPrice && !timeStopAt) throw new Error("EXIT_PLAN_TARGET_PRICE or EXIT_PLAN_TIME_STOP_AT is required.");
if (timeStopAt && !Number.isFinite(Date.parse(timeStopAt))) throw new Error("EXIT_PLAN_TIME_STOP_AT must be a valid timestamp.");
const strategyKey = bounded("EXIT_PLAN_STRATEGY_KEY");
const strategyVersion = bounded("EXIT_PLAN_STRATEGY_VERSION");
const reference = bounded("EXIT_PLAN_REFERENCE");
const state = await createPaperAccountReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" }).readAccountState();
const selected = selectLegacyPositionBrokerOrders(state, { alpacaOrderIds, assetClass, symbol });
const suppliedEntryPrice = process.env.EXIT_PLAN_ENTRY_PRICE?.trim();
const brokerEntryPrice = getWeightedAverageFilledPrice(selected.orders);
if (suppliedEntryPrice && brokerEntryPrice && !matchesWeightedBrokerEntryPrice(suppliedEntryPrice, selected.orders)) throw new Error("EXIT_PLAN_ENTRY_PRICE must match the selected broker fills' weighted average price.");
const entryPrice = suppliedEntryPrice || brokerEntryPrice;
if (!entryPrice) throw new Error("EXIT_PLAN_ENTRY_PRICE is required when selected broker fills have no complete average fill price.");
// The derived default is broker-linked; an explicit override remains operator-reviewed and is validated below.
validateExitPlanValues({ entryPrice, plannedStopPrice, ...(plannedTargetPrice ? { plannedTargetPrice } : {}), ...(timeStopAt ? { timeStopAt } : {}) });
if (process.env.EXIT_PLAN_ADOPT_DRY_RUN === "true") {
  console.log(JSON.stringify({ alpacaOrderIds, entryPrice, plannedStopPrice, ...(plannedTargetPrice ? { plannedTargetPrice } : {}), ...(timeStopAt ? { timeStopAt } : {}), positionQuantity: selected.position.quantity, reference, status: "legacy_position_adoption_preflight_valid", strategyKey, strategyVersion, symbol: selected.position.symbol }));
  process.exit(0);
}
const { db, pool } = createDatabase();
try {
  const repository = createPaperOrderRepository(db);
  const recent = await repository.listRecent(500);
  if (selected.orders.some((order) => recent.some((row) => row.assetClass === assetClass && row.symbol === selected.position.symbol || row.alpacaOrderId === order.alpacaOrderId))) throw new Error("A persisted submission already exists for this position or Alpaca order.");
  await repository.recordSubmissionsAtomically(selected.orders.map((order) => ({ approvalId: reference, alpacaOrderId: order.alpacaOrderId, assetClass, clientOrderId: `legacy-adoption-${assetClass}-${selected.position.symbol.replaceAll("/", "")}-${order.alpacaOrderId.slice(0, 8)}`, entryPrice, exitPlanReference: reference, filledQuantity: order.filledQuantity!, intentId: `legacy-adoption:${assetClass}:${selected.position.symbol}:${order.alpacaOrderId}`, quantity: order.filledQuantity!, plannedStopPrice, ...(plannedTargetPrice ? { plannedTargetPrice } : {}), status: "filled", ...(order.submittedAt ? { submittedAt: new Date(order.submittedAt) } : {}), symbol: selected.position.symbol, strategyKey, strategyVersion, ...(timeStopAt ? { timeStopAt: new Date(timeStopAt) } : {}) })));
  console.log(JSON.stringify({ alpacaOrderIds, reference, status: "legacy_position_adopted", symbol: selected.position.symbol }));
} finally { await pool.end(); }
