import { getDurableOneRunReadiness } from "./durable-one-run-readiness.js";

if (process.env.DURABLE_ONE_RUN_READINESS !== "true") {
  throw new Error("DURABLE_ONE_RUN_READINESS must be exactly true for the guarded one-run readiness command.");
}

const readiness = getDurableOneRunReadiness();
console.log(JSON.stringify(readiness));
if (readiness.status === "blocked") process.exitCode = 1;
