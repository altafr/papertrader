import { describe, expect, it, vi } from "vitest";

import { getApiHealth } from "./app.js";

describe("API health release identity", () => {
  it("reports a bounded Railway commit identifier when supplied", () => {
    vi.stubEnv("RAILWAY_GIT_COMMIT_SHA", "release-2026.08.29");
    vi.stubEnv("GIT_COMMIT_SHA", "fallback");
    expect(getApiHealth(new Date("2026-08-29T01:00:00.000Z"))).toMatchObject({ release: "release-2026.08.29", service: "api", status: "healthy" });
    vi.unstubAllEnvs();
  });

  it("omits malformed release values", () => {
    vi.stubEnv("RAILWAY_GIT_COMMIT_SHA", "release with spaces");
    vi.stubEnv("GIT_COMMIT_SHA", "also invalid!");
    expect(getApiHealth()).not.toHaveProperty("release");
    vi.unstubAllEnvs();
  });
});
