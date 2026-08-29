import { createPaperAccountReader, createPaperMarketDataReader, createPaperExitOrderSubmitter, type PaperMarketSnapshot } from "@momentum/alpaca";
import { isGlobalKillSwitchActive } from "@momentum/config";
import { isCompleteExitPlan } from "@momentum/domain";
import { createAccountStateRepository, createDatabase, createPaperOrderRepository, createTelegramAlertRepository } from "@momentum/db";

import { reconcilePaperAccount } from "./reconcile.js";
import { runPaperPositionManagementOnce } from "./position-management-runner.js";
import { createPositionManagementScheduler, type PositionManagementSchedulerStatus } from "./position-management-scheduler.js";
import { createRuntimeAlertNotifier } from "./telegram-events.js";

const POSITION_DETECTED_COOLDOWN_MS = 86_400_000;
const POSITION_MARK_MAX_AGE_MS = 5 * 60_000;

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

export function isTerminalPaperOrderStatus(status: string): boolean {
  return new Set(["filled", "canceled", "cancelled", "expired", "rejected", "failed"]).has(status.trim().toLowerCase());
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

/** Select a positive, timestamped mark only when it is fresh enough for exit decisions. */
export function getFreshPositionMark(snapshot: PaperMarketSnapshot, now = new Date(), maxAgeMs = POSITION_MARK_MAX_AGE_MS): string | undefined {
  const candidates = [
    snapshot.latestTrade ? { price: snapshot.latestTrade.price, timestamp: snapshot.latestTrade.timestamp } : undefined,
    // Exits sell into the bid; preferring ask would overstate realizable proceeds.
    snapshot.latestQuote ? { price: snapshot.latestQuote.bidPrice || snapshot.latestQuote.askPrice, timestamp: snapshot.latestQuote.timestamp } : undefined,
    snapshot.minuteBar ? { price: snapshot.minuteBar.close, timestamp: snapshot.minuteBar.timestamp } : undefined,
  ].filter((candidate): candidate is { price: string; timestamp: string } => Boolean(candidate));
  for (const candidate of candidates) {
    const price = Number(candidate.price);
    const timestamp = Date.parse(candidate.timestamp);
    const age = now.getTime() - timestamp;
    if (Number.isFinite(price) && price > 0 && Number.isFinite(timestamp) && age >= 0 && age <= maxAgeMs) return candidate.price;
  }
  return undefined;
}

/** Return exit intents which already have an open broker lifecycle state. */
export function getActiveExitIntentIds(submissions: ReadonlyArray<{ readonly clientOrderId: string; readonly intentId: string; readonly status: string }>): ReadonlySet<string> {
  const terminal = new Set(["filled", "canceled", "cancelled", "expired", "rejected", "failed"]);
  return new Set(submissions.filter((submission) => /-exit-(?:profit_target|stop_loss|time_stop)$/.test(submission.clientOrderId) && !terminal.has(submission.status.toLowerCase())).map((submission) => submission.intentId));
}

/** Bounded, credential-free record for the always-on position pass. */
export function buildPositionManagementLog(input: { readonly managed: number; readonly positions: number; readonly submitted: number; readonly symbols?: readonly string[] }) {
  const symbols = input.symbols?.filter((symbol) => symbol.trim().length > 0).slice(0, 10);
  return { event: "position_management_pass", managed: input.managed, positions: input.positions, submitted: input.submitted, ...(symbols?.length ? { symbols } : {}) } as const;
}

/** Bounded, credential-free decision record for each managed position. */
export function buildPositionExitDecisionLog(input: { readonly reason?: string; readonly shouldExit: boolean; readonly submitted?: boolean; readonly symbol: string }) {
  return { event: "position_exit_decision", reason: input.reason ?? null, shouldExit: input.shouldExit, submitted: input.submitted ?? false, symbol: input.symbol } as const;
}

/** Bounded Telegram explanation for an exit decision using the stored plan. */
export function buildPositionExitDecisionMessage(input: { readonly currentPrice: string; readonly entryPrice: string; readonly plannedStopPrice: string; readonly plannedTargetPrice?: string; readonly timeStopAt?: string; readonly reason: string; readonly strategyKey: string; readonly strategyVersion: string; readonly symbol: string }): string {
  return `Paper exit decision: ${input.symbol} ${input.reason} at ${input.currentPrice}. Strategy ${input.strategyKey} ${input.strategyVersion}; entry ${input.entryPrice}, stop ${input.plannedStopPrice}${input.plannedTargetPrice ? `, target ${input.plannedTargetPrice}` : ""}${input.timeStopAt ? `, time stop ${input.timeStopAt}` : ""}. Triggered by the stored deterministic exit plan.`.slice(0, 900);
}

/** Keep the aggregate submission alert actionable without duplicating full decision alerts. */
export function buildPaperExitSubmittedMessage(decisions: readonly { readonly symbol: string; readonly reason?: string }[]): string {
  const digest = decisions
    .filter((decision) => decision.symbol.trim().length > 0)
    .slice(0, 10)
    .map((decision) => `${decision.symbol} (${decision.reason ?? "deterministic exit"})`)
    .join(", ");
  return `Deterministic paper exit submitted for ${decisions.length} managed position(s): ${digest || "details unavailable"}. Broker reconciliation will confirm final status.`.slice(0, 900);
}

/** Bounded record for positions that cannot yet be managed by a stored exit plan. */
export function buildUnmanagedPositionLog(symbols: readonly string[]) {
  return { event: "unmanaged_position_detected", level: "warn", symbols: symbols.filter((symbol) => symbol.trim().length > 0).slice(0, 10) } as const;
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
      const terminal = isTerminalPaperOrderStatus(transition.status);
      await notifier.notify({ code: "paper_order_status_changed", dedupeKey: `paper_order_status_changed:${transition.alpacaOrderId}:${transition.status}`, message: `Paper order status changed: ${transition.symbol} ${transition.from} → ${transition.status}.`, severity: terminal && transition.status.toLowerCase() !== "filled" ? "warning" : "info" });
    }
    const rows = await orderRepository.listExitPlans();
    const activeExitIntentIds = getActiveExitIntentIds(await orderRepository.listActiveExitSubmissions());
    const plans = new Map(rows.filter((row) => isCompleteExitPlan(row)).map((row) => [`${row.assetClass}:${row.symbol}`, row]));
    const positions = model?.positions ?? [];
    const managedPositions = positions.filter((position) => plans.has(`${position.assetClass}:${position.symbol}`));
    const unmanagedPositions = positions.filter((position) => !plans.has(`${position.assetClass}:${position.symbol}`));
    if (unmanagedPositions.length > 0) {
      const symbols = unmanagedPositions.map((position) => position.symbol);
      console.log(JSON.stringify(buildUnmanagedPositionLog(symbols)));
      for (const position of unmanagedPositions) {
        await notifier.notify({ code: "unmanaged_position_detected", cooldownKey: `unmanaged_position_detected:${position.assetClass}:${position.symbol}`, cooldownMs: POSITION_DETECTED_COOLDOWN_MS, dedupeKey: `unmanaged_position_detected:${position.assetClass}:${position.symbol}`, message: `Paper position requires review: ${position.symbol} lacks a complete portfolio-aligned exit plan (protective stop plus target or time stop) and was not managed.`, severity: "critical" });
      }
    }
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
      const currentPrice = mark ? getFreshPositionMark(mark) : undefined;
      if (!plan || !currentPrice) return [];
      return [{ assetClass: position.assetClass === "crypto" ? "crypto" as const : "us_equity" as const, currentPrice, entryPrice: plan.entryPrice!, plannedStopPrice: plan.plannedStopPrice!, ...(plan.plannedTargetPrice ? { plannedTargetPrice: plan.plannedTargetPrice } : {}), quantity: position.quantity, strategyKey: plan.strategyKey!, strategyVersion: plan.strategyVersion!, symbol: position.symbol, ...(plan.timeStopAt ? { timeStopAt: plan.timeStopAt.toISOString() } : {}), intentId: plan.intentId }];
    });
    for (const position of managedPositions) {
      const mark = marks.find((item) => item.assetClass === (position.assetClass === "crypto" ? "crypto" : "us_equity") && item.mark.symbol === position.symbol)?.mark;
      if (mark && !getFreshPositionMark(mark)) {
        await notifier.notify({ code: "stale_position_market_data", cooldownKey: `stale_position_market_data:${position.assetClass}:${position.symbol}`, cooldownMs: POSITION_DETECTED_COOLDOWN_MS, dedupeKey: `stale_position_market_data:${position.assetClass}:${position.symbol}`, message: `Position management paused for ${position.symbol}: latest market mark is stale. No automatic exit was submitted.`, severity: "critical" });
      }
    }
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
    const result = await runPaperPositionManagementOnce({ activeExitIntentIds, now: new Date().toISOString(), positions: managed, submitter: exitSubmitter });
    for (const decision of result.decisions) {
      console.log(JSON.stringify(buildPositionExitDecisionLog({ ...decision, submitted: result.submissions.some((submission) => submission.symbol === decision.symbol) })));
      if (!decision.shouldExit || !decision.reason) continue;
      const source = managed.find((position) => position.symbol === decision.symbol);
      const intentId = source?.intentId ?? decision.symbol;
      await notifier.notify({ code: "position_exit_decision", dedupeKey: getPositionExitDecisionDedupeKey(intentId, decision.reason), message: source ? buildPositionExitDecisionMessage({ currentPrice: decision.exitPrice, entryPrice: source.entryPrice, plannedStopPrice: source.plannedStopPrice, ...(source.plannedTargetPrice ? { plannedTargetPrice: source.plannedTargetPrice } : {}), ...(source.timeStopAt ? { timeStopAt: source.timeStopAt } : {}), reason: decision.reason, strategyKey: source.strategyKey, strategyVersion: source.strategyVersion, symbol: decision.symbol }) : `${decision.symbol} exit decision: ${decision.reason} at mark ${decision.exitPrice}. This was triggered by the stored deterministic exit plan.`, severity: decision.reason === "stop_loss" ? "critical" : "info" });
    }
    if (result.submitted > 0) {
      const submittedDecisions = result.decisions.filter((decision) => decision.shouldExit);
      const submittedSymbols = submittedDecisions.map((decision) => decision.symbol).sort().join(",");
      await notifier.notify({ code: "paper_exit_submitted", dedupeKey: `paper_exit_submitted:${submittedSymbols}`, message: buildPaperExitSubmittedMessage(submittedDecisions), severity: "warning" });
    }
    console.log(JSON.stringify(buildPositionManagementLog({ managed: managed.length, positions: positions.length, submitted: result.submitted, symbols: managed.map((position) => position.symbol) })));
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
