import { describe, expect, it } from "vitest";
import { getPaperAutopilotQuantity } from "./paper-quantity.js";

describe("paper quantity resolution", () => {
  it("uses per-asset overrides before the legacy global quantity", () => {
    const environment = { PAPER_AUTOPILOT_QUANTITY: "1", PAPER_AUTOPILOT_CRYPTO_QUANTITY: "0.01" };
    expect(getPaperAutopilotQuantity("crypto", environment)).toBe("0.01");
    expect(getPaperAutopilotQuantity("us_equity", environment)).toBe("1");
  });
  it("preserves the existing default when no quantity is configured", () => {
    expect(getPaperAutopilotQuantity("crypto", {})).toBe("1");
  });
  it("rejects malformed or non-positive quantities", () => {
    expect(() => getPaperAutopilotQuantity("crypto", { PAPER_AUTOPILOT_CRYPTO_QUANTITY: "0" })).toThrow("positive");
    expect(() => getPaperAutopilotQuantity("us_equity", { PAPER_AUTOPILOT_STOCK_QUANTITY: "1e2" })).toThrow("positive");
  });
});
