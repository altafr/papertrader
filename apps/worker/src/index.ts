import { createServer } from "node:http";

import { createPaperAccountReader, createPaperMarketDataReader } from "@momentum/alpaca";
import { getPaperAutopilotConfig, getPaperOperatingMode, getPaperOnlyRuntimeConfig, getServerPort, isGlobalKillSwitchActive } from "@momentum/config";
import { createAccountStateRepository, createDatabase, createShadowObservationRepository } from "@momentum/db";

import { getWorkerHealth } from "./app.js";
import { startPaperMarketStream } from "./market-stream-runner.js";
import { getShadowEvaluationConfig } from "./shadow-evaluation.js";
import { createAlpacaShadowBarSource, createShadowEvaluationScheduler, runShadowEvaluationOnce } from "./shadow-evaluation-service.js";
import { createDurableScheduler, getDurableSchedulerConfig } from "./durable-scheduler.js";
import { reconcilePaperAccount } from "./reconcile.js";
import { getResearchScheduleReadiness } from "./research-scheduler.js";
import { createResearchSchedulerFromEnvironment } from "./research-scheduler-runtime.js";

const streamEnabled = process.env.MARKET_STREAM_ENABLED;
if (streamEnabled !== undefined && streamEnabled !== "true" && streamEnabled !== "false") {
  throw new Error("MARKET_STREAM_ENABLED must be exactly true or false.");
}

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(getWorkerHealth()));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

getPaperOnlyRuntimeConfig();
getPaperOperatingMode();
if (getResearchScheduleReadiness().status === "blocked" && process.env.RESEARCH_SCHEDULER_ENABLED === "true") {
  throw new Error("RESEARCH_SCHEDULER_ENABLED=true requires paper database, broker, credentials, and handler gates.");
}
const researchScheduler = createResearchSchedulerFromEnvironment();
if (researchScheduler) void researchScheduler.start().catch(() => { /* health endpoint reports degraded state */ });
const autopilotConfiguration = getPaperAutopilotConfig();
if (autopilotConfiguration.enabled && !process.env.DATABASE_URL?.trim()) throw new Error("PAPER_AUTOPILOT_ENABLED=true requires DATABASE_URL.");
if (autopilotConfiguration.enabled && isGlobalKillSwitchActive()) throw new Error("PAPER_AUTOPILOT_ENABLED=true is blocked by GLOBAL_KILL_SWITCH_ACTIVE=true.");
const shadowConfiguration = getShadowEvaluationConfig();
const durableConfiguration = getDurableSchedulerConfig();
if (shadowConfiguration.enabled) {
  if (process.env.BROKER_CONNECTION_ENABLED !== "true") throw new Error("SHADOW_EVALUATION_ENABLED=true requires BROKER_CONNECTION_ENABLED=true.");
  if (!process.env.DATABASE_URL?.trim()) throw new Error("SHADOW_EVALUATION_ENABLED=true requires DATABASE_URL.");
  const { db } = createDatabase();
  const shadowRepository = createShadowObservationRepository(db);
  const shadowReader = createPaperMarketDataReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" });
  const shadowScheduler = createShadowEvaluationScheduler({ intervalSeconds: shadowConfiguration.intervalSeconds, run: () => runShadowEvaluationOnce({ barSource: createAlpacaShadowBarSource(shadowReader), repository: shadowRepository }).then(() => undefined) });
  shadowScheduler.start();
}
if (streamEnabled === "true") {
  if (process.env.BROKER_CONNECTION_ENABLED !== "true") {
    throw new Error("MARKET_STREAM_ENABLED=true requires BROKER_CONNECTION_ENABLED=true.");
  }
  startPaperMarketStream();
}
if (durableConfiguration.enabled) {
  if (!process.env.DATABASE_URL?.trim()) throw new Error("DURABLE_SCHEDULER_ENABLED=true requires DATABASE_URL.");
  if (process.env.DAILY_PREPARATION_HANDLER_ENABLED !== "true") throw new Error("DURABLE_SCHEDULER_ENABLED=true requires the verified daily preparation handler.");
  if (process.env.BROKER_CONNECTION_ENABLED !== "true") throw new Error("DURABLE_SCHEDULER_ENABLED=true requires BROKER_CONNECTION_ENABLED=true for reconciliation.");
  const durableScheduler = createDurableScheduler({
    config: durableConfiguration,
    connectionString: process.env.DATABASE_URL,
    runDailyPreparation: async () => {
      const { db, pool } = createDatabase(process.env.DATABASE_URL);
      try {
        await reconcilePaperAccount(
          createPaperAccountReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" }),
          createAccountStateRepository(db),
        );
      } finally {
        await pool.end();
      }
    },
  });
  void durableScheduler.start().catch(() => { /* the health endpoint reports the degraded state */ });
}
server.listen(getServerPort(), "0.0.0.0");
