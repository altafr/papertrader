import { createServer, type IncomingMessage } from "node:http";

import { createClerkClient } from "@clerk/backend";

import {
  createPaperAccountReader,
  createPaperAssetReader,
  createPaperMarketDataReader,
  type MarketAssetClass,
  type MarketBarTimeframe,
} from "@momentum/alpaca";
import { createAccountStateRepository, createDatabase } from "@momentum/db";
import {
  getClerkRuntimeConfig,
  getPaperOnlyRuntimeConfig,
  getServerPort,
} from "@momentum/config";

import { getApiHealth } from "./app.js";

let readModelRepository: ReturnType<typeof createAccountStateRepository> | undefined;

class InvalidMarketDataRequest extends Error {}

const marketAssetClasses = new Set<MarketAssetClass>(["crypto", "us_equity"]);
const marketBarTimeframes = new Set<MarketBarTimeframe>([
  "1Day",
  "1Hour",
  "1Min",
  "1Month",
  "1Week",
  "5Min",
  "15Min",
]);

function parseMarketDataQuery(request: IncomingMessage, requireTimeframe: boolean) {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const assetClass = url.searchParams.get("asset_class");
  const symbols = (url.searchParams.get("symbols") ?? "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
  if (!assetClass || !marketAssetClasses.has(assetClass as MarketAssetClass)) {
    throw new InvalidMarketDataRequest("asset_class must be us_equity or crypto");
  }
  if (symbols.length < 1 || symbols.length > 10 || symbols.some((symbol) => !/^[A-Z0-9./-]{1,20}$/.test(symbol))) {
    throw new InvalidMarketDataRequest("symbols must contain 1 to 10 valid symbols");
  }
  const timeframe = url.searchParams.get("timeframe") ?? "1Day";
  if (requireTimeframe && !marketBarTimeframes.has(timeframe as MarketBarTimeframe)) {
    throw new InvalidMarketDataRequest("timeframe is not supported");
  }
  const rawLimit = url.searchParams.get("limit") ?? "100";
  const limit = Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) {
    throw new InvalidMarketDataRequest("limit must be an integer from 1 to 1000");
  }
  const start = url.searchParams.get("start") ?? undefined;
  const end = url.searchParams.get("end") ?? undefined;
  for (const value of [start, end]) {
    if (value && Number.isNaN(Date.parse(value))) {
      throw new InvalidMarketDataRequest("start and end must be valid timestamps");
    }
  }
  return {
    assetClass: assetClass as MarketAssetClass,
    limit,
    symbols,
    timeframe: timeframe as MarketBarTimeframe,
    ...(end ? { end } : {}),
    ...(start ? { start } : {}),
  };
}

function toWebRequest(request: IncomingMessage): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined) {
      headers.set(name, Array.isArray(value) ? value.join(", ") : value);
    }
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  return new Request(url, { headers, method: request.method ?? "GET" });
}

async function authenticateOperator(request: IncomingMessage) {
  let config: ReturnType<typeof getClerkRuntimeConfig>;
  try {
    config = getClerkRuntimeConfig();
  } catch {
    return { body: { error: "auth_not_configured" }, status: 503 } as const;
  }

  if (!config) {
    return { body: { error: "auth_not_configured" }, status: 503 } as const;
  }

  const clerk = createClerkClient({
    publishableKey: config.publishableKey,
    secretKey: config.secretKey,
  });
  const state = await clerk.authenticateRequest(toWebRequest(request), {
    acceptsToken: "session_token",
    authorizedParties: config.authorizedParties,
  });

  if (!state.isAuthenticated) {
    return { body: { error: "unauthorized" }, status: 401 } as const;
  }

  const userId = state.toAuth().userId;
  if (userId !== config.operatorUserId) {
    return { body: { error: "forbidden" }, status: 403 } as const;
  }

  return { body: { authenticated: true, userId }, status: 200 } as const;
}

async function readPaperAccount(request: IncomingMessage) {
  const authentication = await authenticateOperator(request);
  if (authentication.status !== 200) {
    return authentication;
  }

  const runtime = getPaperOnlyRuntimeConfig();
  if (!runtime.brokerConnectionEnabled) {
    return { body: { error: "broker_not_configured" }, status: 503 } as const;
  }

  const reader = createPaperAccountReader({
    apiKey: process.env.ALPACA_API_KEY ?? "",
    secretKey: process.env.ALPACA_SECRET_KEY ?? "",
  });
  const account = await reader.readAccountState();
  return { body: { account }, status: 200 } as const;
}

