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

type TelegramFetch = (input: string, init?: RequestInit) => Promise<Response>;

const boundedField = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const chatIdPattern = /^-?[0-9]{1,32}$/;

function parseEnabled(environment: NodeJS.ProcessEnv): boolean {
  const raw = environment.TELEGRAM_ALERTS_ENABLED ?? "false";
  if (raw !== "true" && raw !== "false") throw new Error("TELEGRAM_ALERTS_ENABLED must be exactly true or false.");
  return raw === "true";
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
}
