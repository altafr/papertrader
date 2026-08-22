import { createServer, type IncomingMessage } from "node:http";

import { createClerkClient } from "@clerk/backend";

import { createPaperAccountReader } from "@momentum/alpaca";
import { createAccountStateRepository, createDatabase } from "@momentum/db";
import {
  getClerkRuntimeConfig,
  getPaperOnlyRuntimeConfig,
  getServerPort,
} from "@momentum/config";

import { getApiHealth } from "./app.js";

let readModelRepository: ReturnType<typeof createAccountStateRepository> | undefined;

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

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

getPaperOnlyRuntimeConfig();
server.listen(getServerPort(), "0.0.0.0");
