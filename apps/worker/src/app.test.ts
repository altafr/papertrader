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
      researchSchedule: { enabled: false, handlerEnabled: false, status: "disabled" },
      shadowEvaluation: { enabled: false, intervalSeconds: 3600, sourceConfigured: false, status: "disabled" },
      service: "worker",
      status: "healthy",
    });
  });

  it("reports an enabled research schedule as blocked until every gate is explicit", () => {
    expect(getWorkerHealth(new Date("2026-08-21T00:00:00.000Z"), {
      RESEARCH_SCHEDULER_ENABLED: "true",
      ALPACA_PAPER_TRADE: "true",
      TRADING_MODE: "paper",
    }).researchSchedule).toEqual({ enabled: true, handlerEnabled: false, status: "blocked" });
  });
});
