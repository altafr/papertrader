import { getDurableSchedulerReadiness } from "./durable-scheduler.js";

if (process.env.DURABLE_QUEUE_READINESS !== "true") {
  throw new Error("DURABLE_QUEUE_READINESS must be exactly true for the guarded readiness command.");
}

const readiness = getDurableSchedulerReadiness();
console.log(JSON.stringify(readiness));
if (readiness.status === "blocked") process.exitCode = 1;
