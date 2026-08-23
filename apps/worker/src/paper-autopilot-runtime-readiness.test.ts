import { describe, expect, it } from "vitest";

import { combinePaperAutopilotRuntimeReadiness, assessRuntimeReconciliation } from "./paper-autopilot-runtime-readiness.js";
import { getPaperAutopilotReadiness } from "./paper-autopilot-readiness.js";

describe("paper autopilot runtime readiness", () => {
  it("classifies missing, fresh, delayed, and stale reconciliation captures", () => {
    const now = new Date("2026-08-23T00:00:00.000Z");
    expect(assessRuntimeReconciliation(undefined, now)).toEqual({ status: "unavailable" });
    expect(assessRuntimeReconciliation("2026-08-21T22:00:00.000Z", now).status).toBe("fresh");
    expect(assessRuntimeReconciliation("2026-08-21T00:00:00.000Z", now).status).toBe("delayed");
    expect(assessRuntimeReconciliation("2026-08-20T00:00:00.000Z", now).status).toBe("stale");
  });

  it("does not turn disabled configuration into a ready runtime", () => {
    const result = combinePaperAutopilotRuntimeReadiness(getPaperAutopilotReadiness({}), assessRuntimeReconciliation("2026-08-23T00:00:00.000Z", new Date("2026-08-23T00:00:00.000Z")));
    expect(result.status).toBe("disabled");
    expect(result.blockedReasons).toEqual([]);
  });
});
