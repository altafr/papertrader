import { z } from "zod";

import { PAPER_TRADING_API_BASE_URL } from "@momentum/config";

const decimalValue = z.union([z.string(), z.number()]).transform(String);
const orderSchema = z.object({
  id: z.string().min(1), client_order_id: z.string().min(1).optional(), symbol: z.string().min(1),
  asset_class: z.string().min(1), side: z.string().min(1), type: z.string().min(1), qty: decimalValue, filled_qty: decimalValue.nullable().optional(),
  status: z.string().min(1), submitted_at: z.string().datetime().nullable().optional(), updated_at: z.string().datetime().nullable().optional(),
});

export interface PaperOrderApproval {
  /** Deterministic risk approval; Paper Autopilot does not require an operator confirmation field. */
  readonly approvalId: string;
  readonly intentId: string;
  readonly riskDecision?: {
    readonly approvalStatus?: "approved" | "rejected";
    readonly estimatedLoss?: string;
    readonly estimatedLossPercent?: string;
    readonly policyVersion?: string;
    readonly reasons?: readonly string[];
  };
  readonly status: "approved" | "rejected";
}

export interface PaperOrderSubmissionRequest {
  /** The approval is produced by the server-side risk engine, not by a per-order human prompt. */
  readonly approval: PaperOrderApproval;
  readonly assetClass: "crypto" | "us_equity";
  readonly clientOrderId: string;
  readonly limitPrice?: string;
  /** Point-in-time indicator values are persisted for audit and never sent to Alpaca. */
  readonly marketSnapshot?: Readonly<Record<string, string | null>>;
  readonly quantity: string;
  readonly entryPrice?: string;
  readonly plannedStopPrice?: string;
  readonly plannedTargetPrice?: string;
  readonly orderClass?: "simple" | "bracket";
  readonly strategyKey?: string;
  readonly strategyVersion?: string;
  readonly timeStopAt?: string;
  readonly side: "buy";
  readonly symbol: string;
  readonly timeInForce: "day" | "gtc";
  readonly type: "limit" | "market";
}

export interface PaperOrderSubmission {
  readonly alpacaOrderId: string;
  readonly assetClass: string;
  readonly clientOrderId: string;
  readonly filledQuantity?: string;
  readonly quantity: string;
  readonly status: string;
  readonly submittedAt?: string;
  readonly symbol: string;
  readonly type: string;
  readonly updatedAt?: string;
}

export interface PaperOrderSubmitter {
  submit(request: PaperOrderSubmissionRequest): Promise<PaperOrderSubmission>;
}

export interface PaperExitOrderRequest {
  readonly assetClass: "crypto" | "us_equity";
  readonly clientOrderId: string;
  readonly decision: { readonly exitPrice: string; readonly reason?: "profit_target" | "stop_loss" | "time_stop"; readonly shouldExit: boolean; readonly symbol: string };
  readonly quantity: string;
  readonly timeInForce: "day" | "gtc";
  readonly type: "market" | "limit";
}

export interface PaperExitOrderSubmitter {
  submitExit(request: PaperExitOrderRequest): Promise<PaperOrderSubmission>;
}

export interface PaperOrderSubmitterOptions {
  readonly apiKey: string;
  readonly brokerConnectionEnabled: boolean;
  readonly fetchImpl?: typeof fetch;
  readonly secretKey: string;
}

/** Classify provider failures without exposing response bodies or credentials. */
export function classifyPaperOrderFailure(assetClass: "crypto" | "us_equity", status: number, exit = false, providerHint = ""): string {
  if (assetClass === "crypto" && status === 403) {
    const hint = providerHint.toLowerCase();
    if (hint.includes("entitlement") || hint.includes("not enabled")) return "crypto_order_entitlement_blocked";
    if (hint.includes("wash")) return "crypto_order_wash_trade_blocked";
    if (hint.includes("liquidat") || hint.includes("restrict")) return "crypto_order_restricted";
    return "crypto_order_restricted";
  }
  return `${exit ? "paper_exit" : "paper_entry"}_http_${status}`;
}

async function getProviderFailureHint(response: Response): Promise<string> {
  try {
    const body = await response.clone().json() as Record<string, unknown>;
    return [body.code, body.message, body.error].filter((value): value is string => typeof value === "string").join(" ").slice(0, 240);
  } catch { return ""; }
}

function getProviderRequestId(response: Response): string | undefined {
  const value = response.headers.get("x-request-id")?.trim();
  return value && /^[A-Za-z0-9._:-]{1,128}$/.test(value) ? value : undefined;
}

function formatProviderFailure(prefix: string, response: Response, code: string): string {
  const requestId = getProviderRequestId(response);
  return `${prefix} with HTTP ${response.status} (${code})${requestId ? ` request_id=${requestId}` : ""}.`;
}

/** Alpaca's crypto trading API uses slash-delimited symbols (for example BTC/USD). */
export function normalizeAlpacaOrderSymbol(assetClass: "crypto" | "us_equity", symbol: string): string {
  if (assetClass !== "crypto" || symbol.includes("/")) return symbol;
  const canonical = symbol.replaceAll("/", "").toUpperCase();
  return canonical.endsWith("USD") && canonical.length > 3 ? `${canonical.slice(0, -3)}/USD` : symbol;
}

function normalizeOrder(parsed: z.infer<typeof orderSchema>, request: PaperOrderSubmissionRequest): PaperOrderSubmission {
  return {
    alpacaOrderId: parsed.id, assetClass: parsed.asset_class, clientOrderId: parsed.client_order_id ?? request.clientOrderId,
    quantity: parsed.qty, status: parsed.status, ...(parsed.filled_qty ? { filledQuantity: parsed.filled_qty } : {}), ...(parsed.submitted_at ? { submittedAt: parsed.submitted_at } : {}), symbol: parsed.symbol,
    type: parsed.type, ...(parsed.updated_at ? { updatedAt: parsed.updated_at } : {}),
  };
}

