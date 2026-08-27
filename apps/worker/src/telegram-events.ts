import { getTelegramNotificationConfig, sendTelegramAlert, type TelegramAlert } from "@momentum/notifications";

export type RuntimeAlert = Omit<TelegramAlert, "occurredAt"> & { readonly occurredAt?: string };

/** Best-effort operational alerting; notification failure never changes trading state. */
export function createRuntimeAlertNotifier(environment: NodeJS.ProcessEnv = process.env) {
  const config = getTelegramNotificationConfig(environment);
  return {
    config,
    notify(alert: RuntimeAlert): void {
      void sendTelegramAlert(config, { ...alert, occurredAt: alert.occurredAt ?? new Date().toISOString() }).catch(() => undefined);
    },
  };
}
