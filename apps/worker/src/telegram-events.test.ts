import { describe, expect, it, vi } from "vitest";
import { createRuntimeAlertNotifier } from "./telegram-events.js";

describe("runtime Telegram event notifier", () => {
  it("persists a deduplicated event before delivery", async () => {
    const enqueue = vi.fn(async () => ({ eventId: "event-1" }));
    const markSent = vi.fn(async () => undefined);
    const markFailed = vi.fn(async () => undefined);
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const original = globalThis.fetch;
    globalThis.fetch = fetchImpl as typeof fetch;
    try {
      const notifier = createRuntimeAlertNotifier({ TELEGRAM_ALERTS_ENABLED: "true", TELEGRAM_BOT_TOKEN: "123456:ABC_def-123", TELEGRAM_CHAT_ID: "123" }, { enqueue, markSent, markFailed });
      notifier.notify({ code: "paper_entry_submitted", message: "AAPL entered", severity: "info" });
      await vi.waitFor(() => expect(markSent).toHaveBeenCalledWith("event-1"));
      expect(enqueue).toHaveBeenCalledOnce();
      expect(markFailed).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = original;
    }
  });

  it("retries persisted pending events and marks successful delivery", async () => {
    const markSent = vi.fn(async () => undefined);
    const markFailed = vi.fn(async () => undefined);
    const listRetryable = vi.fn(async () => [{ code: "paper_entry_submitted", eventId: "event-2", message: "AAPL entered", occurredAt: new Date("2026-08-28T00:00:00.000Z"), severity: "info" as const }]);
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const original = globalThis.fetch;
    globalThis.fetch = fetchImpl as typeof fetch;
    try {
      const notifier = createRuntimeAlertNotifier({ TELEGRAM_ALERTS_ENABLED: "true", TELEGRAM_BOT_TOKEN: "123456:ABC_def-123", TELEGRAM_CHAT_ID: "123" }, { enqueue: vi.fn(), markSent, markFailed, listRetryable });
      await expect(notifier.retryPersisted()).resolves.toBe(1);
      expect(listRetryable).toHaveBeenCalledWith(20, 5);
      expect(markSent).toHaveBeenCalledWith("event-2");
      expect(markFailed).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = original;
    }
  });
});
