import { createPaperAccountReader } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createDatabase, createPaperOrderRepository } from "@momentum/db";
import { validateExitPlanValues } from "@momentum/domain";
import { selectLegacyPositionBrokerOrder } from "./exit-plan-adoption.js";

if (process.env.EXIT_PLAN_ADOPT !== "true") throw new Error("EXIT_PLAN_ADOPT must be exactly true.");
const runtime = getPaperOnlyRuntimeConfig();
if (!runtime.brokerConnectionEnabled) throw new Error("EXIT_PLAN_ADOPT requires broker connectivity.");
const required = (name: string): string => { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required.`); return value; };
const bounded = (name: string): string => { const value = required(name); if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value)) throw new Error(`${name} must be a bounded non-secret reference.`); return value; };
const assetClass = required("EXIT_PLAN_ASSET_CLASS");
if (assetClass !== "crypto" && assetClass !== "us_equity") throw new Error("EXIT_PLAN_ASSET_CLASS must be crypto or us_equity.");
const symbol = required("EXIT_PLAN_SYMBOL");
const alpacaOrderId = bounded("EXIT_PLAN_ALPACA_ORDER_ID");
const entryPrice = required("EXIT_PLAN_ENTRY_PRICE");
const plannedStopPrice = required("EXIT_PLAN_STOP_PRICE");
const plannedTargetPrice = process.env.EXIT_PLAN_TARGET_PRICE?.trim();
const timeStopAt = process.env.EXIT_PLAN_TIME_STOP_AT?.trim();
if (!plannedTargetPrice && !timeStopAt) throw new Error("EXIT_PLAN_TARGET_PRICE or EXIT_PLAN_TIME_STOP_AT is required.");
if (timeStopAt && !Number.isFinite(Date.parse(timeStopAt))) throw new Error("EXIT_PLAN_TIME_STOP_AT must be a valid timestamp.");
const strategyKey = bounded("EXIT_PLAN_STRATEGY_KEY");
const strategyVersion = bounded("EXIT_PLAN_STRATEGY_VERSION");
const reference = bounded("EXIT_PLAN_REFERENCE");
validateExitPlanValues({ entryPrice, plannedStopPrice, ...(plannedTargetPrice ? { plannedTargetPrice } : {}), ...(timeStopAt ? { timeStopAt } : {}) });

const state = await createPaperAccountReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" }).readAccountState();
const selected = selectLegacyPositionBrokerOrder(state, { alpacaOrderId, assetClass, symbol });
const intentId = `legacy-adoption:${assetClass}:${selected.position.symbol}`;
const clientOrderId = `legacy-adoption-${assetClass}-${selected.position.symbol.replaceAll("/", "")}`;
const { db, pool } = createDatabase();
try {
  const repository = createPaperOrderRepository(db);
  const existing = (await repository.listRecent(500)).find((row) => row.assetClass === assetClass && row.symbol === selected.position.symbol || row.alpacaOrderId === alpacaOrderId);
  if (existing) throw new Error("A persisted submission already exists for this position or Alpaca order.");
  await repository.recordSubmission({ approvalId: reference, alpacaOrderId, assetClass, clientOrderId, entryPrice, exitPlanReference: reference, filledQuantity: selected.order.filledQuantity!, intentId, quantity: selected.position.quantity, plannedStopPrice, ...(plannedTargetPrice ? { plannedTargetPrice } : {}), status: "filled", ...(selected.order.submittedAt ? { submittedAt: new Date(selected.order.submittedAt) } : {}), symbol: selected.position.symbol, strategyKey, strategyVersion, ...(timeStopAt ? { timeStopAt: new Date(timeStopAt) } : {}) });
  console.log(JSON.stringify({ alpacaOrderId, reference, status: "legacy_position_adopted", symbol: selected.position.symbol }));
} finally { await pool.end(); }
