import { PgBoss } from "pg-boss";

import { createPaperAccountReader, createPaperMarketDataReader, createPaperOrderSubmitter } from "@momentum/alpaca";
import { createAccountStateRepository, createAgentRunRepository, createDatabase, createPaperOrderRepository, createTelegramAlertRepository, type PersistedAgentRun } from "@momentum/db";
import { isCompleteExitPlan, type AgentRunRequest, type ResearchWatchlistCandidate } from "@momentum/domain";

import { createResearchPreparationQueueHandler } from "./research-preparation.js";
import { createAlpacaResearchInputSource } from "./research-market-source.js";
import { createResearchScheduler, getResearchScheduleReadiness, getResearchScheduleConfig, getResearchSchedulerErrorMetadata, setResearchRiskCycleHealth } from "./research-scheduler.js";
import { createRuntimeAlertNotifier } from "./telegram-events.js";
import { runPaperAutopilotRiskCycle } from "./paper-autopilot-cycle.js";
import { executePaperAutopilotOrder } from "./paper-execution.js";
import { reconcilePaperAccount } from "./reconcile.js";
import { getPaperAutopilotQuantityForCandidate } from "./paper-quantity.js";
import { countUnmanagedPositions, formatDailyPortfolioSummary } from "./daily-summary.js";
import { getDailyNotificationDedupeKey } from "./notification-dedupe.js";

/** True during the weekday New York 16:00 close hour, including DST. */
export function isUsMarketCloseSummaryWindow(now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: "America/New_York", weekday: "short" }).formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  return ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday ?? "") && hour === 16;
}

/** Use the close-hour summary when continuous research is enabled; otherwise retain the daily fallback. */
export function isMarketCloseSummaryEnabled(environment: NodeJS.ProcessEnv = process.env): boolean {
  const raw = environment.MARKET_CLOSE_SUMMARY_ENABLED;
  if (raw === undefined) return environment.RESEARCH_SCHEDULER_ENABLED === "true";
  if (raw !== "true" && raw !== "false") throw new Error("MARKET_CLOSE_SUMMARY_ENABLED must be exactly true or false.");
  return raw === "true";
}

export function buildPaperRiskCycleFailureAlert(input: { readonly agentType: string; readonly runId: string }) {
  return { code: "paper_risk_cycle_failed", dedupeKey: `paper_risk_cycle_failed:${input.runId}`, message: `Paper risk cycle failed closed after ${input.agentType} research run ${input.runId}; no additional order decision was authorized.`, severity: "critical" as const };
}

export function buildResearchSchedulerStartFailureAlert(occurredAt = new Date().toISOString()) {
  const day = Number.isFinite(Date.parse(occurredAt)) ? new Date(occurredAt).toISOString().slice(0, 10) : "unknown";
  return { code: "research_scheduler_start_failed", dedupeKey: `research_scheduler_start_failed:${day}`, message: "Research scheduler startup retries were exhausted; no new paper decision was authorized.", severity: "critical" as const };
}

export function buildResearchSchedulerStaleAlert(occurredAt = new Date().toISOString()) {
  const day = Number.isFinite(Date.parse(occurredAt)) ? new Date(occurredAt).toISOString().slice(0, 10) : "unknown";
  return { code: "research_scheduler_stale", dedupeKey: `research_scheduler_stale:${day}`, message: "Research scheduler missed its expected tick; no new paper decision was authorized until the next successful cycle.", severity: "critical" as const };
}

/** Structured, credential-free log record for hosted cycle observability. */
export function buildResearchCycleLog(result: { readonly agentType: string; readonly runId: string; readonly status: string; readonly candidates?: readonly { readonly symbol: string }[] }) {
  return { agentType: result.agentType, candidateCount: result.candidates?.length ?? 0, event: "research_cycle_result", runId: result.runId, status: result.status, symbols: (result.candidates ?? []).map((candidate) => candidate.symbol).slice(0, 10) } as const;
}

/** Preserve the first agent's evidence when multiple agents emit the same asset. */
export function dedupeResearchCandidates(candidates: readonly ResearchWatchlistCandidate[]): readonly ResearchWatchlistCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.assetClass}:${candidate.symbol}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildPaperRiskCycleLog(input: {
  readonly researchRunIds: readonly string[];
  readonly decisions: readonly Pick<Awaited<ReturnType<typeof runPaperAutopilotRiskCycle>>[number], "approvalStatus" | "executionStatus" | "intentId" | "reasons" | "symbol">[];
}) {
  return {
    decisions: input.decisions.slice(0, 10).map((decision) => ({ approvalStatus: decision.approvalStatus, executionStatus: decision.executionStatus, intentId: decision.intentId, reasons: decision.reasons.slice(0, 8), symbol: decision.symbol })),
    event: "paper_risk_cycle_result",
    researchRunIds: input.researchRunIds.slice(0, 10),
  } as const;
}

