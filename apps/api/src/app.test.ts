import { afterEach, describe, expect, it, vi } from "vitest";

import { getApiHealth } from "./app.js";

describe("API health release identity", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("prefers an explicitly managed release identity", () => {
    vi.stubEnv("PAPERTRADER_RELEASE", "managed-release");
    vi.stubEnv("RAILWAY_GIT_COMMIT_SHA", "railway-release");
    expect(getApiHealth()).toMatchObject({ release: "managed-release" });
  });
  it("reports a bounded Railway commit identifier when supplied", () => {
    vi.stubEnv("RAILWAY_GIT_COMMIT_SHA", "release-2026.08.29");
    vi.stubEnv("GIT_COMMIT_SHA", "fallback");
    expect(getApiHealth(new Date("2026-08-29T01:00:00.000Z"))).toMatchObject({ release: "release-2026.08.29", service: "api", status: "healthy" });
  });

  it("omits malformed release values", () => {
    vi.stubEnv("RAILWAY_GIT_COMMIT_SHA", "release with spaces");
    vi.stubEnv("GIT_COMMIT_SHA", "also invalid!");
    expect(getApiHealth()).not.toHaveProperty("release");
  });

  it("reports only non-secret Mini App configuration state", () => {
    vi.stubEnv("TELEGRAM_MINI_APP_ENABLED", "true");
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "server-only-token");
    vi.stubEnv("TELEGRAM_MINI_APP_USER_ID", "12345");
    vi.stubEnv("TELEGRAM_MINI_APP_ORIGIN", "https://papertrader-web.vercel.app");
    expect(getApiHealth().telegramMiniApp).toEqual({ enabled: true, configured: true });
    expect(JSON.stringify(getApiHealth())).not.toContain("server-only-token");
  });
});
