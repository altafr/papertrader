/** Versioned, display-only evidence summary. Never an order or strategy input. */
export interface OvernightReport {
  readonly schemaVersion: "1";
  readonly id: string;
  readonly title: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly generatedAt: string;
  readonly timezone: "Asia/Hong_Kong";
  readonly source: string;
  readonly headline: string;
  readonly summary: string;
  readonly processes: readonly { readonly name: string; readonly activity: string; readonly decision: string }[];
  readonly snapshot: readonly string[];
  readonly trades: readonly string[];
  readonly concerns: readonly string[];
  readonly limitations: readonly string[];
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.length <= 4000;
const texts = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 100 && value.every(text);
const instant = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));

export function isOvernightReport(value: unknown): value is OvernightReport {
  return record(value) && value.schemaVersion === "1" && value.timezone === "Asia/Hong_Kong"
    && [value.id, value.title, value.source, value.headline, value.summary].every(text)
    && instant(value.periodStart) && instant(value.periodEnd) && instant(value.generatedAt)
    && Date.parse(value.periodStart) < Date.parse(value.periodEnd)
    && Array.isArray(value.processes) && value.processes.length <= 100
    && value.processes.every((row: unknown) => record(row) && [row.name, row.activity, row.decision].every(text))
    && texts(value.snapshot) && texts(value.trades) && texts(value.concerns) && texts(value.limitations);
}

/** Latest completed 18:00–09:00 Hong Kong window (Hong Kong has no DST). */
export function getOvernightWindow(now = new Date()) {
  if (!Number.isFinite(now.getTime())) throw new Error("Invalid report time.");
  const end = new Date(now);
  end.setUTCHours(1, 0, 0, 0);
  if (end > now) end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end.getTime() - 15 * 60 * 60 * 1000);
  return { id: `overnight:${end.toISOString().slice(0, 10)}`, start, end };
}
