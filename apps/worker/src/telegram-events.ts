import { getTelegramNotificationConfig, sendTelegramAlert, type TelegramAlert } from "@momentum/notifications";

export interface RuntimeAlertPersistence {
  enqueue(input: { readonly code: string; readonly dedupeKey: string; readonly message: string; readonly occurredAt: Date; readonly severity: "critical" | "info" | "warning" }): Promise<{ readonly eventId: string } | undefined>;
  markFailed(eventId: string, errorCode: string): Promise<unknown>;
  markSent(eventId: string): Promise<unknown>;
  listRetryable?(limit?: number, maxAttempts?: number): Promise<readonly { readonly code: string; readonly eventId: string; readonly message: string; readonly occurredAt: Date; readonly severity: "critical" | "info" | "warning" }[]>;
  hasRecent?(code: string, dedupeKeyPrefix: string, since: Date): Promise<boolean>;
}

export type RuntimeAlert = Omit<TelegramAlert, "occurredAt"> & { readonly cooldownKey?: string; readonly cooldownMs?: number; readonly occurredAt?: string; readonly dedupeKey?: string };

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
        if (persistence?.hasRecent && alert.cooldownKey && alert.cooldownMs && alert.cooldownMs > 0) {
          const occurredAtDate = new Date(occurredAt);
          if (await persistence.hasRecent(alert.code, alert.cooldownKey, new Date(occurredAtDate.getTime() - alert.cooldownMs))) return;
        }
        const event = persistence ? await persistence.enqueue({ code: alert.code, dedupeKey: alert.dedupeKey ?? `${alert.code}:${alert.message}`, message: alert.message, occurredAt: new Date(occurredAt), severity: alert.severity }) : undefined;
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
