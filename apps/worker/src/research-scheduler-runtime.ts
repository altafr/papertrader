import { PgBoss } from "pg-boss";

import { createPaperMarketDataReader } from "@momentum/alpaca";
import { createAgentRunRepository, createDatabase, createTelegramAlertRepository, type PersistedAgentRun } from "@momentum/db";
import type { AgentRunRequest } from "@momentum/domain";

import { createResearchPreparationQueueHandler } from "./research-preparation.js";
import { createAlpacaResearchInputSource } from "./research-market-source.js";
import { createResearchScheduler, getResearchScheduleReadiness, getResearchScheduleConfig } from "./research-scheduler.js";
import { createRuntimeAlertNotifier } from "./telegram-events.js";

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
  });
  return createResearchScheduler({
    clientFactory: () => new PgBoss(databaseUrl),
    config,
    environment,
    runPreparation: async (job) => { await handler(job); },
  });
}
