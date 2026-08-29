export type PublicHealth = {
  readonly status: string;
  readonly operatingMode?: string;
  readonly release?: string;
  readonly researchSchedule?: { readonly lastCatchupAt?: string; readonly lastCatchupJobId?: string; readonly lastCatchupStatus?: "queued" | "rejected"; readonly lastRiskApprovedCount?: number; readonly lastRiskCycleAt?: string; readonly lastRiskCycleStatus?: "completed" | "failed"; readonly lastRiskDecisionCount?: number; readonly lastRunAt?: string; readonly status?: string; readonly nextRunAt?: string };
  readonly positionManagement?: { readonly readiness?: string; readonly status?: string };
  readonly marketStream?: { readonly freshness?: "fresh" | "stale" | "unknown"; readonly freshnessMaxAgeSeconds?: number; readonly lastMessageAt?: string; readonly status?: string };
};

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function optionalRecord(value: unknown): Record<string, unknown> | undefined {
  return record(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length <= 160 ? value : undefined;
}

export function parsePublicHealth(value: unknown): PublicHealth | undefined {
  const root = record(value);
  if (!root) return undefined;
  const status = optionalString(root.status);
  if (!status) return undefined;
  const research = optionalRecord(root.researchSchedule);
  const positions = optionalRecord(root.positionManagement);
  const stream = optionalRecord(root.marketStream);
  return {
    status,
    ...(optionalString(root.operatingMode) ? { operatingMode: root.operatingMode as string } : {}),
    ...(optionalString(root.release) ? { release: root.release as string } : {}),
    ...(research ? { researchSchedule: { ...(optionalString(research.lastCatchupAt) ? { lastCatchupAt: research.lastCatchupAt as string } : {}), ...(optionalString(research.lastCatchupJobId) ? { lastCatchupJobId: research.lastCatchupJobId as string } : {}), ...((research.lastCatchupStatus === "queued" || research.lastCatchupStatus === "rejected") ? { lastCatchupStatus: research.lastCatchupStatus } : {}), ...(typeof research.lastRiskApprovedCount === "number" && Number.isSafeInteger(research.lastRiskApprovedCount) && research.lastRiskApprovedCount >= 0 && research.lastRiskApprovedCount <= 100 ? { lastRiskApprovedCount: research.lastRiskApprovedCount } : {}), ...(optionalString(research.lastRiskCycleAt) ? { lastRiskCycleAt: research.lastRiskCycleAt as string } : {}), ...((research.lastRiskCycleStatus === "completed" || research.lastRiskCycleStatus === "failed") ? { lastRiskCycleStatus: research.lastRiskCycleStatus } : {}), ...(typeof research.lastRiskDecisionCount === "number" && Number.isSafeInteger(research.lastRiskDecisionCount) && research.lastRiskDecisionCount >= 0 && research.lastRiskDecisionCount <= 100 ? { lastRiskDecisionCount: research.lastRiskDecisionCount } : {}), ...(optionalString(research.lastRunAt) ? { lastRunAt: research.lastRunAt as string } : {}), ...(optionalString(research.status) ? { status: research.status as string } : {}), ...(optionalString(research.nextRunAt) ? { nextRunAt: research.nextRunAt as string } : {}) } } : {}),
    ...(positions ? { positionManagement: { ...(optionalString(positions.readiness) ? { readiness: positions.readiness as string } : {}), ...(optionalString(positions.status) ? { status: positions.status as string } : {}) } } : {}),
    ...(stream ? { marketStream: { ...(optionalString(stream.freshness) && (["fresh", "stale", "unknown"] as const).includes(stream.freshness as "fresh" | "stale" | "unknown") ? { freshness: stream.freshness as "fresh" | "stale" | "unknown" } : {}), ...(typeof stream.freshnessMaxAgeSeconds === "number" && Number.isSafeInteger(stream.freshnessMaxAgeSeconds) && stream.freshnessMaxAgeSeconds > 0 && stream.freshnessMaxAgeSeconds <= 86_400 ? { freshnessMaxAgeSeconds: stream.freshnessMaxAgeSeconds } : {}), ...(optionalString(stream.lastMessageAt) ? { lastMessageAt: stream.lastMessageAt as string } : {}), ...(optionalString(stream.status) ? { status: stream.status as string } : {}) } } : {}),
  };
}
