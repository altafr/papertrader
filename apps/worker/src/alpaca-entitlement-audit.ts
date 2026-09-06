export interface AlpacaEntitlementAuditInput {
  readonly account: { readonly httpStatus: number; readonly status?: string; readonly cryptoStatus?: string; readonly accountBlocked?: boolean; readonly tradingBlocked?: boolean };
  readonly assets: readonly { readonly symbol: string; readonly expectedAssetClass: "crypto" | "us_equity"; readonly httpStatus: number; readonly assetClass?: string; readonly status?: string; readonly tradable?: boolean; readonly fractionable?: boolean }[];
}

export interface AlpacaEntitlementAudit {
  readonly blockedReasons: readonly string[];
  readonly account: AlpacaEntitlementAuditInput["account"];
  readonly assets: AlpacaEntitlementAuditInput["assets"];
  readonly orderPathTested: false;
  readonly status: "blocked" | "metadata_ready";
}

/** Assess read-only broker metadata; this never claims that an order endpoint is authorized. */
export function assessAlpacaEntitlementMetadata(input: AlpacaEntitlementAuditInput): AlpacaEntitlementAudit {
  const blockedReasons = [
    ...(input.account.httpStatus === 200 ? [] : ["account_endpoint_unavailable"]),
    ...(input.account.status === "ACTIVE" ? [] : ["account_not_active"]),
    ...(input.account.cryptoStatus === "ACTIVE" ? [] : ["crypto_status_not_active"]),
    ...(input.account.accountBlocked === false ? [] : ["account_blocked_or_unreported"]),
    ...(input.account.tradingBlocked === false ? [] : ["trading_blocked_or_unreported"]),
    ...input.assets.flatMap((asset) => [
      ...(asset.httpStatus === 200 ? [] : [`asset_${asset.symbol}_unavailable`]),
      ...(asset.assetClass === asset.expectedAssetClass ? [] : [`asset_${asset.symbol}_class_unexpected`]),
      ...(asset.status === "active" ? [] : [`asset_${asset.symbol}_inactive`]),
      ...(asset.tradable === true ? [] : [`asset_${asset.symbol}_not_tradable`]),
    ]),
  ];
  return { account: input.account, assets: input.assets, blockedReasons, orderPathTested: false, status: blockedReasons.length === 0 ? "metadata_ready" : "blocked" };
}
