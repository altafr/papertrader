import { describe, expect, it } from "vitest";

import { getWorkerHealth } from "./app.js";

describe("worker health", () => {
  it("reports external integrations as disabled", () => {
    const now = new Date("2026-08-21T00:00:00.000Z");

    expect(getWorkerHealth(now, {})).toEqual({
      alpaca: "not_configured",
      asOf: "2026-08-21T00:00:00.000Z",
      database: "not_configured",
      durableScheduler: { enabled: false, status: "disabled" },
      shadowEvaluation: { enabled: false, intervalSeconds: 3600, sourceConfigured: false, status: "disabled" },
      service: "worker",
      status: "healthy",
    });
  });
});
