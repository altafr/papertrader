import { createPaperAccountReader, createPaperMarketDataReader, createPaperExitOrderSubmitter } from "@momentum/alpaca";
import { isGlobalKillSwitchActive } from "@momentum/config";
import { createAccountStateRepository, createDatabase, createPaperOrderRepository } from "@momentum/db";

import { reconcilePaperAccount } from "./reconcile.js";
import { runPaperPositionManagementOnce } from "./position-management-runner.js";
import { createPositionManagementScheduler, type PositionManagementSchedulerStatus } from "./position-management-scheduler.js";
import { createRuntimeAlertNotifier } from "./telegram-events.js";

const alertedPositionKeys = new Set<string>();

export interface PositionManagementRuntimeHealth {
  readonly enabled: boolean;
  readonly intervalSeconds: number;
  readonly status: PositionManagementSchedulerStatus;
  readonly lastError?: string;
  readonly lastRunAt?: string;
}

function parseBoolean(name: string, value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be exactly true or false.`);
}

export function getPositionManagementIntervalSeconds(environment: NodeJS.ProcessEnv = process.env): number {
  const value = Number(environment.POSITION_MANAGEMENT_INTERVAL_SECONDS ?? "60");
  if (!Number.isSafeInteger(value) || value < 30 || value > 86_400) throw new Error("POSITION_MANAGEMENT_INTERVAL_SECONDS must be an integer from 30 to 86400.");
  return value;
}

export function getPositionManagementSchedulerEnabled(environment: NodeJS.ProcessEnv = process.env): boolean {
  return parseBoolean("POSITION_MANAGEMENT_SCHEDULER_ENABLED", environment.POSITION_MANAGEMENT_SCHEDULER_ENABLED, false);
}

export function getPositionManagementReadiness(environment: NodeJS.ProcessEnv = process.env): { readonly status: "blocked" | "disabled" | "ready"; readonly blockedReasons: readonly string[] } {
  const enabled = getPositionManagementSchedulerEnabled(environment);
  if (!enabled) return { status: "disabled", blockedReasons: [] };
  const paper = (environment.TRADING_MODE ?? "paper") === "paper" && (environment.ALPACA_PAPER_TRADE === undefined || environment.ALPACA_PAPER_TRADE === "true");
  const reasons = [
    ...(paper ? [] : ["paper_runtime_invalid"]),
    ...(environment.OPERATING_MODE === "paper_autopilot" && environment.PAPER_AUTOPILOT_ENABLED === "true" ? [] : ["paper_autopilot_required"]),
    ...(environment.BROKER_CONNECTION_ENABLED === "true" ? [] : ["broker_connection_disabled"]),
    ...(environment.DATABASE_URL?.trim() ? [] : ["database_not_configured"]),
    ...(environment.ALPACA_API_KEY?.trim() && environment.ALPACA_SECRET_KEY?.trim() ? [] : ["paper_credentials_not_configured"]),
    ...(isGlobalKillSwitchActive(environment) ? ["global_kill_switch_active"] : []),
  ];
  return { status: reasons.length === 0 ? "ready" : "blocked", blockedReasons: reasons };
}

/** One complete, paper-only position-management pass. */
export async function runPositionManagementCycle(environment: NodeJS.ProcessEnv = process.env): Promise<{ readonly submitted: number; readonly managed: number }> {
  const readiness = getPositionManagementReadiness(environment);
  if (readiness.status !== "ready") throw new Error(`Position-management scheduler is not ready: ${readiness.status}.`);
  const { db, pool } = createDatabase(environment.DATABASE_URL);
  try {
    const apiKey = environment.ALPACA_API_KEY!;
    const secretKey = environment.ALPACA_SECRET_KEY!;
    await reconcilePaperAccount(createPaperAccountReader({ apiKey, secretKey }), createAccountStateRepository(db));
    const model = await createAccountStateRepository(db).getLatestReadModel();
    const rows = await createPaperOrderRepository(db).listExitPlans();
    const plans = new Map(rows.filter((row) => row.alpacaOrderId && row.entryPrice && row.plannedStopPrice && row.strategyKey && row.strategyVersion).map((row) => [row.symbol, row]));
    const positions = model?.positions ?? [];
    const symbols = positions.map((position) => position.symbol).filter((symbol) => plans.has(symbol));
    if (symbols.length === 0) return { managed: 0, submitted: 0 };
    const notifier = createRuntimeAlertNotifier(environment);
    for (const symbol of symbols) {
      if (alertedPositionKeys.has(symbol)) continue;
      alertedPositionKeys.add(symbol);
      notifier.notify({ code: "position_detected", message: `Managed paper position detected: ${symbol}. Exit plan is active and being monitored.`, severity: "info" });
    }
    const marks = await createPaperMarketDataReader({ apiKey, secretKey }).readSnapshots({ assetClass: "us_equity", symbols });
    const managed = positions.flatMap((position) => {
      const plan = plans.get(position.symbol);
      const mark = marks.find((item) => item.symbol === position.symbol);
      const currentPrice = mark?.latestTrade?.price ?? mark?.dailyBar?.close ?? mark?.latestQuote?.askPrice;
      if (!plan || !currentPrice) return [];
      return [{ assetClass: "us_equity" as const, currentPrice, entryPrice: plan.entryPrice!, plannedStopPrice: plan.plannedStopPrice!, ...(plan.plannedTargetPrice ? { plannedTargetPrice: plan.plannedTargetPrice } : {}), quantity: position.quantity, strategyKey: plan.strategyKey!, strategyVersion: plan.strategyVersion!, symbol: position.symbol, ...(plan.timeStopAt ? { timeStopAt: plan.timeStopAt.toISOString() } : {}), intentId: plan.intentId }];
    });
    const result = await runPaperPositionManagementOnce({ now: new Date().toISOString(), positions: managed, submitter: createPaperExitOrderSubmitter({ apiKey, brokerConnectionEnabled: true, secretKey }) });
    for (const decision of result.decisions) {
      if (!decision.shouldExit || !decision.reason) continue;
      notifier.notify({ code: "position_exit_decision", message: `${decision.symbol} exit decision: ${decision.reason} at mark ${decision.exitPrice}. This was triggered by the stored deterministic exit plan.`, severity: decision.reason === "stop_loss" ? "critical" : "info" });
    }
    if (result.submitted > 0) notifier.notify({ code: "paper_exit_submitted", message: `Deterministic paper exit submitted for ${result.submitted} managed position(s). Broker reconciliation will confirm final status.`, severity: "warning" });
    return { managed: managed.length, submitted: result.submitted };
  } finally {
    await pool.end();
  }
}

export function createPositionManagementSchedulerFromEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  if (!getPositionManagementSchedulerEnabled(environment)) return undefined;
  const readiness = getPositionManagementReadiness(environment);
  if (readiness.status !== "ready") throw new Error(`POSITION_MANAGEMENT_SCHEDULER_ENABLED=true requires position-management readiness: ${readiness.blockedReasons.join(",")}.`);
  const notifier = createRuntimeAlertNotifier(environment);
  const scheduler = createPositionManagementScheduler({ intervalSeconds: getPositionManagementIntervalSeconds(environment), onFailure: () => notifier.notify({ code: "position_management_failed", message: "Position-management pass failed closed; no further action was taken by the scheduler.", severity: "critical" }), run: async () => { await runPositionManagementCycle(environment); } });
  return scheduler;
}
