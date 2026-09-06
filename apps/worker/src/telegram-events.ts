import { getTelegramNotificationConfig, sendTelegramAlert, type TelegramAlert } from "@momentum/notifications";

export interface RuntimeAlertPersistence {
  enqueue(input: { readonly code: string; readonly dedupeKey: string; readonly message: string; readonly occurredAt: Date; readonly severity: "critical" | "info" | "warning" }): Promise<{ readonly eventId: string } | undefined>;
  markFailed(eventId: string, errorCode: string): Promise<unknown>;
  markSent(eventId: string): Promise<unknown>;
  listRetryable?(limit?: number, maxAttempts?: number): Promise<readonly { readonly code: string; readonly eventId: string; readonly message: string; readonly occurredAt: Date; readonly severity: "critical" | "info" | "warning" }[]>;
  hasRecent?(code: string, dedupeKeyPrefix: string, since: Date): Promise<boolean>;
}

export type RuntimeAlert = Omit<TelegramAlert, "occurredAt"> & { readonly cooldownKey?: string; readonly cooldownMs?: number; readonly occurredAt?: string; readonly dedupeKey?: string };

const DEFAULT_ERROR_COOLDOWN_MS = 86_400_000;

/** Error-like events are operator-important but should not become a per-tick notification stream. */
export function isRepeatedErrorAlertCode(code: string): boolean {
  return /(?:^|_)(?:failed|error|unavailable|stale|disconnected)(?:$|_)/i.test(code);
}

/**
 * Build a deterministic persistence key for an error cooldown window.  Callers
 * often include a changing request/run ID in their diagnostic key; that must
 * never be allowed to turn one incident into an unbounded Telegram stream.
 */
export function getStableErrorDedupeKey(code: string, occurredAt: string, cooldownMs = DEFAULT_ERROR_COOLDOWN_MS): string | undefined {
  if (!isRepeatedErrorAlertCode(code) || !Number.isFinite(cooldownMs) || cooldownMs <= 0) return undefined;
  const timestamp = Date.parse(occurredAt);
  if (!Number.isFinite(timestamp)) return undefined;
  return `${code}:${Math.floor(timestamp / cooldownMs)}`;
}

/** Best-effort operational alerting; notification failure never changes trading state. */
export function createRuntimeAlertNotifier(environment: NodeJS.ProcessEnv = process.env, persistence?: RuntimeAlertPersistence) {
  const config = getTelegramNotificationConfig(environment);
  return {
    config,
    async retryPersisted(limit = 20, maxAttempts = 5): Promise<number> {
      if (!persistence?.listRetryable || !config.enabled) return 0;
      const events = await persistence.listRetryable(limit, maxAttempts);
      let delivered = 0;
      for (const event of events) {
        try {
          await sendTelegramAlert(config, { code: event.code, message: event.message, occurredAt: event.occurredAt.toISOString(), severity: event.severity });
          await persistence.markSent(event.eventId);
          delivered += 1;
        } catch {
          await persistence.markFailed(event.eventId, "telegram_delivery_retry_failed");
        }
      }
      return delivered;
    },
    notify(alert: RuntimeAlert): Promise<void> {
      const occurredAt = alert.occurredAt ?? new Date().toISOString();
      return (async () => {
        if (!config.enabled) return;
        const effectiveCooldownKey = alert.cooldownKey ?? (isRepeatedErrorAlertCode(alert.code) ? alert.code : undefined);
        const effectiveCooldownMs = alert.cooldownMs ?? (effectiveCooldownKey ? DEFAULT_ERROR_COOLDOWN_MS : undefined);
        if (persistence?.hasRecent && effectiveCooldownKey && effectiveCooldownMs && effectiveCooldownMs > 0) {
          const occurredAtDate = new Date(occurredAt);
          if (await persistence.hasRecent(alert.code, effectiveCooldownKey, new Date(occurredAtDate.getTime() - effectiveCooldownMs))) return;
        }
        const stableErrorDedupeKey = !alert.cooldownKey && effectiveCooldownMs ? getStableErrorDedupeKey(alert.code, occurredAt, effectiveCooldownMs) : undefined;
        const dedupeKey = stableErrorDedupeKey ?? alert.dedupeKey ?? `${alert.code}:${alert.message}`;
        const event = persistence ? await persistence.enqueue({ code: alert.code, dedupeKey, message: alert.message, occurredAt: new Date(occurredAt), severity: alert.severity }) : undefined;
        if (persistence && !event) return;
        try {
          await sendTelegramAlert(config, { ...alert, occurredAt });
          if (event) await persistence?.markSent(event.eventId);
        } catch {
          if (event) await persistence?.markFailed(event.eventId, "telegram_delivery_failed");
        }
      })().catch(() => undefined);
    },
  };
}
