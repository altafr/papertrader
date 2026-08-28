import { describe, expect, it } from "vitest";

import { buildTelegramAlertStatus } from "./telegram-alert-status.js";

describe("Telegram alert status", () => {
  it("returns bounded delivery counts and latest metadata without message content", () => {
    expect(buildTelegramAlertStatus({ counts: { failed: 1, sent: 3, "unsafe-key": 9 }, latest: { attempts: 1, code: "daily_portfolio_summary", deliveryStatus: "sent", occurredAt: "2026-08-29T00:00:00.000Z" } })).toEqual({ counts: { failed: 1, sent: 3 }, latest: { attempts: 1, code: "daily_portfolio_summary", deliveryStatus: "sent", occurredAt: "2026-08-29T00:00:00.000Z" } });
  });

  it("reports an empty outbox without inventing an event", () => {
    expect(buildTelegramAlertStatus({ counts: {} })).toEqual({ counts: {}, latest: null });
  });
});
