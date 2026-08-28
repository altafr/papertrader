import { PgBoss } from "pg-boss";

import { createPaperAccountReader, createPaperMarketDataReader, createPaperOrderSubmitter } from "@momentum/alpaca";
import { createAccountStateRepository, createAgentRunRepository, createDatabase, createPaperOrderRepository, createTelegramAlertRepository, type PersistedAgentRun } from "@momentum/db";
import type { AgentRunRequest } from "@momentum/domain";

import { createResearchPreparationQueueHandler } from "./research-preparation.js";
import { createAlpacaResearchInputSource } from "./research-market-source.js";
import { createResearchScheduler, getResearchScheduleReadiness, getResearchScheduleConfig } from "./research-scheduler.js";
import { createRuntimeAlertNotifier } from "./telegram-events.js";
import { runPaperAutopilotRiskCycle } from "./paper-autopilot-cycle.js";
import { executePaperAutopilotOrder } from "./paper-execution.js";
import { reconcilePaperAccount } from "./reconcile.js";

export function buildPaperRiskCycleFailureAlert(input: { readonly agentType: string; readonly runId: string }) {
  return { code: "paper_risk_cycle_failed", dedupeKey: `paper_risk_cycle_failed:${input.runId}`, message: `Paper risk cycle failed closed after ${input.agentType} research run ${input.runId}; no additional order decision was authorized.`, severity: "critical" as const };
}

/** Structured, credential-free log record for hosted cycle observability. */
export function buildResearchCycleLog(result: { readonly agentType: string; readonly runId: string; readonly status: string; readonly candidates?: readonly { readonly symbol: string }[] }) {
  return { agentType: result.agentType, candidateCount: result.candidates?.length ?? 0, event: "research_cycle_result", runId: result.runId, status: result.status, symbols: (result.candidates ?? []).map((candidate) => candidate.symbol).slice(0, 10) } as const;
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
      onResult: async (result) => {
        console.log(JSON.stringify(buildResearchCycleLog(result)));
        if (result.status !== "succeeded" || !result.candidates?.length) return;
        const notifier = createRuntimeAlertNotifier(environment, alertRepository);
        try {
          await reconcilePaperAccount(createPaperAccountReader({ apiKey, secretKey }), createAccountStateRepository(db));
          const orderRepository = createPaperOrderRepository(db);
          const executeApproved = orderSubmissionFlag === "true" ? async (order: Parameters<typeof executePaperAutopilotOrder>[0]["order"]) => {
            await executePaperAutopilotOrder({ autopilot: { enabled: true, mode: "paper_autopilot" }, order, notify: notifier.notify, persistence: orderRepository, submitter: createPaperOrderSubmitter({ apiKey, brokerConnectionEnabled: true, secretKey }) });
          } : undefined;
          const riskResults = await runPaperAutopilotRiskCycle({ approvalReference: result.runId, candidates: result.candidates, db, environment, quantity: environment.PAPER_AUTOPILOT_QUANTITY?.trim() || "1", ...(executeApproved ? { executeApproved } : {}), notify: notifier.notify });
          console.log(JSON.stringify({ event: "paper_risk_cycle_result", researchRunId: result.runId, decisions: riskResults.map((decision) => ({ approvalStatus: decision.approvalStatus, executionStatus: decision.executionStatus, intentId: decision.intentId, symbol: decision.symbol })) }));
        } catch {
          await notifier.notify(buildPaperRiskCycleFailureAlert(result));
          throw new Error("paper_risk_cycle_failed");
        }
      },
    } : {}),
  });
  return createResearchScheduler({
    clientFactory: () => new PgBoss(databaseUrl),
    config,
    environment,
    runPreparation: async (job) => { await handler(job); },
  });
}
