import { createDatabase, createAccountStateRepository } from "@momentum/db";
import { assessDurableOneRunRetryReadiness } from "./durable-one-run-retry-readiness.js";
import { validateDurableOneRunId, validateDurableSchedulerApprovalReference } from "./durable-scheduler.js";

if (process.env.DURABLE_ONE_RUN_RETRY_READINESS !== "true") {
  throw new Error("DURABLE_ONE_RUN_RETRY_READINESS must be exactly true for the guarded retry-readiness command.");
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.trim()) throw new Error("DATABASE_URL is required for the guarded retry-readiness command.");

const approvalReference = validateDurableSchedulerApprovalReference();
const runId = validateDurableOneRunId();
const database = createDatabase(databaseUrl);
try {
  const repository = createAccountStateRepository(database.db);
  const [runAudit, approvalAudits] = await Promise.all([
    repository.getDurableOneRunAudit(runId),
    repository.getDurableOneRunAuditByApprovalReference(approvalReference),
  ]);
  const readiness = assessDurableOneRunRetryReadiness({ approvalReference, runId, existingAudits: [
    ...(runAudit ? [{ approvalReference: runAudit.approvalReference, runId: runAudit.runId }] : []),
    ...approvalAudits.map((audit) => ({ approvalReference: audit.approvalReference, runId: audit.runId })),
  ] });
  console.log(JSON.stringify(readiness));
  if (readiness.status === "blocked") process.exitCode = 1;
} finally {
  await database.pool.end().catch(() => undefined);
}
