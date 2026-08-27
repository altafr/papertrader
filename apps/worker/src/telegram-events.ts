import { getTelegramNotificationConfig, sendTelegramAlert, type TelegramAlert } from "@momentum/notifications";

export interface RuntimeAlertPersistence {
  enqueue(input: { readonly code: string; readonly dedupeKey: string; readonly message: string; readonly occurredAt: Date; readonly severity: "critical" | "info" | "warning" }): Promise<{ readonly eventId: string } | undefined>;
  markFailed(eventId: string, errorCode: string): Promise<unknown>;
  markSent(eventId: string): Promise<unknown>;
}

export type RuntimeAlert = Omit<TelegramAlert, "occurredAt"> & { readonly occurredAt?: string; readonly dedupeKey?: string };

/** Best-effort operational alerting; notification failure never changes trading state. */
export function createRuntimeAlertNotifier(environment: NodeJS.ProcessEnv = process.env, persistence?: RuntimeAlertPersistence) {
  const config = getTelegramNotificationConfig(environment);
  return {
    config,
    notify(alert: RuntimeAlert): Promise<void> {
      const occurredAt = alert.occurredAt ?? new Date().toISOString();
      return (async () => {
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
