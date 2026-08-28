export type TelegramAlertStatusInput = {
  readonly counts: Readonly<Record<string, number>>;
  readonly latest?: { readonly attempts: number; readonly code: string; readonly deliveryStatus: string; readonly occurredAt: string };
};

/** Build a bounded, credential-free Telegram outbox status result. */
export function buildTelegramAlertStatus(input: TelegramAlertStatusInput) {
  const counts = Object.fromEntries(Object.entries(input.counts).filter(([key, value]) => /^[a-z_]{1,64}$/.test(key) && Number.isSafeInteger(value) && value >= 0).slice(0, 10));
  return { counts, ...(input.latest ? { latest: { attempts: input.latest.attempts, code: input.latest.code.slice(0, 64), deliveryStatus: input.latest.deliveryStatus.slice(0, 32), occurredAt: input.latest.occurredAt } } : { latest: null }) } as const;
}