async function readPersistedModel(request: IncomingMessage) {
  const authentication = await authenticateOperator(request);
  if (authentication.status !== 200) {
    return authentication;
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return { body: { error: "db_not_configured" }, status: 503 } as const;
  }

  if (!readModelRepository) {
    const { db } = createDatabase();
    readModelRepository = createAccountStateRepository(db);
  }
  const model = await readModelRepository.getLatestReadModel();
  if (!model) {
    return { body: { error: "read_model_not_available" }, status: 404 } as const;
  }
  return { body: { model }, status: 200 } as const;
}

async function readEligibleAssets(request: IncomingMessage) {
  const authentication = await authenticateOperator(request);
  if (authentication.status !== 200) {
    return authentication;
  }
  const runtime = getPaperOnlyRuntimeConfig();
  if (!runtime.brokerConnectionEnabled) {
    return { body: { error: "broker_not_configured" }, status: 503 } as const;
  }
  const reader = createPaperAssetReader({
    apiKey: process.env.ALPACA_API_KEY ?? "",
    secretKey: process.env.ALPACA_SECRET_KEY ?? "",
  });
  return { body: { assets: await reader.readEligibleAssets() }, status: 200 } as const;
}

async function readHistoricalBars(request: IncomingMessage) {
  const authentication = await authenticateOperator(request);
  if (authentication.status !== 200) return authentication;
  const runtime = getPaperOnlyRuntimeConfig();
  if (!runtime.brokerConnectionEnabled) {
    return { body: { error: "broker_not_configured" }, status: 503 } as const;
  }
  const reader = createPaperMarketDataReader({
    apiKey: process.env.ALPACA_API_KEY ?? "",
    secretKey: process.env.ALPACA_SECRET_KEY ?? "",
  });
  const query = parseMarketDataQuery(request, true);
  return { body: await reader.readHistoricalBars(query), status: 200 } as const;
}

async function readMarketSnapshots(request: IncomingMessage) {
  const authentication = await authenticateOperator(request);
  if (authentication.status !== 200) return authentication;
  const runtime = getPaperOnlyRuntimeConfig();
  if (!runtime.brokerConnectionEnabled) {
    return { body: { error: "broker_not_configured" }, status: 503 } as const;
  }
  const reader = createPaperMarketDataReader({
    apiKey: process.env.ALPACA_API_KEY ?? "",
    secretKey: process.env.ALPACA_SECRET_KEY ?? "",
  });
  const query = parseMarketDataQuery(request, false);
  return { body: { snapshots: await reader.readSnapshots(query) }, status: 200 } as const;
}

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(getApiHealth()));
    return;
  }

  if (request.method === "GET" && request.url === "/v1/session") {
    authenticateOperator(request)
      .then(({ body, status }) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      })
      .catch(() => {
        response.writeHead(401, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "unauthorized" }));
      });
    return;
  }

  if (request.method === "GET" && request.url === "/v1/account") {
    readPaperAccount(request)
      .then(({ body, status }) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      })
      .catch(() => {
        response.writeHead(502, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "broker_unavailable" }));
      });
    return;
  }

  if (request.method === "GET" && request.url === "/v1/read-model") {
    readPersistedModel(request)
      .then(({ body, status }) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      })
      .catch(() => {
        response.writeHead(503, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "database_unavailable" }));
      });
    return;
  }

  if (request.method === "GET" && request.url === "/v1/assets") {
    readEligibleAssets(request)
      .then(({ body, status }) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      })
      .catch(() => {
        response.writeHead(502, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "broker_unavailable" }));
      });
    return;
  }

  if (request.method === "GET" && request.url?.startsWith("/v1/market-data/bars")) {
    readHistoricalBars(request)
      .then(({ body, status }) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      })
      .catch((error: unknown) => {
        const status = error instanceof InvalidMarketDataRequest ? 400 : 502;
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: status === 400 ? "invalid_market_data_request" : "broker_unavailable" }));
      });
    return;
  }

  if (request.method === "GET" && request.url?.startsWith("/v1/market-data/snapshots")) {
    readMarketSnapshots(request)
      .then(({ body, status }) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      })
      .catch((error: unknown) => {
        const status = error instanceof InvalidMarketDataRequest ? 400 : 502;
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: status === 400 ? "invalid_market_data_request" : "broker_unavailable" }));
      });
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

getPaperOnlyRuntimeConfig();
server.listen(getServerPort(), "0.0.0.0");
