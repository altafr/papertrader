import { describe, expect, it } from "vitest";
import type { Database } from "./client.js";
import { createStrategyLifecycleRepository, type PersistedStrategyLifecycleEvent } from "./repository.js";

const event = (revision: number): PersistedStrategyLifecycleEvent => ({
  actorId: "operator-1", approvedAt: new Date("2026-01-10T00:00:00Z"), approvedBy: "operator-1", approvalNote: "Reviewed.", evidenceKey: "cross-sectional-momentum@1.0.0", eventId: `event-${revision}`, fromStage: "disabled", reason: "Replay approval.", requestedAt: new Date("2026-01-10T00:00:00Z"), revision, strategyKey: "cross-sectional-momentum", strategyVersion: "1.0.0", toStage: "replay",
});

describe("strategy lifecycle repository", () => {
  it("persists the first revision and rejects a second transition after replay", async () => {
    let stored: PersistedStrategyLifecycleEvent | undefined;
    const transaction = {
      insert: () => ({ values: (value: PersistedStrategyLifecycleEvent) => ({ returning: async () => { stored = value; return [value]; } }) }),
      select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => stored ? [stored] : [] }) }) }) }),
    };
    const database = { transaction: async <T>(callback: (value: never) => Promise<T>) => callback(transaction as never) } as unknown as Database;
    const repository = createStrategyLifecycleRepository(database);
    await expect(repository.appendDisabledToReplay(event(1))).resolves.toMatchObject({ revision: 1 });
    await expect(repository.appendDisabledToReplay(event(2))).rejects.toThrow("no longer in the disabled stage");
  });

  it("rejects a revision gap before insert", async () => {
    const latestDisabled = { ...event(1), toStage: "disabled" } as unknown as PersistedStrategyLifecycleEvent;
    const transaction = {
      insert: () => ({ values: () => ({ returning: async () => [] }) }),
      select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [latestDisabled] }) }) }) }),
    };
    const database = { transaction: async <T>(callback: (value: never) => Promise<T>) => callback(transaction as never) } as unknown as Database;
    await expect(createStrategyLifecycleRepository(database).appendDisabledToReplay(event(3))).rejects.toThrow("must be 2");
  });
});
