import { createHmac } from "node:crypto";
import { fileURLToPath } from "node:url";

export function buildTelegramInitData(botToken: string, userId: string, now = Math.floor(Date.now() / 1000)): string {
  const params = new URLSearchParams({ auth_date: String(now), query_id: "operator-smoke-test", user: JSON.stringify({ id: Number(userId), first_name: "Operator" }) });
  const checkString = [...params.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  params.set("hash", createHmac("sha256", secret).update(checkString).digest("hex"));
  return params.toString();
}

export async function verifyTelegramMiniApp(fetcher: typeof fetch, apiUrl: string, botToken: string, userId: string, now = Math.floor(Date.now() / 1000), workerHealthUrl?: string) {
  const response = await fetcher(`${apiUrl.replace(/\/$/, "")}/v1/telegram-mini-app`, { headers: { "x-telegram-init-data": buildTelegramInitData(botToken, userId, now) } });
  const body = await response.json() as { readonly portfolio?: { readonly positions?: readonly unknown[]; readonly orders?: readonly unknown[]; readonly metrics?: Record<string, unknown> }; readonly alerts?: readonly unknown[]; readonly unmanagedPositions?: readonly unknown[] };
  if (!response.ok || !body.portfolio) throw new Error(`telegram_mini_app_verification_failed:${response.status}`);
  const unmanagedPositions = body.unmanagedPositions?.length ?? 0;
  if (!workerHealthUrl) return { status: response.status, positions: body.portfolio.positions?.length ?? 0, orders: body.portfolio.orders?.length ?? 0, alerts: body.alerts?.length ?? 0, unmanagedPositions, metricKeys: Object.keys(body.portfolio.metrics ?? {}) };
  const workerResponse = await fetcher(workerHealthUrl);
  const workerBody = await workerResponse.json() as { readonly positionManagement?: { readonly unmanagedCount?: unknown } };
  const workerUnmanagedPositions = workerBody.positionManagement?.unmanagedCount;
  if (!workerResponse.ok || typeof workerUnmanagedPositions !== "number" || !Number.isSafeInteger(workerUnmanagedPositions) || workerUnmanagedPositions !== unmanagedPositions) throw new Error("telegram_mini_app_worker_consistency_failed");
  return { status: response.status, positions: body.portfolio.positions?.length ?? 0, orders: body.portfolio.orders?.length ?? 0, alerts: body.alerts?.length ?? 0, unmanagedPositions, workerUnmanagedPositions, surfaceConsistency: "matched" as const, metricKeys: Object.keys(body.portfolio.metrics ?? {}) };
}

export async function main() {
  const apiUrl = process.env.PAPERTRADER_API_URL?.trim();
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const userId = process.env.TELEGRAM_MINI_APP_USER_ID?.trim();
  if (!apiUrl || !botToken || !userId) throw new Error("PAPERTRADER_API_URL, TELEGRAM_BOT_TOKEN, and TELEGRAM_MINI_APP_USER_ID are required.");
  console.log(JSON.stringify(await verifyTelegramMiniApp(fetch, apiUrl, botToken, userId, undefined, process.env.PAPERTRADER_WORKER_HEALTH_URL?.trim())));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "telegram_mini_app_verification_failed"); process.exitCode = 1; });
