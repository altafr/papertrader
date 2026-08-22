import { createServer } from "node:http";

import { getPaperOnlyRuntimeConfig, getServerPort } from "@momentum/config";

import { getWorkerHealth } from "./app.js";
import { startPaperMarketStream } from "./market-stream-runner.js";

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
if (streamEnabled === "true") {
  if (process.env.BROKER_CONNECTION_ENABLED !== "true") {
    throw new Error("MARKET_STREAM_ENABLED=true requires BROKER_CONNECTION_ENABLED=true.");
  }
  startPaperMarketStream();
}
server.listen(getServerPort(), "0.0.0.0");
