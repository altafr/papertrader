import { describe, expect, it } from "vitest";
import { getPaperAutopilotQuantity, getPaperAutopilotQuantityForCandidate } from "./paper-quantity.js";

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
    expect(() => getPaperAutopilotQuantity("us_equity", {}, "1e2")).toThrow("positive");
  });

  it("accepts large decimal quantities without binary-number overflow", () => {
    expect(getPaperAutopilotQuantity("crypto", {}, "999999999999999999999999.00000001")).toBe("999999999999999999999999.00000001");
  });
  it("rounds stock sizing down to the percentage cap", () => {
    expect(getPaperAutopilotQuantityForCandidate({ assetClass: "us_equity", marketSnapshot: { close: "100" } }, "100000", {})).toBe("100");
  });
  it("sizes an unconfigured crypto trade using eight-decimal precision", () => {
    expect(getPaperAutopilotQuantityForCandidate({ assetClass: "crypto", marketSnapshot: { close: "100000" } }, "100000", {})).toBe("0.10000000");
  });
});

const stock = { assetClass: "us_equity" as const, symbol: "AAA", marketSnapshot: { close: "100" } };
describe("portfolio allocation", () => {
  it("can deploy a below-baseline account without a fixed dollar floor", () => {
    expect(getPaperAutopilotQuantityForCandidate(stock, "97742.17", {})).toBe("97");
  });
  it("fills toward 75% and stops without forcing trades at the target", () => {
    expect(getPaperAutopilotQuantityForCandidate(stock, "100000", {}, undefined, { cash: "30000", positions: [{ symbol: "BBB", marketValue: "70000" }] })).toBe("50");
    expect(getPaperAutopilotQuantityForCandidate(stock, "100000", {}, undefined, { cash: "25000", positions: [{ symbol: "BBB", marketValue: "75000" }] })).toBe("0");
  });
  it("does not pyramid existing symbols or spend an insufficient remainder", () => {
    expect(getPaperAutopilotQuantityForCandidate(stock, "100000", {}, undefined, { cash: "90000", positions: [{ symbol: "AAA", marketValue: "10000" }] })).toBe("0");
    expect(getPaperAutopilotQuantityForCandidate(stock, "100000", {}, undefined, { cash: "1000", positions: [] })).toBe("0");
  });
  it("keeps shorts within their separate 5% position and 25% aggregate caps", () => {
    expect(getPaperAutopilotQuantityForCandidate({ ...stock, side: "short" }, "100000", {})).toBe("50");
    expect(getPaperAutopilotQuantityForCandidate({ ...stock, side: "short" }, "100000", {}, undefined, { cash: "120000", positions: [{ symbol: "BBB", marketValue: "-24000" }] })).toBe("0");
  });
  it("fails closed for malformed sizing data", () => {
    expect(() => getPaperAutopilotQuantityForCandidate(stock, "NaN", {})).toThrow();
    expect(() => getPaperAutopilotQuantityForCandidate({ ...stock, marketSnapshot: { close: "Infinity" } }, "100000", {})).toThrow();
  });
});
