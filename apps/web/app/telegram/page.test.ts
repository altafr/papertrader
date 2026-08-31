import { describe, expect, it } from "vitest";

import { getMiniAppErrorMessage } from "./page";

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
});
