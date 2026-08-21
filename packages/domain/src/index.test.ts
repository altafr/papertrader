import { describe, expect, it } from "vitest";

import { FOUNDATION_STATUS, OPERATING_MODES } from "./index.js";

describe("foundation contracts", () => {
  it("keeps the initial operating mode read-only", () => {
    expect(OPERATING_MODES.observe).toBe("Observe");
    expect(FOUNDATION_STATUS.health).toBe("healthy");
  });
});
