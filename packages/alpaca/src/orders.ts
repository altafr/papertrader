import { z } from "zod";

import { PAPER_TRADING_API_BASE_URL } from "@momentum/config";

const decimalValue = z.union([z.string(), z.number()]).transform(String);
const orderSchema = z.object({
  id: z.string().min(1), client_order_id: z.string().min(1).optional(), symbol: z.string().min(1),
  asset_class: z.string().min(1), side: z.string().min(1), type: z.string().min(1), qty: decimalValue,
  status: z.string().min(1), submitted_at: z.string().datetime().nullable().optional(), updated_at: z.string().datetime().nullable().optional(),
});

export interface PaperOrderApproval {
  readonly approvalId: string;
  readonly intentId: string;
  readonly status: "approved" | "rejected";
}

export interface PaperOrderSubmissionRequest {
  readonly approval: PaperOrderApproval;
  readonly assetClass: "crypto" | "us_equity";
  readonly clientOrderId: string;
  readonly limitPrice?: string;
  readonly quantity: string;
  readonly side: "buy";
  readonly symbol: string;
  readonly timeInForce: "day" | "gtc";
  readonly type: "limit" | "market";
}

export interface PaperOrderSubmission {
  readonly alpacaOrderId: string;
  readonly assetClass: string;
  readonly clientOrderId: string;
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

export interface PaperOrderSubmitterOptions {
  readonly apiKey: string;
  readonly brokerConnectionEnabled: boolean;
  readonly fetchImpl?: typeof fetch;
  readonly secretKey: string;
}

function normalizeOrder(parsed: z.infer<typeof orderSchema>, request: PaperOrderSubmissionRequest): PaperOrderSubmission {
  return {
    alpacaOrderId: parsed.id, assetClass: parsed.asset_class, clientOrderId: parsed.client_order_id ?? request.clientOrderId,
    quantity: parsed.qty, status: parsed.status, ...(parsed.submitted_at ? { submittedAt: parsed.submitted_at } : {}), symbol: parsed.symbol,
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
      const body = { client_order_id: request.clientOrderId, limit_price: request.limitPrice, order_class: "simple", qty: request.quantity, side: request.side, symbol: request.symbol, time_in_force: request.timeInForce, type: request.type };
      const response = await requestJson("/v2/orders", { body: JSON.stringify(body), method: "POST" });
      if (!response.ok) throw new Error(`Paper order submission failed with HTTP ${response.status}.`);
      return normalizeOrder(orderSchema.parse(await response.json()), request);
    },
  };
}
