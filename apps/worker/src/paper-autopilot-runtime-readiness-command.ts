import { createAccountStateRepository, createDatabase } from "@momentum/db";

import { getPaperAutopilotReadiness } from "./paper-autopilot-readiness.js";
import { assessRuntimeReconciliation, combinePaperAutopilotRuntimeReadiness } from "./paper-autopilot-runtime-readiness.js";

if (process.env.PAPER_AUTOPILOT_RUNTIME_READINESS !== "true") {
  throw new Error("PAPER_AUTOPILOT_RUNTIME_READINESS must be exactly true for the guarded runtime-readiness command.");
}

const configuration = getPaperAutopilotReadiness();
let reconciliation = assessRuntimeReconciliation(undefined);
if (process.env.DATABASE_URL?.trim()) {
  const database = createDatabase(process.env.DATABASE_URL);
  try {
    const repository = createAccountStateRepository(database.db);
    const model = await repository.getLatestReadModel();
    reconciliation = assessRuntimeReconciliation(model?.freshness.capturedAt);
  } finally {
    await database.pool.end().catch(() => undefined);
  }
}
const readiness = combinePaperAutopilotRuntimeReadiness(configuration, reconciliation);
console.log(JSON.stringify(readiness));
if (readiness.status === "blocked") process.exitCode = 1;
