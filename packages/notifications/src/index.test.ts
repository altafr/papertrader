import { describe, expect, it, vi } from "vitest";

import { formatTelegramAlert, getTelegramAlertTestReadiness, getTelegramNotificationConfig, getTelegramNotificationReadiness, sendTelegramAlert, type TelegramAlertSeverity } from "./index.js";

describe("Telegram notifications", () => {
  it("defaults disabled without reading or returning credentials", () => {
    expect(getTelegramNotificationConfig({})).toEqual({ apiBaseUrl: "https://api.telegram.org", botToken: "", chatId: "", enabled: false });
  });
  it("requires a bounded server-side configuration when enabled", () => {
    expect(() => getTelegramNotificationConfig({ TELEGRAM_ALERTS_ENABLED: "true" })).toThrow(/bot token and chat ID/);
    expect(getTelegramNotificationConfig({ TELEGRAM_ALERTS_ENABLED: "true", TELEGRAM_BOT_TOKEN: "123456:ABC_def-123", TELEGRAM_CHAT_ID: "-1001234567890" }).enabled).toBe(true);
  });
  it("reports safe readiness without returning secret values", () => {
    expect(getTelegramNotificationReadiness({})).toMatchObject({ deliveryVerification: "unverified", status: "disabled", blockedReasons: [] });
    expect(getTelegramNotificationReadiness({ TELEGRAM_ALERTS_ENABLED: "true" })).toMatchObject({ deliveryVerification: "unverified", status: "blocked", blockedReasons: ["telegram_bot_token_missing", "telegram_chat_id_missing"] });
    expect(getTelegramNotificationReadiness({ TELEGRAM_ALERTS_ENABLED: "true", TELEGRAM_BOT_TOKEN: "123456:ABC_def-123", TELEGRAM_CHAT_ID: "-1001234567890" })).toMatchObject({ deliveryVerification: "unverified", status: "ready", blockedReasons: [] });
    expect(getTelegramNotificationReadiness({ TELEGRAM_ALERTS_ENABLED: "maybe", TELEGRAM_BOT_TOKEN: "secret", TELEGRAM_CHAT_ID: "123" })).toMatchObject({ status: "blocked", blockedReasons: ["telegram_alerts_flag_invalid"] });
  });
  it("preflights the guarded channel test without contacting Telegram", () => {
    expect(getTelegramAlertTestReadiness({ TELEGRAM_ALERTS_ENABLED: "true", TELEGRAM_BOT_TOKEN: "123456:ABC_def-123", TELEGRAM_CHAT_ID: "-1001234567890" })).toMatchObject({ status: "blocked", blockedReasons: ["telegram_alert_test_approval_reference_missing"] });
    expect(getTelegramAlertTestReadiness({ TELEGRAM_ALERTS_ENABLED: "true", TELEGRAM_BOT_TOKEN: "123456:ABC_def-123", TELEGRAM_CHAT_ID: "-1001234567890", TELEGRAM_ALERT_TEST_APPROVAL_REFERENCE: "telegram-review-123" })).toMatchObject({ status: "ready", approvalReferencePresent: true });
  });
  it("formats and redacts alert content", () => {
    const value = formatTelegramAlert({ code: "stale_data", message: "api_key=hidden 123456:ABCDEFGHIJKLMNOPQRSTUVWXYZ_1234567890 https://example.test", occurredAt: "2026-08-24T00:00:00.000Z", severity: "critical" });
    expect(value).toContain("[redacted]");
    expect(value).toContain("[url redacted]");
    expect(value).not.toContain("hidden");
    expect(value).not.toContain("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });

  it("rejects invalid severities at the formatting boundary", () => {
    expect(() => formatTelegramAlert({ code: "test", message: "Test", occurredAt: "2026-08-24T00:00:00.000Z", severity: "debug" as TelegramAlertSeverity })).toThrow("severity");
  });
  it("posts one bounded message through the injected transport", async () => {
    const fetchImpl = vi.fn(async (input: string, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200, headers: { "content-type": "application/json" } });
    });
    await sendTelegramAlert({ apiBaseUrl: "https://api.telegram.org", botToken: "123456:ABC_def-123", chatId: "123", enabled: true }, { code: "telegram_test", message: "Test", occurredAt: "2026-08-24T00:00:00.000Z", severity: "info" }, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe("https://api.telegram.org/bot123456:ABC_def-123/sendMessage");
    expect(JSON.parse(String(init?.body))).toMatchObject({ chat_id: "123", disable_web_page_preview: true });
  });

  it("rejects a provider-level failure returned with HTTP 200", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: false, error_code: 400 }), { status: 200 }));
    await expect(sendTelegramAlert({ apiBaseUrl: "https://api.telegram.org", botToken: "123456:ABC_def-123", chatId: "123", enabled: true }, { code: "telegram_test", message: "Test", occurredAt: "2026-08-24T00:00:00.000Z", severity: "info" }, fetchImpl)).rejects.toThrow("Telegram alert delivery failed.");
  });
});
