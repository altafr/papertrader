import { createServer, type IncomingMessage } from "node:http";

import { createClerkClient } from "@clerk/backend";
import { ZodError } from "zod";

import {
  createPaperAccountReader,
  createPaperAssetReader,
  createPaperMarketDataReader,
  type MarketAssetClass,
  type MarketBarTimeframe,
} from "@momentum/alpaca";
import { createAccountStateRepository, createAgentRunRepository, createDatabase, createShadowObservationRepository, createStrategyLifecycleRepository } from "@momentum/db";
import {
  getClerkRuntimeConfig,
  getDailyPreparationCron,
  DAILY_PREPARATION_TIMEZONE,
  getPaperOnlyRuntimeConfig,
  getPaperOperatingMode,
  getServerPort,
  isGlobalKillSwitchActive,
} from "@momentum/config";
import { MAX_SINGLE_TRADE_RISK_PERCENT_OF_EQUITY, MAX_SINGLE_TRADE_RISK_USD, PAPER_INITIAL_EQUITY_BASELINE } from "@momentum/domain";
import { getTelegramAlertTestReadiness, getTelegramNotificationReadiness } from "@momentum/notifications";

import { getApiHealth } from "./app.js";
import { assessReconciliationHealth, assessResearchScheduleActivation, assessSchedulerActivation, readAuditMigrationReadiness } from "./operations-health.js";
import { compareReconciliationAccounts } from "./reconciliation-status.js";
import { approveDisabledToReplay, approveReplayToShadow, approveShadowToPaper } from "./lifecycle-command.js";
import { toAgentRunDetail } from "./agent-run-detail.js";

let readModelRepository: ReturnType<typeof createAccountStateRepository> | undefined;
let agentRunRepository: ReturnType<typeof createAgentRunRepository> | undefined;
let strategyLifecycleRepository: ReturnType<typeof createStrategyLifecycleRepository> | undefined;
let shadowObservationRepository: ReturnType<typeof createShadowObservationRepository> | undefined;

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

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.byteLength;
    if (size > 1_000_000) throw new Error("request_body_too_large");
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) throw new Error("request_body_required");
  return JSON.parse(raw) as unknown;
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

async function readReconciliationStatus(request: IncomingMessage) {
  const authentication = await authenticateOperator(request);
  if (authentication.status !== 200) return authentication;
  if (!process.env.DATABASE_URL?.trim()) {
    return { body: { error: "db_not_configured" }, status: 503 } as const;
  }
  const runtime = getPaperOnlyRuntimeConfig();
  if (!runtime.brokerConnectionEnabled) {
    return { body: { error: "broker_not_configured" }, status: 503 } as const;
  }
  if (!readModelRepository) {
    const { db } = createDatabase();
    readModelRepository = createAccountStateRepository(db);
  }
  const model = await readModelRepository.getLatestReadModel();
  if (!model) {
    return { body: { error: "reconciliation_not_available" }, status: 404 } as const;
  }
  const reader = createPaperAccountReader({
    apiKey: process.env.ALPACA_API_KEY ?? "",
    secretKey: process.env.ALPACA_SECRET_KEY ?? "",
  });
  const brokerAccount = await reader.readAccount();
  const persistedAccount = {
    accountId: String(model.snapshot.accountId),
    buyingPower: String(model.snapshot.buyingPower),
    cash: String(model.snapshot.cash),
    currency: String(model.snapshot.currency),
    equity: String(model.snapshot.equity),
    status: String(model.snapshot.status),
  } as const;
  const comparison = compareReconciliationAccounts(persistedAccount, {
    accountId: brokerAccount.accountId,
    buyingPower: brokerAccount.buyingPower,
    cash: brokerAccount.cash,
    currency: brokerAccount.currency,
    equity: brokerAccount.equity,
    status: brokerAccount.status,
  });
  return {
    body: {
      brokerCheckedAt: new Date().toISOString(),
      comparison,
      persistedCapturedAt: model.freshness.capturedAt,
    },
    status: 200,
  } as const;
}

