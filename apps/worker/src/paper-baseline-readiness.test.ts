import { describe, expect, it } from "vitest";
import { classifyPaperBaseline } from "./paper-baseline-readiness.js";

describe("classifyPaperBaseline", () => {
  it("does not expose or infer a baseline when equity is unavailable", () => {
    expect(classifyPaperBaseline(undefined)).toBe("unavailable");
  });

  it("classifies a verified paper baseline", () => {
    expect(classifyPaperBaseline("100000.50")).toBe("within_tolerance");
  });

  it("classifies an unverified paper baseline", () => {
    expect(classifyPaperBaseline("1000")).toBe("outside_tolerance");
  });
});
