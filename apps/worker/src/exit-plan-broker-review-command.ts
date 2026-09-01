import { createPaperAccountReader } from "@momentum/alpaca";
import { getPaperOnlyRuntimeConfig } from "@momentum/config";
import { buildExitPlanBrokerReview } from "./exit-plan-broker-review.js";
import { buildLegacyExitPlanProposal } from "./exit-plan-adoption.js";

if (process.env.EXIT_PLAN_BROKER_REVIEW !== "true") throw new Error("EXIT_PLAN_BROKER_REVIEW must be exactly true.");
const runtime = getPaperOnlyRuntimeConfig();
if (!runtime.brokerConnectionEnabled) throw new Error("EXIT_PLAN_BROKER_REVIEW requires broker connectivity.");

const reader = createPaperAccountReader({ apiKey: process.env.ALPACA_API_KEY ?? "", secretKey: process.env.ALPACA_SECRET_KEY ?? "" });
const state = await reader.readAccountState();
const positions = buildExitPlanBrokerReview(state).map((position) => ({ ...position, ...(position.brokerWeightedAverageFillPrice ? { proposal: buildLegacyExitPlanProposal(position.brokerWeightedAverageFillPrice) } : {}) }));
console.log(JSON.stringify({ positions, status: "exit_plan_broker_review" }));
