export type DurableOneRunFailureCode =
  | "alpaca_http_error"
  | "alpaca_network_error"
  | "database_constraint_error"
  | "database_schema_error"
  | "one_run_timeout"
  | "queue_provenance_error"
  | "one_run_failed";

/** Convert internal errors into a bounded diagnostic without exposing details. */
export function classifyDurableOneRunFailure(error: unknown): DurableOneRunFailureCode {
  const message = error instanceof Error ? error.message : String(error);
  if (/Alpaca .*HTTP \d+/i.test(message)) return "alpaca_http_error";
  if (/fetch failed|network|ECONN|ETIMEDOUT|ENOTFOUND/i.test(message)) return "alpaca_network_error";
  if (/timed out|timeout/i.test(message)) return "one_run_timeout";
  if (/provenance|queued job|not queued/i.test(message)) return "queue_provenance_error";
  if (/duplicate|constraint|violates/i.test(message)) return "database_constraint_error";
  if (/relation|column|schema|does not exist/i.test(message)) return "database_schema_error";
  return "one_run_failed";
}
