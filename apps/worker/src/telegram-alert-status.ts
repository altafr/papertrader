export type TelegramAlertStatusInput = {
  readonly counts: Readonly<Record<string, number>>;
  readonly latest?: { readonly attempts: number; readonly code: string; readonly deliveryStatus: string; readonly occurredAt: string };
};

function validTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

/** Build a bounded, credential-free Telegram outbox status result. */
export function buildTelegramAlertStatus(input: TelegramAlertStatusInput) {
  const counts = Object.fromEntries(Object.entries(input.counts).filter(([key, value]) => /^[a-z_]{1,64}$/.test(key) && Number.isSafeInteger(value) && value >= 0).sort(([left], [right]) => left.localeCompare(right)).slice(0, 10));
  if (!input.latest) return { counts, latest: null } as const;
  if (!Number.isSafeInteger(input.latest.attempts) || input.latest.attempts < 0 || input.latest.attempts > 1_000 || !/^[a-z_]{1,64}$/.test(input.latest.code) || !/^[a-z_]{1,32}$/.test(input.latest.deliveryStatus) || !validTimestamp(input.latest.occurredAt)) throw new Error("telegram_alert_status_invalid_latest");
  return { counts, latest: { attempts: input.latest.attempts, code: input.latest.code, deliveryStatus: input.latest.deliveryStatus, occurredAt: input.latest.occurredAt } } as const;
}
