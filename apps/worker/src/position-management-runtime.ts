import { createPaperAccountReader, createPaperMarketDataReader, createPaperExitOrderSubmitter } from "@momentum/alpaca";
import { isGlobalKillSwitchActive } from "@momentum/config";
import { createAccountStateRepository, createDatabase, createPaperOrderRepository, createTelegramAlertRepository } from "@momentum/db";

import { reconcilePaperAccount } from "./reconcile.js";
import { runPaperPositionManagementOnce } from "./position-management-runner.js";
import { createPositionManagementScheduler, type PositionManagementSchedulerStatus } from "./position-management-scheduler.js";
import { createRuntimeAlertNotifier } from "./telegram-events.js";

const POSITION_DETECTED_COOLDOWN_MS = 86_400_000;

export interface PositionManagementRuntimeHealth {
  readonly enabled: boolean;
  readonly intervalSeconds: number;
  readonly status: PositionManagementSchedulerStatus;
  readonly lastError?: string;
  readonly lastRunAt?: string;
}

export function getPaperOrderStatusTransitions(before: ReadonlyArray<{ readonly alpacaOrderId: string; readonly status: string; readonly symbol: string }>, after: ReadonlyArray<{ readonly alpacaOrderId: string; readonly status: string; readonly symbol: string }>) {
  const previous = new Map(before.map((order) => [order.alpacaOrderId, order.status]));
  return after.filter((order) => previous.has(order.alpacaOrderId) && previous.get(order.alpacaOrderId) !== order.status).map((order) => ({ alpacaOrderId: order.alpacaOrderId, from: previous.get(order.alpacaOrderId)!, status: order.status, symbol: order.symbol }));
}

export function groupPositionSymbolsByAssetClass(positions: ReadonlyArray<{ readonly assetClass: string; readonly symbol: string }>): readonly { readonly assetClass: "crypto" | "us_equity"; readonly symbols: readonly string[] }[] {
  const groups = new Map<"crypto" | "us_equity", string[]>();
  for (const position of positions) {
    const assetClass = position.assetClass === "crypto" ? "crypto" : "us_equity";
    const symbols = groups.get(assetClass) ?? [];
    if (!symbols.includes(position.symbol)) symbols.push(position.symbol);
    groups.set(assetClass, symbols);
  }
  return [...groups.entries()].map(([assetClass, symbols]) => ({ assetClass, symbols }));
}

export function getPositionDetectedDedupeKey(assetClass: string, symbol: string, intentId = "unknown"): string {
  return `position_detected:${assetClass === "crypto" ? "crypto" : "us_equity"}:${symbol}:${intentId}`;
}

export function getPositionExitDecisionDedupeKey(intentId: string, reason: string): string {
  return `position_exit_decision:${intentId}:${reason}`;
}

export function getPositionExitIntentId(clientOrderId: string): string {
  return clientOrderId.replace(/-exit-(?:profit_target|stop_loss|time_stop)$/, ":exit");
}

/** Bounded, credential-free record for the always-on position pass. */
export function buildPositionManagementLog(input: { readonly managed: number; readonly positions: number; readonly submitted: number }) {
  return { event: "position_management_pass", managed: input.managed, positions: input.positions, submitted: input.submitted } as const;
}