function readBooleanEnvironmentFlag(name: string): boolean {
  return process.env[name] === "true";
}

async function readOperationsHealth(request: IncomingMessage) {
  const authentication = await authenticateOperator(request);
  if (authentication.status !== 200) return authentication;
  if (!process.env.DATABASE_URL?.trim()) {
    return { body: { error: "db_not_configured" }, status: 503 } as const;
  }

  if (!readModelRepository) {
    const { db } = createDatabase();
    readModelRepository = createAccountStateRepository(db);
  }
  const model = await readModelRepository.getLatestReadModel();
  const lastDailyRun = await readModelRepository.getLatestDurableOneRunAudit();
  const reconciliation = assessReconciliationHealth(model?.freshness.capturedAt);
  const brokerConnectionEnabled = readBooleanEnvironmentFlag("BROKER_CONNECTION_ENABLED");
  const schedulerEnabled = readBooleanEnvironmentFlag("DURABLE_SCHEDULER_ENABLED");
  const activationApprovalReferencePresent = !schedulerEnabled || Boolean(process.env.DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE?.trim() && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(process.env.DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE.trim()));
  const handlerEnabled = readBooleanEnvironmentFlag("DAILY_PREPARATION_HANDLER_ENABLED");
  const researchSchedulerEnabled = readBooleanEnvironmentFlag("RESEARCH_SCHEDULER_ENABLED");
  const researchHandlerEnabled = readBooleanEnvironmentFlag("RESEARCH_HANDLER_ENABLED");
  const paperCredentialsConfigured = Boolean(process.env.ALPACA_API_KEY?.trim() && process.env.ALPACA_SECRET_KEY?.trim() && process.env.ALPACA_PAPER_TRADE !== "false");
  const paperMode = (process.env.TRADING_MODE ?? "paper") === "paper" && (process.env.ALPACA_PAPER_TRADE ?? "true") === "true";
  const telegram = getTelegramNotificationReadiness();
  const telegramTest = getTelegramAlertTestReadiness();
  const schedulerStatus = assessSchedulerActivation({
    brokerConnectionEnabled,
    dailyPreparationHandlerEnabled: handlerEnabled,
    schedulerEnabled,
  });
  const dailyPreparationCron = getDailyPreparationCron();
  const migrationDatabase = createDatabase();
  try {
    const migration = await readAuditMigrationReadiness(migrationDatabase.pool);

    return {
    body: {
      reconciliation,
      runtime: {
        brokerConnectionEnabled,
        dailyPreparationHandlerEnabled: handlerEnabled,
        dailyReconciliation: {
          status: lastDailyRun?.status === "completed" ? "completed" : "unavailable",
          ...(lastDailyRun?.capturedAt ? { capturedAt: lastDailyRun.capturedAt.toISOString() } : {}),
        },
        globalKillSwitchActive: isGlobalKillSwitchActive(),
        operatingMode: getPaperOperatingMode(),
        paperAutopilotEnabled: readBooleanEnvironmentFlag("PAPER_AUTOPILOT_ENABLED"),
        riskPolicy: {
          initialEquityBaseline: PAPER_INITIAL_EQUITY_BASELINE,
          maxSingleTradeRiskPercent: MAX_SINGLE_TRADE_RISK_PERCENT_OF_EQUITY,
          maxSingleTradeRiskUsd: MAX_SINGLE_TRADE_RISK_USD,
        },
        scheduler: {
          activationApprovalReferencePresent,
          cron: dailyPreparationCron,
          enabled: schedulerEnabled,
          status: schedulerStatus,
          timezone: DAILY_PREPARATION_TIMEZONE,
        },
        researchSchedule: {
          enabled: researchSchedulerEnabled,
          handlerEnabled: researchHandlerEnabled,
          status: assessResearchScheduleActivation({ brokerConnectionEnabled, databaseConfigured: true, handlerEnabled: researchHandlerEnabled, paperCredentialsConfigured, paperMode, schedulerEnabled: researchSchedulerEnabled }),
        },
        telegramAlerts: { deliveryVerification: telegram.deliveryVerification, enabled: telegram.checks.enabled, status: telegram.status },
        telegramAlertTest: { approvalReferencePresent: telegramTest.approvalReferencePresent, status: telegramTest.status },
        migration,
      },
    },
    status: 200,
    } as const;
  } finally {
    await migrationDatabase.pool.end();
  }
}

