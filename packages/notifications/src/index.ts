export const TELEGRAM_API_BASE_URL = "https://api.telegram.org";

export type TelegramAlertSeverity = "critical" | "info" | "warning";

export type TelegramAlert = {
  readonly code: string;
  readonly message: string;
  readonly occurredAt: string;
  readonly severity: TelegramAlertSeverity;
};

export type TelegramNotificationConfig = {
  readonly apiBaseUrl: typeof TELEGRAM_API_BASE_URL;
  readonly botToken: string;
  readonly chatId: string;
  readonly enabled: boolean;
};

export type TelegramNotificationReadiness = {
  readonly deliveryVerification: "unverified";
  readonly status: "disabled" | "blocked" | "ready";
  readonly checks: {
    readonly enabled: boolean;
    readonly botTokenConfigured: boolean;
    readonly chatIdConfigured: boolean;
    readonly botTokenFormatValid: boolean;
    readonly chatIdFormatValid: boolean;
  };
  readonly blockedReasons: readonly string[];
};

export type TelegramAlertTestReadiness = {
  readonly approvalReferencePresent: boolean;
  readonly configuration: TelegramNotificationReadiness;
  readonly status: "blocked" | "ready";
  readonly blockedReasons: readonly string[];
};

type TelegramFetch = (input: string, init?: RequestInit) => Promise<Response>;

const boundedField = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const chatIdPattern = /^-?[0-9]{1,32}$/;

function parseEnabled(environment: NodeJS.ProcessEnv): boolean {
  const raw = environment.TELEGRAM_ALERTS_ENABLED ?? "false";
  if (raw !== "true" && raw !== "false") throw new Error("TELEGRAM_ALERTS_ENABLED must be exactly true or false.");
  return raw === "true";
}

export function getTelegramNotificationReadiness(environment: NodeJS.ProcessEnv = process.env): TelegramNotificationReadiness {
  const rawEnabled = environment.TELEGRAM_ALERTS_ENABLED ?? "false";
  if (rawEnabled !== "true" && rawEnabled !== "false") {
    return {
      deliveryVerification: "unverified",
      status: "blocked",
      checks: { enabled: false, botTokenConfigured: false, chatIdConfigured: false, botTokenFormatValid: false, chatIdFormatValid: false },
      blockedReasons: ["telegram_alerts_flag_invalid"],
    };
  }
  const enabled = rawEnabled === "true";
  const botToken = environment.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  const chatId = environment.TELEGRAM_CHAT_ID?.trim() ?? "";
  const botTokenConfigured = botToken.length > 0;
  const chatIdConfigured = chatId.length > 0;
  const botTokenFormatValid = botTokenConfigured && boundedField.test(botToken);
  const chatIdFormatValid = chatIdConfigured && chatIdPattern.test(chatId);
  if (!enabled) {
    return { deliveryVerification: "unverified", status: "disabled", checks: { enabled, botTokenConfigured: false, chatIdConfigured: false, botTokenFormatValid: false, chatIdFormatValid: false }, blockedReasons: [] };
  }
  const blockedReasons = [
    ...(!botTokenConfigured ? ["telegram_bot_token_missing"] : []),
    ...(botTokenConfigured && !botTokenFormatValid ? ["telegram_bot_token_invalid"] : []),
    ...(!chatIdConfigured ? ["telegram_chat_id_missing"] : []),
    ...(chatIdConfigured && !chatIdFormatValid ? ["telegram_chat_id_invalid"] : []),
  ];
  return { deliveryVerification: "unverified", status: blockedReasons.length === 0 ? "ready" : "blocked", checks: { enabled, botTokenConfigured, chatIdConfigured, botTokenFormatValid, chatIdFormatValid }, blockedReasons };
}

export function getTelegramAlertTestReadiness(environment: NodeJS.ProcessEnv = process.env): TelegramAlertTestReadiness {
  const configuration = getTelegramNotificationReadiness(environment);
  const reference = environment.TELEGRAM_ALERT_TEST_APPROVAL_REFERENCE?.trim() ?? "";
  const approvalReferencePresent = boundedField.test(reference);
  const blockedReasons = [
    ...(approvalReferencePresent ? [] : ["telegram_alert_test_approval_reference_missing"]),
    ...(configuration.status === "ready" ? [] : ["telegram_alert_configuration_blocked"]),
  ];
  return { approvalReferencePresent, configuration, status: blockedReasons.length === 0 ? "ready" : "blocked", blockedReasons };
}

export function getTelegramNotificationConfig(environment: NodeJS.ProcessEnv = process.env): TelegramNotificationConfig {
  const enabled = parseEnabled(environment);
  if (!enabled) return { apiBaseUrl: TELEGRAM_API_BASE_URL, botToken: "", chatId: "", enabled: false };
  const botToken = environment.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = environment.TELEGRAM_CHAT_ID?.trim();
  if (!botToken || !chatId) throw new Error("TELEGRAM_ALERTS_ENABLED=true requires Telegram bot token and chat ID in server secret storage.");
  if (!boundedField.test(botToken)) throw new Error("TELEGRAM_BOT_TOKEN has an invalid format.");
  if (!chatIdPattern.test(chatId)) throw new Error("TELEGRAM_CHAT_ID must be a numeric Telegram chat ID.");
  return { apiBaseUrl: TELEGRAM_API_BASE_URL, botToken, chatId, enabled: true };
}

function redactAlertText(value: string): string {
  return value
    .replace(/(bot[_ -]?token|api[_ -]?key|secret[_ -]?key|authorization)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/\b\d{6,12}:[A-Za-z0-9_-]{20,}\b/g, "[bot token redacted]")
    .replace(/https?:\/\/[^\s]+/gi, "[url redacted]");
}

export function formatTelegramAlert(alert: TelegramAlert): string {
  if (!boundedField.test(alert.code)) throw new Error("Telegram alert code has an invalid format.");
  if (!( ["critical", "info", "warning"] as const).includes(alert.severity)) throw new Error("Telegram alert severity is invalid.");
  if (!Number.isFinite(Date.parse(alert.occurredAt))) throw new Error("Telegram alert timestamp is invalid.");
  const message = redactAlertText(alert.message.trim());
  if (!message) throw new Error("Telegram alert message is required.");
  const prefix = alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️";
  const formatted = `${prefix} Momentum Autopilot\nSeverity: ${alert.severity}\nCode: ${alert.code}\nAt: ${alert.occurredAt}\n\n${message}`;
  return formatted.length <= 4096 ? formatted : `${formatted.slice(0, 4078)}… [truncated]`;
}

export async function sendTelegramAlert(config: TelegramNotificationConfig, alert: TelegramAlert, fetchImpl: TelegramFetch = fetch): Promise<void> {
  if (!config.enabled) return;
  const response = await fetchImpl(`${config.apiBaseUrl}/bot${config.botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: config.chatId, disable_web_page_preview: true, text: formatTelegramAlert(alert) }),
  });
  if (!response.ok) throw new Error("Telegram alert delivery failed.");
  // HTTP 2xx alone is not sufficient: Telegram can return a JSON-level
  // failure while the transport remains successful. Keep the provider body
  // out of logs and expose only a generic failure to callers.
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("Telegram alert delivery failed.");
  }
  if (!body || typeof body !== "object" || (body as { ok?: unknown }).ok !== true) {
    throw new Error("Telegram alert delivery failed.");
  }
}
