import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { validateTelegramMiniAppInitData } from "./telegram-mini-app-auth.js";

function signedInitData(botToken: string, userId = "12345", authDate = 1_700_000_000) {
  const data = new URLSearchParams({ auth_date: String(authDate), query_id: "AA", user: JSON.stringify({ id: Number(userId), first_name: "Operator" }) });
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update([...data.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n")).digest("hex");
  data.set("hash", hash);
  return data.toString();
}

describe("Telegram Mini App authentication", () => {
  it("accepts a valid signed operator initData", () => {
    expect(validateTelegramMiniAppInitData(signedInitData("bot-secret"), "bot-secret", "12345", 1_700_000_030_000)).toEqual({ userId: "12345" });
  });

  it("rejects tampered, expired, and non-operator initData", () => {
    const valid = signedInitData("bot-secret");
    expect(validateTelegramMiniAppInitData(`${valid.slice(0, -1)}x`, "bot-secret", "12345", 1_700_000_030_000)).toEqual({ error: "invalid" });
    expect(validateTelegramMiniAppInitData(valid, "bot-secret", "12345", 1_700_100_000_000)).toEqual({ error: "expired" });
    expect(validateTelegramMiniAppInitData(signedInitData("bot-secret", "999"), "bot-secret", "12345", 1_700_000_030_000)).toEqual({ error: "unauthorized" });
  });
});
