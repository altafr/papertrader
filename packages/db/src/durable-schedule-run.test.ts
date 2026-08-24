import { describe, expect, it } from "vitest";

import type { Database } from "./client.js";
import { createDurableScheduleRunRepository } from "./repository.js";

describe("durable schedule run repository", () => {
  it("records a running run and transitions it to completed", async () => {
    const stored = new Map<string, Record<string, unknown>>();
    const database = {
      insert: () => ({ values: (value: Record<string, unknown>) => ({ returning: async () => { stored.set(String(value.runId), value); return [value]; } }) }),
      update: () => ({ set: (value: Record<string, unknown>) => ({ where: () => ({ returning: async () => { const row = stored.get("daily-2026-08-25"); if (!row) return []; Object.assign(row, value); return [row]; } }) }) }),
      select: () => ({ from: () => ({ orderBy: () => ({ limit: async () => [...stored.values()] }) }) }),
    } as unknown as Database;
    const repository = createDurableScheduleRunRepository(database);
    await expect(repository.start({ runId: "daily-2026-08-25", scheduledAt: new Date("2026-08-25T00:00:00Z"), startedAt: new Date("2026-08-25T00:00:03Z") })).resolves.toMatchObject({ status: "running" });
    await expect(repository.complete("daily-2026-08-25", new Date("2026-08-25T00:00:10Z"), "snapshot-1")).resolves.toMatchObject({ status: "completed", accountSnapshotId: "snapshot-1" });
    await expect(repository.getLatest()).resolves.toMatchObject({ runId: "daily-2026-08-25", status: "completed" });
  });

  it("records a bounded failure code", async () => {
    let stored: Record<string, unknown> = { runId: "daily-1", status: "running" };
    const database = { update: () => ({ set: (value: Record<string, unknown>) => ({ where: () => ({ returning: async () => { stored = { ...stored, ...value }; return [stored]; } }) }) }) } as unknown as Database;
    await expect(createDurableScheduleRunRepository(database).fail("daily-1", new Date("2026-08-25T00:01:00Z"), "reconciliation_failed")).resolves.toMatchObject({ status: "failed", failureCode: "reconciliation_failed" });
  });
});
