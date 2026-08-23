import { getResearchScheduleReadiness } from "./research-scheduler.js";

if (process.env.RESEARCH_SCHEDULE_READINESS !== "true") {
  throw new Error("RESEARCH_SCHEDULE_READINESS must be exactly true for the guarded research readiness command.");
}

const readiness = getResearchScheduleReadiness();
console.log(JSON.stringify(readiness));
if (readiness.status === "blocked") process.exitCode = 1;
