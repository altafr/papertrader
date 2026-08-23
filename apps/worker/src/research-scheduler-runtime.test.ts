import { describe, expect, it } from "vitest";

import { createResearchSchedulerFromEnvironment } from "./research-scheduler-runtime.js";

describe("research scheduler startup composition", () => {
  it("does not construct external clients when the schedule is disabled", () => {
    expect(createResearchSchedulerFromEnvironment({})).toBeUndefined();
  });

  it("fails closed before constructing database or broker clients when readiness is incomplete", () => {
    expect(() => createResearchSchedulerFromEnvironment({ RESEARCH_HANDLER_ENABLED: "true", RESEARCH_SCHEDULER_ENABLED: "true" })).toThrow("research readiness");
  });
});
