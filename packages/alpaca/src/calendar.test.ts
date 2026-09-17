import { describe, expect, it, vi } from "vitest";
import { createPaperCalendarReader } from "./calendar.js";

describe("paper calendar", () => {
  it("reads a bounded trading day and treats holidays as an empty session", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("[]"));
    expect(await createPaperCalendarReader({ apiKey: "test", secretKey: "test", fetchImpl })("2026-12-25")).toBeUndefined();
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://paper-api.alpaca.markets/v2/calendar?start=2026-12-25&end=2026-12-25");
  });
  it("fails closed on malformed or failed calendar data", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('[{"date":"2026-09-17","open":"bad","close":"16:00"}]'));
    await expect(createPaperCalendarReader({ apiKey: "test", secretKey: "test", fetchImpl })("2026-09-17")).rejects.toThrow();
    expect(() => createPaperCalendarReader({ apiKey: "test", secretKey: "test", baseUrl: "https://api.alpaca.markets" })).toThrow("Paper calendar");
  });
});
