import { getPositionManagementReadiness, runPositionManagementCycle } from "./position-management-runtime.js";

if (process.env.POSITION_MANAGEMENT_ONCE !== "true") throw new Error("POSITION_MANAGEMENT_ONCE must be exactly true.");
const readiness = getPositionManagementReadiness(process.env);
if (readiness.status !== "ready") throw new Error(`Position management requires readiness: ${readiness.blockedReasons.join(",") || readiness.status}.`);
const result = await runPositionManagementCycle(process.env);
console.log(JSON.stringify({ managed: result.managed, submitted: result.submitted, status: "position_management_completed" }));
