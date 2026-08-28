export type MarketCloseSummaryEvent = { readonly code: string; readonly deliveryStatus: string; readonly occurredAt: string; readonly dedupeKey: string };

function isCloseHour(value: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const parts = new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: "America/New_York", weekday: "short" }).formatToParts(date);
  return ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(parts.find((part) => part.type === "weekday")?.value ?? "") && Number(parts.find((part) => part.type === "hour")?.value) === 16;
}

export function assessMarketCloseSummaryVerification(events: readonly MarketCloseSummaryEvent[]) {
  const candidates = events.filter((event) => event.code === "daily_portfolio_summary" && event.dedupeKey.startsWith("daily_portfolio_summary:market_close:"));
  const delivered = candidates.filter((event) => event.deliveryStatus === "sent" && isCloseHour(event.occurredAt));
  return delivered.length > 0 ? { status: "verified" as const, eventCount: delivered.length, latestOccurredAt: delivered[0]?.occurredAt } : { status: "blocked" as const, eventCount: 0, blockedReasons: ["market_close_summary_event_unavailable"] };
}
