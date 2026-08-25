export type OperatorHistoryBoundary = "from" | "to";

/**
 * Date inputs from the dashboard are calendar dates, not instants. Treat a
 * date-only lower bound as the start of its UTC day and an upper bound as the
 * final millisecond of that day so presets include the whole selected day.
 */
export function normalizeOperatorHistoryDate(value: string | null, boundary: OperatorHistoryBoundary): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return boundary === "from" ? `${value}T00:00:00.000Z` : `${value}T23:59:59.999Z`;
  return value;
}