export function createResearchSchedulerFromEnvironment(environment: NodeJS.ProcessEnv = process.env) {
  const config = getResearchScheduleConfig(environment);
  if (!config.enabled) return undefined;
  const readiness = getResearchScheduleReadiness(environment);
  if (readiness.status !== "ready") throw new Error(`RESEARCH_SCHEDULER_ENABLED=true requires research readiness: ${readiness.status}.`);
  const databaseUrl = environment.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("RESEARCH_SCHEDULER_ENABLED=true requires DATABASE_URL.");
  const apiKey = environment.ALPACA_API_KEY ?? "";
  const secretKey = environment.ALPACA_SECRET_KEY ?? "";
  const { db } = createDatabase(databaseUrl);
  const repository = createAgentRunRepository(db);
  const alertRepository = createTelegramAlertRepository(db);
  const orderSubmissionFlag = environment.PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED;
  if (orderSubmissionFlag !== undefined && orderSubmissionFlag !== "true" && orderSubmissionFlag !== "false") throw new Error("PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED must be exactly true or false.");
  const orderSubmissionApprovalReference = environment.PAPER_AUTOPILOT_ORDER_SUBMISSION_APPROVAL_REFERENCE?.trim();
  if (orderSubmissionFlag === "true" && (!orderSubmissionApprovalReference || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(orderSubmissionApprovalReference))) throw new Error("PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED=true requires a bounded PAPER_AUTOPILOT_ORDER_SUBMISSION_APPROVAL_REFERENCE.");
  const persistence = {
    enqueue: (run: AgentRunRequest) => repository.enqueue({
      agentType: run.agentType,
      createdAt: new Date(run.createdAt),
      inputRefs: run.inputRefs,
      ...(run.modelProvider ? { modelProvider: run.modelProvider } : {}),
      promptVersion: run.promptVersion,
      runId: run.runId,
      status: "queued",
      task: run.task,
    } satisfies PersistedAgentRun),
    fail: repository.fail,
    start: repository.start,
    succeed: repository.succeed,
  };
  const handler = createResearchPreparationQueueHandler({
    environment,
    persistence,
    source: createAlpacaResearchInputSource(createPaperMarketDataReader({ apiKey, secretKey })),
    notify: createRuntimeAlertNotifier(environment, alertRepository).notify,
    ...(environment.PAPER_AUTOPILOT_ENABLED === "true" && environment.OPERATING_MODE === "paper_autopilot" ? {
      onResult: (result) => {
        console.log(JSON.stringify(buildResearchCycleLog(result)));
      },
      onBatchResult: async (results) => {
        const candidates = dedupeResearchCandidates(results.flatMap((result) => result.candidates ?? []));
        const notifier = createRuntimeAlertNotifier(environment, alertRepository);
        try {
          const accountRepository = createAccountStateRepository(db);
          const snapshot = await reconcilePaperAccount(createPaperAccountReader({ apiKey, secretKey }), accountRepository);
          const model = await accountRepository.getLatestReadModel(snapshot.accountId);
          const orderRepository = createPaperOrderRepository(db);
          if (model?.snapshot && isMarketCloseSummaryEnabled(environment) && isUsMarketCloseSummaryWindow(model.snapshot.capturedAt)) {
            const plans = (await orderRepository.listExitPlans()).filter((plan) => isCompleteExitPlan(plan));
            await notifier.notify({ code: "daily_portfolio_summary", cooldownKey: "daily_portfolio_summary:market_close", cooldownMs: 86_400_000, dedupeKey: getDailyNotificationDedupeKey("daily_portfolio_summary", "market_close", model.snapshot.capturedAt), message: formatDailyPortfolioSummary({ buyingPower: model.snapshot.buyingPower, cash: model.snapshot.cash, equity: model.snapshot.equity, ...(model.snapshot.lastEquity == null ? {} : { lastEquity: model.snapshot.lastEquity }), orders: model.orders.length, unmanagedPositions: countUnmanagedPositions(model.positions, plans), positions: model.positions }), occurredAt: model.snapshot.capturedAt.toISOString(), severity: "info" });
          }
          if (candidates.length === 0) return;
          const executeApproved = orderSubmissionFlag === "true" ? async (order: Parameters<typeof executePaperAutopilotOrder>[0]["order"]) => {
            await executePaperAutopilotOrder({ autopilot: { enabled: true, mode: "paper_autopilot" }, order, notify: notifier.notify, persistence: orderRepository, submitter: createPaperOrderSubmitter({ apiKey, brokerConnectionEnabled: true, secretKey }) });
          } : undefined;
          const approvalReference = results.find((result) => result.status === "succeeded")?.runId;
          const riskResults = await runPaperAutopilotRiskCycle({ ...(approvalReference ? { approvalReference } : {}), candidates, db, environment, quantityForCandidate: (candidate, equity) => getPaperAutopilotQuantityForCandidate(candidate, equity, environment), ...(executeApproved ? { executeApproved } : {}), notify: notifier.notify });
          setResearchRiskCycleHealth({ approved: riskResults.filter((result) => result.approvalStatus === "approved").length, decisions: riskResults.length, status: "completed" });
          console.log(JSON.stringify(buildPaperRiskCycleLog({ decisions: riskResults, researchRunIds: results.map((result) => result.runId) })));
        } catch {
          setResearchRiskCycleHealth({ approved: 0, decisions: 0, status: "failed" });
          await notifier.notify(buildPaperRiskCycleFailureAlert({ agentType: "research_batch", runId: results.map((result) => result.runId).join(",").slice(0, 120) }));
          throw new Error("paper_risk_cycle_failed");
        }
      },
    } : {}),
  });
  return createResearchScheduler({
    clientFactory: () => new PgBoss(databaseUrl),
    config,
    environment,
    onStale: async (error) => { void error; const occurredAt = new Date().toISOString(); await createRuntimeAlertNotifier(environment, alertRepository).notify({ ...buildResearchSchedulerStaleAlert(occurredAt), occurredAt }); },
    runPreparation: async (job) => {
      try {
        await handler(job);
      } catch (error: unknown) {
        console.error(JSON.stringify({ ...getResearchSchedulerErrorMetadata(error), event: "research_preparation_failed" }));
        throw error;
      }
    },
  });
}