function parseAgentRunLimit(request: IncomingMessage): number {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const limit = Number(url.searchParams.get("limit") ?? "50");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("invalid_agent_run_limit");
  return limit;
}

async function readAgentRuns(request: IncomingMessage) {
  const authentication = await authenticateOperator(request);
  if (authentication.status !== 200) return authentication;
  if (!process.env.DATABASE_URL?.trim()) return { body: { error: "db_not_configured" }, status: 503 } as const;
  if (!agentRunRepository) {
    const { db } = createDatabase();
    agentRunRepository = createAgentRunRepository(db);
  }
  const rows = await agentRunRepository.listRecent(parseAgentRunLimit(request));
  return {
    body: {
      runs: rows.map((row) => ({
        agentType: row.agentType,
        artifact: row.artifactType ? { confidence: row.artifactConfidence, evidenceRefs: row.artifactEvidenceRefs, schemaVersion: row.artifactSchemaVersion, type: row.artifactType } : undefined,
        createdAt: row.createdAt,
        errorCode: row.errorCode,
        finishedAt: row.finishedAt,
        inputRefs: row.inputRefs,
        modelProvider: row.modelProvider,
        promptVersion: row.promptVersion,
        runId: row.runId,
        startedAt: row.startedAt,
        status: row.status,
        task: row.task,
      })),
    },
    status: 200,
  } as const;
}

async function readAgentRunDetail(request: IncomingMessage, runId: string) {
  const authentication = await authenticateOperator(request);
  if (authentication.status !== 200) return authentication;
  if (!process.env.DATABASE_URL?.trim()) return { body: { error: "db_not_configured" }, status: 503 } as const;
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(runId)) return { body: { error: "invalid_agent_run_id" }, status: 400 } as const;
  if (!agentRunRepository) {
    const { db } = createDatabase();
    agentRunRepository = createAgentRunRepository(db);
  }
  const row = await agentRunRepository.get(runId);
  if (!row) return { body: { error: "agent_run_not_found" }, status: 404 } as const;
  return { body: { run: toAgentRunDetail(row) }, status: 200 } as const;
}

function getAgentRunPath(request: IncomingMessage): { readonly kind: "detail" | "list"; readonly runId?: string } {
  const pathname = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname;
  const parts = pathname.split("/").filter(Boolean);
  const runId = parts[2];
  return parts.length === 3 && parts[0] === "v1" && parts[1] === "agent-runs" && runId ? { kind: "detail", runId } : { kind: "list" };
}

async function approveStrategyReplay(request: IncomingMessage) {
  const authentication = await authenticateOperator(request);
  if (authentication.status !== 200) return authentication;
  if (!process.env.DATABASE_URL?.trim()) return { body: { error: "db_not_configured" }, status: 503 } as const;
  getPaperOnlyRuntimeConfig();
  if (!strategyLifecycleRepository) {
    const { db } = createDatabase();
    strategyLifecycleRepository = createStrategyLifecycleRepository(db);
  }
  const result = await approveDisabledToReplay({ actorId: authentication.body.userId, body: await readJsonBody(request), persistence: strategyLifecycleRepository });
  return { body: { eventId: result.event.eventId, revision: result.revision, stage: result.stage, strategyKey: result.strategyKey, strategyVersion: result.strategyVersion }, status: 201 } as const;
}

