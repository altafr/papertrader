import { createDatabase, createTechSolverRepository } from "@momentum/db";

export type TechSolverDiagnosis = { readonly category: string; readonly fingerprint: string; readonly problem: string; readonly solution: string; readonly status: "manual_review" | "open" | "resolved" };

function bounded(value: string): string { return value.replace(/(bot[_ -]?token|api[_ -]?key|secret[_ -]?key|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]").replace(/https?:\/\/[^\s]+/gi, "[url redacted]").replace(/[^A-Za-z0-9 ._:-]+/g, " ").trim().slice(0, 240); }

export function diagnoseTechSolverError(error: unknown): TechSolverDiagnosis {
  const problem = bounded(error instanceof Error ? error.message : "unknown error") || "unknown error";
  const lower = problem.toLowerCase();
  if (lower.includes("client order id") && lower.includes("invalid")) return { category: "broker_client_order_id", fingerprint: "broker_client_order_id_invalid", problem, solution: "Normalize generated broker client order IDs to the provider-safe alphabet and length; keep the deterministic exit intent and retry only after validation.", status: "open" };
  if (lower.includes("crypto_order_wash_trade_blocked")) return { category: "broker_crypto_restriction", fingerprint: "broker_crypto_wash_trade_blocked", problem, solution: "Keep the affected crypto exit paused and review Alpaca wash-trade protection and outstanding orders; never bypass broker restrictions or risk gates.", status: "manual_review" };
  if (lower.includes("crypto_order_restricted")) return { category: "broker_crypto_restriction", fingerprint: "broker_crypto_restriction", problem, solution: "Keep the affected crypto exit paused and review the broker restriction or liquidation-only state; never bypass broker restrictions or risk gates.", status: "manual_review" };
  if (lower.includes("entitlement") || lower.includes("http 403")) return { category: "broker_entitlement", fingerprint: "broker_entitlement_blocked", problem, solution: "Keep the affected asset/order path paused and require broker entitlement review; never bypass the provider restriction or risk gates.", status: "manual_review" };
  if (lower.includes("stale") || lower.includes("fresh market")) return { category: "market_data_freshness", fingerprint: "market_data_stale", problem, solution: "Keep trading and exits paused until a fresh mark arrives; do not bypass the stale-data gate.", status: "open" };
  if (lower.includes("http ") || lower.includes("network") || lower.includes("fetch")) return { category: "provider_connectivity", fingerprint: "provider_connectivity", problem, solution: "Use bounded retries with backoff, preserve idempotency, and fail closed when the provider remains unavailable.", status: "open" };
  return { category: "unknown_runtime", fingerprint: `unknown_runtime:${problem.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 80) || "error"}`, problem, solution: "Keep the affected loop fail-closed and require operator or engineer review before any behavior change.", status: "manual_review" };
}

/** Persist one bounded diagnosis; this agent never changes trading state. */
export async function runTechSolverOnce(environment: NodeJS.ProcessEnv, error: unknown): Promise<TechSolverDiagnosis | undefined> {
  const databaseUrl = environment.DATABASE_URL?.trim();
  if (!databaseUrl) return undefined;
  const diagnosis = diagnoseTechSolverError(error);
  const { db, pool } = createDatabase(databaseUrl);
  try {
    const lastAttemptAt = new Date();
    // `problem` is already bounded/redacted; persist it as the durable diagnostic
    // so broker request IDs survive restarts without storing provider response bodies.
    await createTechSolverRepository(db).recordAttempt({ ...diagnosis, lastAttemptAt, lastError: diagnosis.problem });
    return diagnosis;
  } finally { await pool.end(); }
}
