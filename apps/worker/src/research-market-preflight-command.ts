import { validateResearchMarketPreflight } from "./research-market-preflight.js";

if (process.env.RESEARCH_MARKET_PREFLIGHT !== "true") {
  throw new Error("RESEARCH_MARKET_PREFLIGHT must be exactly true for the guarded market research preflight.");
}

const result = validateResearchMarketPreflight();
console.log(JSON.stringify(result));
