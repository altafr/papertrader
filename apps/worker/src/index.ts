import { createServer } from "node:http";

import { createPaperMarketDataReader } from "@momentum/alpaca";
import { getPaperAutopilotConfig, getPaperOnlyRuntimeConfig, getServerPort } from "@momentum/config";
import { createDatabase, createShadowObservationRepository } from "@momentum/db";

import { getWorkerHealth } from "./app.js";
import { startPaperMarketStream } from "./market-stream-runner.js";
import { getShadowEvaluationConfig } from "./shadow-evaluation.js";
import { createAlpacaShadowBarSource, createShadowEvaluationScheduler, runShadowEvaluationOnce } from "./shadow-evaluation-service.js";

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
const autopilotConfiguration = getPaperAutopilotConfig();
if (autopilotConfiguration.enabled && !process.env.DATABASE_URL?.trim()) throw new Error("PAPER_AUTOPILOT_ENABLED=true requires DATABASE_URL.");
const shadowConfiguration = getShadowEvaluationConfig();
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
server.listen(getServerPort(), "0.0.0.0");
