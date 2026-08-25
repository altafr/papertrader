import { describe, expect, it } from "vitest";

import { isOperatorHistoryQueryError, normalizeOperatorHistoryDate } from "./operator-history.js";

describe("normalizeOperatorHistoryDate", () => {
  it("expands a date-only lower bound to the start of the UTC day", () => {
    expect(normalizeOperatorHistoryDate("2026-08-26", "from")).toBe("2026-08-26T00:00:00.000Z");
  });

  it("expands a date-only upper bound to the end of the UTC day", () => {
    expect(normalizeOperatorHistoryDate("2026-08-26", "to")).toBe("2026-08-26T23:59:59.999Z");
  });

  it("preserves an explicit instant", () => {
    expect(normalizeOperatorHistoryDate("2026-08-26T12:30:00.000Z", "to")).toBe("2026-08-26T12:30:00.000Z");
  });

  it("recognizes only bounded query validation errors", () => {
    expect(isOperatorHistoryQueryError(new Error("invalid_operator_history_range"))).toBe(true);
    expect(isOperatorHistoryQueryError(new Error("database_unavailable"))).toBe(false);
    expect(isOperatorHistoryQueryError("invalid_operator_history_range")).toBe(false);
  });
});
