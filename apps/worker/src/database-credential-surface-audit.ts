export interface CredentialSurfaceAuditResult {
  readonly columnsScanned: number;
  readonly matchingColumns: number;
  readonly matchingRows: number;
  readonly status: "passed" | "review_required";
}

export function summarizeCredentialSurfaceAudit(input: { readonly columnsScanned: number; readonly matchingColumns: number; readonly matchingRows: number }): CredentialSurfaceAuditResult {
  return { ...input, status: input.matchingRows === 0 ? "passed" : "review_required" };
}

export const CREDENTIAL_SURFACE_PATTERN = "(api[_ -]?key|secret[_ -]?key|begin (rsa|open[[:space:]-]?ssh|ec) private key|postgres://[^[:space:]]+:[^[:space:]]+@)";
