export interface RiskCycleStatus {
  readonly approved: number;
  readonly decisions: number;
  readonly latestAt: string | null;
  readonly latestStatus: string | null;
}

/** Keep the operator command bounded and free of market payloads or credentials. */
export function buildRiskCycleStatus(input: { readonly approved?: unknown; readonly decisions?: unknown; readonly latestAt?: unknown; readonly latestStatus?: unknown }): RiskCycleStatus {
  const bounded = (value: unknown) => Number.isSafeInteger(Number(value)) && Number(value) >= 0 ? Math.min(100_000, Number(value)) : 0;
  const latestAt = input.latestAt instanceof Date ? input.latestAt.toISOString() : typeof input.latestAt === "string" && Number.isFinite(Date.parse(input.latestAt)) ? new Date(input.latestAt).toISOString() : null;
  const latestStatus = typeof input.latestStatus === "string" && /^[a-z_]{1,64}$/.test(input.latestStatus) ? input.latestStatus : null;
  return { approved: bounded(input.approved), decisions: bounded(input.decisions), latestAt, latestStatus };
}
