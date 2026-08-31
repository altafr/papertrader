import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramMiniAppAuthResult = { readonly userId: string } | { readonly error: "missing" | "invalid" | "expired" | "unauthorized" };

/** Validate Telegram Web App initData without exposing the bot token to the browser. */
export function validateTelegramMiniAppInitData(initData: string | undefined, botToken: string, allowedUserId: string, now = Date.now(), maxAgeSeconds = 86_400): TelegramMiniAppAuthResult {
  if (!initData?.trim() || !botToken.trim() || !allowedUserId.trim()) return { error: "missing" };
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash) || !Number.isSafeInteger(authDate)) return { error: "invalid" };
  const age = Math.floor(now / 1_000) - authDate;
  if (age < -60 || age > maxAgeSeconds) return { error: "expired" };
  params.delete("hash");
  const dataCheckString = [...params.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  const received = Buffer.from(receivedHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return { error: "invalid" };
  let userId: string | undefined;
  try {
    const user = JSON.parse(params.get("user") ?? "null") as { readonly id?: unknown };
    userId = typeof user.id === "number" && Number.isSafeInteger(user.id) ? String(user.id) : typeof user.id === "string" && /^\d{1,32}$/.test(user.id) ? user.id : undefined;
  } catch {
    return { error: "invalid" };
  }
  return userId === allowedUserId ? { userId } : { error: "unauthorized" };
}
