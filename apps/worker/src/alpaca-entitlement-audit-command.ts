import { PAPER_TRADING_API_BASE_URL } from "@momentum/config";
import { assessAlpacaEntitlementMetadata } from "./alpaca-entitlement-audit.js";

if (process.env.ALPACA_ENTITLEMENT_AUDIT !== "true") throw new Error("ALPACA_ENTITLEMENT_AUDIT must be exactly true for the read-only broker metadata audit.");
if (!process.env.ALPACA_API_KEY?.trim() || !process.env.ALPACA_SECRET_KEY?.trim()) throw new Error("ALPACA_ENTITLEMENT_AUDIT requires paper credentials.");

const headers = { "APCA-API-KEY-ID": process.env.ALPACA_API_KEY, "APCA-API-SECRET-KEY": process.env.ALPACA_SECRET_KEY, accept: "application/json" };
async function read(path: string): Promise<{ readonly httpStatus: number; readonly body: Record<string, unknown> }> {
  const response = await fetch(`${PAPER_TRADING_API_BASE_URL}${path}`, { headers, method: "GET" });
  let body: Record<string, unknown> = {};
  try { const parsed: unknown = await response.json(); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>; } catch { /* bounded status-only failure */ }
  return { httpStatus: response.status, body };
}

const account = await read("/v2/account");
const assetResponses = await Promise.all([read("/v2/assets/BTC%2FUSD"), read("/v2/assets/PFD")]);
const audit = assessAlpacaEntitlementMetadata({
  account: { httpStatus: account.httpStatus, ...(typeof account.body.account_blocked === "boolean" ? { accountBlocked: account.body.account_blocked } : {}), ...(typeof account.body.crypto_status === "string" ? { cryptoStatus: account.body.crypto_status } : {}), ...(typeof account.body.status === "string" ? { status: account.body.status } : {}), ...(typeof account.body.trading_blocked === "boolean" ? { tradingBlocked: account.body.trading_blocked } : {}) },
  assets: assetResponses.map((response, index) => ({ expectedAssetClass: index === 0 ? "crypto" : "us_equity", httpStatus: response.httpStatus, symbol: (typeof response.body.symbol === "string" ? response.body.symbol : undefined) ?? (index === 0 ? "BTC/USD" : "PFD"), ...(typeof response.body.class === "string" ? { assetClass: response.body.class } : {}), ...(typeof response.body.fractionable === "boolean" ? { fractionable: response.body.fractionable } : {}), ...(typeof response.body.status === "string" ? { status: response.body.status } : {}), ...(typeof response.body.tradable === "boolean" ? { tradable: response.body.tradable } : {}) })),
});
console.log(JSON.stringify(audit));
if (audit.status === "blocked") process.exitCode = 1;
