export type FreshnessState = "delayed" | "fresh" | "stale";

export function getFreshnessState(ageSeconds: number): FreshnessState {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0) return "stale";
  if (ageSeconds <= 300) return "fresh";
  if (ageSeconds <= 900) return "delayed";
  return "stale";
}

export function getFreshnessLabel(state: FreshnessState): string {
  if (state === "fresh") return "Fresh";
  if (state === "delayed") return "Delayed";
  return "Stale";
}

export function formatUtc(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return `${date.toISOString().replace("T", " ").replace(".000Z", " UTC")}`;
}
