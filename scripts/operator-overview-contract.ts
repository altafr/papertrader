type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateOperatorOverviewContract(value: unknown): { readonly reason?: string; readonly valid: boolean } {
  if (!isRecord(value)) return { reason: "response_not_object", valid: false };
  for (const key of ["agents", "filteredTrades", "tradeDecisions", "strategyLifecycle", "strategyCatalog", "auditTimeline"]) {
    if (!Array.isArray(value[key])) return { reason: `missing_array:${key}`, valid: false };
  }
  const history = value.history;
  if (!isRecord(history) || typeof history.page !== "number" || typeof history.limit !== "number" || typeof history.hasNext !== "boolean" || !isRecord(history.totals)) return { reason: "invalid_history_metadata", valid: false };
  for (const key of ["agents", "filteredTrades", "submissions", "lifecycle", "schedules"]) {
    if (typeof history.totals[key] !== "number" || !Number.isSafeInteger(history.totals[key])) return { reason: `invalid_total:${key}`, valid: false };
  }
  if (!Number.isSafeInteger(history.page) || history.page < 1 || !Number.isSafeInteger(history.limit) || history.limit < 1 || history.limit > 100) return { reason: "invalid_history_bounds", valid: false };
  return { valid: true };
}

export function validateAuditCsvHeader(value: string): { readonly reason?: string; readonly valid: boolean } {
  const header = value.split(/\r?\n/, 1)[0] ?? "";
  const required = ["recordType", "strategyVersion", "assetClass", "owner", "description", "stage", "requiredLookbackBars", "defaultParameters"];
  return required.every((column) => header.split(",").includes(`"${column}"`)) ? { valid: true } : { reason: "missing_audit_columns", valid: false };
}