/** Bounded, credential-free decision record for each managed position. */
export function buildPositionExitDecisionLog(input: { readonly reason?: string; readonly shouldExit: boolean; readonly symbol: string }) {
  return { event: "position_exit_decision", reason: input.reason ?? null, shouldExit: input.shouldExit, symbol: input.symbol } as const;
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
    const accountRepository = createAccountStateRepository(db);
    const beforeModel = await accountRepository.getLatestReadModel();
    await reconcilePaperAccount(createPaperAccountReader({ apiKey, secretKey }), accountRepository);
    const model = await accountRepository.getLatestReadModel();
    const notifier = createRuntimeAlertNotifier(environment, createTelegramAlertRepository(db));
    const orderRepository = createPaperOrderRepository(db);
    for (const transition of getPaperOrderStatusTransitions(beforeModel?.orders ?? [], model?.orders ?? [])) {
      const terminal = ["filled", "canceled", "expired", "rejected"].includes(transition.status.toLowerCase());
      await notifier.notify({ code: "paper_order_status_changed", dedupeKey: `paper_order_status_changed:${transition.alpacaOrderId}:${transition.status}`, message: `Paper order status changed: ${transition.symbol} ${transition.from} → ${transition.status}.`, severity: terminal && transition.status.toLowerCase() !== "filled" ? "warning" : "info" });
    }
    const rows = await orderRepository.listExitPlans();
    const plans = new Map(rows.filter((row) => row.alpacaOrderId && row.entryPrice && row.plannedStopPrice && row.strategyKey && row.strategyVersion).map((row) => [`${row.assetClass}:${row.symbol}`, row]));
    const positions = model?.positions ?? [];
    const managedPositions = positions.filter((position) => plans.has(`${position.assetClass}:${position.symbol}`));
    if (managedPositions.length === 0) {
      console.log(JSON.stringify(buildPositionManagementLog({ managed: 0, positions: positions.length, submitted: 0 })));
      return { managed: 0, submitted: 0 };
    }
    for (const position of managedPositions) {
      const plan = plans.get(`${position.assetClass}:${position.symbol}`);
      const intentId = plan?.intentId ?? "unknown";
      await notifier.notify({ code: "position_detected", cooldownKey: `position_detected:${position.assetClass}:${position.symbol}`, cooldownMs: POSITION_DETECTED_COOLDOWN_MS, dedupeKey: getPositionDetectedDedupeKey(position.assetClass, position.symbol, intentId), message: `Managed paper position detected: ${position.symbol}. Exit plan is active and being monitored.`, severity: "info" });
    }
    const reader = createPaperMarketDataReader({ apiKey, secretKey });
    const markGroups = await Promise.all(groupPositionSymbolsByAssetClass(managedPositions).map(async (group) => ({ assetClass: group.assetClass, marks: await reader.readSnapshots(group) })));
    const marks = markGroups.flatMap((group) => group.marks.map((mark) => ({ assetClass: group.assetClass, mark })));
    const managed = managedPositions.flatMap((position) => {
      const plan = plans.get(`${position.assetClass}:${position.symbol}`);
      const mark = marks.find((item) => item.assetClass === (position.assetClass === "crypto" ? "crypto" : "us_equity") && item.mark.symbol === position.symbol)?.mark;
      const currentPrice = mark?.latestTrade?.price ?? mark?.dailyBar?.close ?? mark?.latestQuote?.askPrice;
      if (!plan || !currentPrice) return [];
      return [{ assetClass: position.assetClass === "crypto" ? "crypto" as const : "us_equity" as const, currentPrice, entryPrice: plan.entryPrice!, plannedStopPrice: plan.plannedStopPrice!, ...(plan.plannedTargetPrice ? { plannedTargetPrice: plan.plannedTargetPrice } : {}), quantity: position.quantity, strategyKey: plan.strategyKey!, strategyVersion: plan.strategyVersion!, symbol: position.symbol, ...(plan.timeStopAt ? { timeStopAt: plan.timeStopAt.toISOString() } : {}), intentId: plan.intentId }];
    });
    const brokerExitSubmitter = createPaperExitOrderSubmitter({ apiKey, brokerConnectionEnabled: true, secretKey });
    const exitSubmitter = {
      submitExit: async (request: Parameters<typeof brokerExitSubmitter.submitExit>[0]) => {
        const intentId = getPositionExitIntentId(request.clientOrderId);
        const sourceIntentId = intentId.replace(/:exit$/, "");
        const source = managed.find((position) => position.intentId === sourceIntentId);
        await orderRepository.recordSubmission({ approvalId: `${intentId}:approval`, assetClass: request.assetClass, clientOrderId: request.clientOrderId, intentId, quantity: request.quantity, status: "pending", symbol: request.decision.symbol, ...(source?.strategyKey ? { strategyKey: source.strategyKey } : {}), ...(source?.strategyVersion ? { strategyVersion: source.strategyVersion } : {}) });
        try {
          const brokerOrder = await brokerExitSubmitter.submitExit(request);
          await orderRepository.reconcile({ alpacaOrderId: brokerOrder.alpacaOrderId, ...(brokerOrder.filledQuantity ? { filledQuantity: brokerOrder.filledQuantity } : {}), intentId, status: brokerOrder.status, ...(brokerOrder.submittedAt ? { submittedAt: new Date(brokerOrder.submittedAt) } : {}), ...(brokerOrder.updatedAt ? { updatedAt: new Date(brokerOrder.updatedAt) } : {}) });
          return brokerOrder;
        } catch (error) {
          await orderRepository.markFailed(intentId);
          throw error;
        }
      },
    };
    const result = await runPaperPositionManagementOnce({ now: new Date().toISOString(), positions: managed, submitter: exitSubmitter });
    for (const decision of result.decisions) {
      console.log(JSON.stringify(buildPositionExitDecisionLog(decision)));
      if (!decision.shouldExit || !decision.reason) continue;
      const intentId = managed.find((position) => position.symbol === decision.symbol)?.intentId ?? decision.symbol;
      await notifier.notify({ code: "position_exit_decision", dedupeKey: getPositionExitDecisionDedupeKey(intentId, decision.reason), message: `${decision.symbol} exit decision: ${decision.reason} at mark ${decision.exitPrice}. This was triggered by the stored deterministic exit plan.`, severity: decision.reason === "stop_loss" ? "critical" : "info" });
    }
    if (result.submitted > 0) {
      const submittedSymbols = result.decisions.filter((decision) => decision.shouldExit).map((decision) => decision.symbol).sort().join(",");
      await notifier.notify({ code: "paper_exit_submitted", dedupeKey: `paper_exit_submitted:${submittedSymbols}`, message: `Deterministic paper exit submitted for ${result.submitted} managed position(s). Broker reconciliation will confirm final status.`, severity: "warning" });
    }
    console.log(JSON.stringify(buildPositionManagementLog({ managed: managed.length, positions: positions.length, submitted: result.submitted })));
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
