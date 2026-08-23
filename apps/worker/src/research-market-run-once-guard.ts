export interface ResearchMarketRunApproval {
  readonly reference: string;
}

export function getResearchMarketInputRefs(assetClass: "crypto" | "us_equity", capturedAt: string, approvalReference: string): readonly string[] {
  return Object.freeze([`alpaca-market:${assetClass}:${capturedAt}`, `operator-approval:${approvalReference}`]);
}

export function validateResearchMarketRunOnce(environment: NodeJS.ProcessEnv = process.env): ResearchMarketRunApproval {
  if (environment.RESEARCH_MARKET_RUN_ONCE !== "true") throw new Error("RESEARCH_MARKET_RUN_ONCE must be exactly true for the guarded market research command.");
  if (environment.RESEARCH_MARKET_OPERATOR_APPROVAL !== "true") throw new Error("RESEARCH_MARKET_OPERATOR_APPROVAL must be exactly true for the guarded market research command.");
  const reference = environment.RESEARCH_MARKET_APPROVAL_REFERENCE?.trim();
  if (!reference || reference.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(reference)) throw new Error("RESEARCH_MARKET_APPROVAL_REFERENCE must be a bounded non-secret reference.");
  return { reference };
}
