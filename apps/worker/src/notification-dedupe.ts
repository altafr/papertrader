/** UTC calendar-day bucket used for low-noise operational digests. */
export function getUtcNotificationDay(occurredAt: Date = new Date()): string {
  return occurredAt.toISOString().slice(0, 10);
}

export function getDailyNotificationDedupeKey(code: string, scope: string, occurredAt: Date = new Date()): string {
  return `${code}:${scope}:${getUtcNotificationDay(occurredAt)}`;
}
