import { getPaperAutopilotReadiness } from "./paper-autopilot-readiness.js";

if (process.env.PAPER_AUTOPILOT_READINESS !== "true") {
  throw new Error("PAPER_AUTOPILOT_READINESS must be exactly true for the guarded readiness command.");
}

const readiness = getPaperAutopilotReadiness();
console.log(JSON.stringify(readiness));
if (readiness.status === "blocked") process.exitCode = 1;
