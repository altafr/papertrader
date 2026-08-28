export type PublicHealth = {
  readonly status: string;
  readonly operatingMode?: string;
  readonly release?: string;
  readonly researchSchedule?: { readonly status?: string; readonly nextRunAt?: string };
  readonly positionManagement?: { readonly readiness?: string; readonly status?: string };
  readonly marketStream?: { readonly status?: string };
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
    ...(research ? { researchSchedule: { ...(optionalString(research.status) ? { status: research.status as string } : {}), ...(optionalString(research.nextRunAt) ? { nextRunAt: research.nextRunAt as string } : {}) } } : {}),
    ...(positions ? { positionManagement: { ...(optionalString(positions.readiness) ? { readiness: positions.readiness as string } : {}), ...(optionalString(positions.status) ? { status: positions.status as string } : {}) } } : {}),
    ...(stream ? { marketStream: { ...(optionalString(stream.status) ? { status: stream.status as string } : {}) } } : {}),
  };
}
