import { z } from "zod";

import { PAPER_TRADING_API_BASE_URL } from "@momentum/config";

export const ALPACA_ADAPTER_STATUS = "not_configured" as const;

const accountPayloadSchema = z.object({
  id: z.string().min(1),
  account_number: z.string().optional(),
  status: z.string().min(1),
  currency: z.string().min(1),
  equity: z.union([z.string(), z.number()]),
  cash: z.union([z.string(), z.number()]),
  buying_power: z.union([z.string(), z.number()]),
  last_equity: z.union([z.string(), z.number()]).optional(),
});

export interface PaperAccountSnapshot {
  readonly accountId: string;
  readonly accountNumber?: string;
  readonly buyingPower: string;
  readonly cash: string;
  readonly currency: string;
  readonly equity: string;
  readonly lastEquity?: string;
  readonly status: string;
}

export interface AlpacaAccountReader {
  readAccount(): Promise<PaperAccountSnapshot>;
}

export interface AlpacaAccountReaderOptions {
  readonly apiKey: string;
  readonly secretKey: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}

/** Read-only paper account adapter; no order methods are exposed. */
export function createPaperAccountReader(options: AlpacaAccountReaderOptions): AlpacaAccountReader {
  const apiKey = options.apiKey.trim();
  const secretKey = options.secretKey.trim();
  if (!apiKey || !secretKey) {
    throw new Error("Paper Alpaca credentials are required server-side.");
  }

  const baseUrl = options.baseUrl ?? PAPER_TRADING_API_BASE_URL;
  if (baseUrl !== PAPER_TRADING_API_BASE_URL) {
    throw new Error("The account reader only permits the Alpaca paper endpoint.");
  }
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async readAccount() {
      const response = await fetchImpl(`${baseUrl}/v2/account`, {
        headers: {
          "APCA-API-KEY-ID": apiKey,
          "APCA-API-SECRET-KEY": secretKey,
          accept: "application/json",
        },
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Alpaca account read failed with HTTP ${response.status}.`);
      }

      const parsed = accountPayloadSchema.parse(await response.json());
      return {
        accountId: parsed.id,
        ...(parsed.account_number ? { accountNumber: parsed.account_number } : {}),
        buyingPower: String(parsed.buying_power),
        cash: String(parsed.cash),
        currency: parsed.currency,
        equity: String(parsed.equity),
        ...(parsed.last_equity !== undefined ? { lastEquity: String(parsed.last_equity) } : {}),
        status: parsed.status,
      } satisfies PaperAccountSnapshot;
    },
  };
}
