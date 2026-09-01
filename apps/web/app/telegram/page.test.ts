import { describe, expect, it } from "vitest";

import { getMiniAppErrorMessage, getMiniAppFreshness, isMiniAppData } from "./page";

describe("Telegram Mini App error messages", () => {
  it("turns disabled backend state into an actionable setup message", () => {
    expect(getMiniAppErrorMessage(503, "telegram_mini_app_disabled")).toContain("API Telegram variables");
  });

  it("keeps unauthorized sessions explicit", () => {
    expect(getMiniAppErrorMessage(401, "unauthorized")).toContain("not authorized");
  });

  it("handles an empty read model without implying a broker failure", () => {
    expect(getMiniAppErrorMessage(404, "read_model_not_available")).toContain("reconciled snapshot");
  });

  it("rejects malformed portfolio responses before rendering", () => {
    expect(isMiniAppData({ portfolio: {}, alerts: [] })).toBe(false);
  });

  it("classifies snapshot freshness with a bounded tolerance", () => {
    const now = Date.parse("2026-09-01T00:00:00.000Z");
    expect(getMiniAppFreshness("2026-08-31T23:55:01.000Z", now)).toBe("fresh");
    expect(getMiniAppFreshness("2026-08-31T23:54:59.000Z", now)).toBe("stale");
    expect(getMiniAppFreshness("invalid", now)).toBe("unknown");
  });
});