export function createPaperOrderSubmitter(options: PaperOrderSubmitterOptions): PaperOrderSubmitter {
  const apiKey = options.apiKey.trim();
  const secretKey = options.secretKey.trim();
  if (!apiKey || !secretKey) throw new Error("Paper Alpaca credentials are required server-side.");
  const fetchImpl = options.fetchImpl ?? fetch;
  const requestJson = async (path: string, init: RequestInit): Promise<Response> => fetchImpl(`${PAPER_TRADING_API_BASE_URL}${path}`, {
    ...init,
    headers: { ...init.headers, "APCA-API-KEY-ID": apiKey, "APCA-API-SECRET-KEY": secretKey, accept: "application/json", "content-type": "application/json" },
  });
  return {
    async submit(request) {
      if (!options.brokerConnectionEnabled) throw new Error("Paper broker connection is disabled.");
      if (request.approval.status !== "approved") throw new Error("A passing paper risk approval is required.");
      if (request.approval.intentId !== request.clientOrderId && !request.clientOrderId.startsWith(`${request.approval.intentId}-`)) throw new Error("Client order ID must be derived from the approved intent.");
      if (!/^[A-Za-z0-9._:-]{1,48}$/.test(request.clientOrderId)) throw new Error("Client order ID has an invalid format.");
      if (request.type === "limit" && !request.limitPrice) throw new Error("Limit orders require a limit price.");
      const existingResponse = await requestJson(`/v2/orders:by_client_order_id?client_order_id=${encodeURIComponent(request.clientOrderId)}`, { method: "GET" });
      if (existingResponse.ok) return normalizeOrder(orderSchema.parse(await existingResponse.json()), request);
      if (existingResponse.status !== 404) throw new Error("Paper order idempotency lookup failed.");
      const bracket = request.assetClass === "us_equity" && request.plannedStopPrice && request.plannedTargetPrice;
      const body = { client_order_id: request.clientOrderId, limit_price: request.limitPrice, order_class: bracket ? "bracket" : "simple", ...(bracket ? { take_profit: { limit_price: request.plannedTargetPrice }, stop_loss: { stop_price: request.plannedStopPrice } } : {}), qty: request.quantity, side: request.side, symbol: normalizeAlpacaOrderSymbol(request.assetClass, request.symbol), time_in_force: request.assetClass === "crypto" ? "gtc" : request.timeInForce, type: request.type };
      const response = await requestJson("/v2/orders", { body: JSON.stringify(body), method: "POST" });
      if (!response.ok) throw new Error(formatProviderFailure("Paper order submission failed", response, classifyPaperOrderFailure(request.assetClass, response.status, false, await getProviderFailureHint(response))));
      return normalizeOrder(orderSchema.parse(await response.json()), request);
    },
  };
}

/** Submit a deterministic paper exit; AI output cannot call this adapter directly. */
export function createPaperExitOrderSubmitter(options: PaperOrderSubmitterOptions): PaperExitOrderSubmitter {
  const apiKey = options.apiKey.trim();
  const secretKey = options.secretKey.trim();
  if (!apiKey || !secretKey) throw new Error("Paper Alpaca credentials are required server-side.");
  const fetchImpl = options.fetchImpl ?? fetch;
  const requestJson = async (path: string, init: RequestInit): Promise<Response> => fetchImpl(`${PAPER_TRADING_API_BASE_URL}${path}`, {
    ...init,
    headers: { ...init.headers, "APCA-API-KEY-ID": apiKey, "APCA-API-SECRET-KEY": secretKey, accept: "application/json", "content-type": "application/json" },
  });
  return {
    async submitExit(request) {
      if (!options.brokerConnectionEnabled) throw new Error("Paper broker connection is disabled.");
      if (!request.decision.shouldExit || !request.decision.reason) throw new Error("A deterministic exit decision is required.");
      if (!/^[A-Za-z0-9._:-]{1,48}$/.test(request.clientOrderId)) throw new Error("Client order ID has an invalid format.");
      const existingResponse = await requestJson(`/v2/orders:by_client_order_id?client_order_id=${encodeURIComponent(request.clientOrderId)}`, { method: "GET" });
      if (existingResponse.ok) return normalizeOrder(orderSchema.parse(await existingResponse.json()), { approval: { approvalId: request.clientOrderId, intentId: request.clientOrderId, status: "approved" }, assetClass: request.assetClass, clientOrderId: request.clientOrderId, quantity: request.quantity, side: "buy", symbol: request.decision.symbol, timeInForce: request.timeInForce, type: request.type });
      if (existingResponse.status !== 404) throw new Error("Paper exit idempotency lookup failed.");
      const response = await requestJson("/v2/orders", { body: JSON.stringify({ client_order_id: request.clientOrderId, order_class: "simple", qty: request.quantity, side: "sell", symbol: normalizeAlpacaOrderSymbol(request.assetClass, request.decision.symbol), time_in_force: request.assetClass === "crypto" ? "gtc" : request.timeInForce, type: request.type }), method: "POST" });
      if (!response.ok) throw new Error(formatProviderFailure("Paper exit submission failed", response, classifyPaperOrderFailure(request.assetClass, response.status, true, await getProviderFailureHint(response))));
      return normalizeOrder(orderSchema.parse(await response.json()), { approval: { approvalId: request.clientOrderId, intentId: request.clientOrderId, status: "approved" }, assetClass: request.assetClass, clientOrderId: request.clientOrderId, quantity: request.quantity, side: "buy", symbol: request.decision.symbol, timeInForce: request.timeInForce, type: request.type });
    },
  };
}
