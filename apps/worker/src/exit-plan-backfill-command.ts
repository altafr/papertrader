import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { createDatabase, createPaperOrderRepository } from "@momentum/db";
import { validateExitPlanValues } from "@momentum/domain";

if (process.env.EXIT_PLAN_BACKFILL !== "true") throw new Error("EXIT_PLAN_BACKFILL must be exactly true.");
getPaperOnlyRuntimeConfig();
const required = (name: string) => { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required.`); return value; };
const bounded = (name: string) => { const value = required(name); if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value)) throw new Error(`${name} must be a bounded non-secret reference.`); return value; };
const intentId = bounded("EXIT_PLAN_INTENT_ID");
const reference = bounded("EXIT_PLAN_REFERENCE");
const entryPrice = required("EXIT_PLAN_ENTRY_PRICE");
const plannedStopPrice = required("EXIT_PLAN_STOP_PRICE");
const plannedTargetPrice = process.env.EXIT_PLAN_TARGET_PRICE?.trim();
const strategyKey = bounded("EXIT_PLAN_STRATEGY_KEY");
const strategyVersion = bounded("EXIT_PLAN_STRATEGY_VERSION");
const timeStopAt = process.env.EXIT_PLAN_TIME_STOP_AT?.trim();
if (timeStopAt && !Number.isFinite(Date.parse(timeStopAt))) throw new Error("EXIT_PLAN_TIME_STOP_AT must be a valid timestamp.");
validateExitPlanValues({ entryPrice, plannedStopPrice, ...(plannedTargetPrice ? { plannedTargetPrice } : {}), ...(timeStopAt ? { timeStopAt } : {}) });
const { db, pool } = createDatabase();
try {
  await createPaperOrderRepository(db).backfillExitPlan({ intentId, entryPrice, plannedStopPrice, ...(plannedTargetPrice ? { plannedTargetPrice } : {}), strategyKey, strategyVersion, ...(timeStopAt ? { timeStopAt: new Date(timeStopAt) } : {}), exitPlanReference: reference });
  console.log(JSON.stringify({ intentId, reference, status: "exit_plan_backfilled" }));
} finally { await pool.end(); }