async function approveStrategyShadow(request: IncomingMessage) {
  const authentication = await authenticateOperator(request);
  if (authentication.status !== 200) return authentication;
  if (!process.env.DATABASE_URL?.trim()) return { body: { error: "db_not_configured" }, status: 503 } as const;
  getPaperOnlyRuntimeConfig();
  if (!strategyLifecycleRepository || !shadowObservationRepository) {
    const { db } = createDatabase();
    strategyLifecycleRepository ??= createStrategyLifecycleRepository(db);
    shadowObservationRepository ??= createShadowObservationRepository(db);
  }
  const result = await approveReplayToShadow({ actorId: authentication.body.userId, body: await readJsonBody(request), observations: shadowObservationRepository, persistence: strategyLifecycleRepository });
  return { body: { eventId: result.event.eventId, revision: result.revision, sampleSize: result.sampleSize, stage: result.stage, strategyKey: result.strategyKey, strategyVersion: result.strategyVersion }, status: 201 } as const;
}

async function approveStrategyPaper(request: IncomingMessage) {
  const authentication = await authenticateOperator(request);
  if (authentication.status !== 200) return authentication;
  if (!process.env.DATABASE_URL?.trim()) return { body: { error: "db_not_configured" }, status: 503 } as const;
  getPaperOnlyRuntimeConfig();
  if (!strategyLifecycleRepository) {
    const { db } = createDatabase();
    strategyLifecycleRepository = createStrategyLifecycleRepository(db);
  }
  const result = await approveShadowToPaper({ actorId: authentication.body.userId, body: await readJsonBody(request), persistence: strategyLifecycleRepository });
  return { body: { closedTrades: result.closedTrades, eventId: result.event.eventId, revision: result.revision, stage: result.stage, strategyKey: result.strategyKey, strategyVersion: result.strategyVersion }, status: 201 } as const;
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

  if (request.method === "GET" && request.url === "/v1/reconciliation-status") {
    readReconciliationStatus(request)
      .then(({ body, status }) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      })
      .catch(() => {
        response.writeHead(502, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "reconciliation_unavailable" }));
      });
    return;
  }

  if (request.method === "GET" && request.url === "/v1/operations-health") {
    readOperationsHealth(request)
      .then(({ body, status }) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      })
      .catch(() => {
        response.writeHead(503, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "operations_health_unavailable" }));
      });
    return;
  }

  if (request.method === "GET" && request.url?.startsWith("/v1/agent-runs")) {
    const path = getAgentRunPath(request);
    (path.kind === "detail" ? readAgentRunDetail(request, path.runId ?? "") : readAgentRuns(request))
      .then(({ body, status }) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      })
      .catch((error: unknown) => {
        const status = error instanceof Error && error.message === "invalid_agent_run_limit" ? 400 : 503;
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: status === 400 ? "invalid_agent_run_limit" : "agent_runs_unavailable" }));
      });
    return;
  }

  if (request.method === "POST" && request.url === "/v1/strategies/lifecycle/replay") {
    approveStrategyReplay(request)
      .then(({ body, status }) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      })
      .catch((error: unknown) => {
        const status = error instanceof ZodError ? 400 : error instanceof SyntaxError ? 400 : 409;
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: status === 400 ? "invalid_lifecycle_request" : "lifecycle_gate_rejected" }));
      });
    return;
  }

  if (request.method === "POST" && request.url === "/v1/strategies/lifecycle/shadow") {
    approveStrategyShadow(request)
      .then(({ body, status }) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      })
      .catch((error: unknown) => {
        const status = error instanceof ZodError || error instanceof SyntaxError ? 400 : 409;
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: status === 400 ? "invalid_lifecycle_request" : "lifecycle_gate_rejected" }));
      });
    return;
  }

  if (request.method === "POST" && request.url === "/v1/strategies/lifecycle/paper") {
    approveStrategyPaper(request)
      .then(({ body, status }) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      })
      .catch((error: unknown) => {
        const status = error instanceof ZodError || error instanceof SyntaxError ? 400 : 409;
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: status === 400 ? "invalid_lifecycle_request" : "lifecycle_gate_rejected" }));
      });
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

getPaperOnlyRuntimeConfig();
server.listen(getServerPort(), "0.0.0.0");
