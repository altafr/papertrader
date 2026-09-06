import { describe, expect, it } from "vitest";
import { assessAlpacaEntitlementMetadata } from "./alpaca-entitlement-audit.js";

describe("Alpaca entitlement metadata audit", () => {
  it("reports metadata readiness without asserting order authorization", () => {
    const result = assessAlpacaEntitlementMetadata({ account: { accountBlocked: false, cryptoStatus: "ACTIVE", httpStatus: 200, status: "ACTIVE", tradingBlocked: false }, assets: [{ assetClass: "crypto", expectedAssetClass: "crypto", httpStatus: 200, status: "active", symbol: "BTC/USD", tradable: true }] });
    expect(result).toMatchObject({ blockedReasons: [], orderPathTested: false, status: "metadata_ready" });
  });
  it("fails closed when account or asset metadata is blocked", () => {
    expect(assessAlpacaEntitlementMetadata({ account: { httpStatus: 403 }, assets: [] })).toMatchObject({ blockedReasons: ["account_endpoint_unavailable", "account_not_active", "crypto_status_not_active", "account_blocked_or_unreported", "trading_blocked_or_unreported"], status: "blocked" });
  });
});
