import { describe, expect, it } from "vitest";
import { assessMinimalSupervision } from "./paper-supervision.js";

const ready = { accountFresh: true, baselineVerified: true, globalKillSwitchActive: false, orderSubmissionEnabled: true, paperMode: true, positionManagementReady: true, researchScheduled: true, telegramReady: true, unmanagedPositions: 0, workerHealthy: true } as const;

describe("minimal supervision readiness", () => {
  it("is ready only when every paper-runtime gate passes", () => {
    expect(assessMinimalSupervision(ready)).toEqual({ blockedReasons: [], status: "ready" });
  });

  it("reports every blocking condition without weakening fail-closed gates", () => {
    expect(assessMinimalSupervision({ ...ready, accountFresh: false, globalKillSwitchActive: true, telegramReady: false, unmanagedPositions: 2, workerHealthy: false }).blockedReasons).toEqual(["global_kill_switch_active", "account_snapshot_stale", "worker_unhealthy", "telegram_alerts_not_ready", "unmanaged_positions_present"]);
  });

  it("rejects malformed unmanaged-position counts", () => {
    expect(assessMinimalSupervision({ ...ready, unmanagedPositions: 1.5 }).blockedReasons).toContain("unmanaged_position_count_invalid");
  });
});
