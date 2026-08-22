import { describe, expect, it } from "vitest";
import type { Database } from "./client.js";
import { createPaperOrderRepository, createShadowObservationRepository, createStrategyLifecycleRepository, type PersistedPaperOrderSubmission, type PersistedShadowObservation, type PersistedShadowObservationOutcome, type PersistedStrategyLifecycleEvent } from "./repository.js";
import { paperOrderSubmissions, shadowObservationOutcomes, shadowObservations } from "./schema.js";

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
    const database = { select: transaction.select, transaction: async <T>(callback: (value: never) => Promise<T>) => callback(transaction as never) } as unknown as Database;
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
    const database = { select: transaction.select, transaction: async <T>(callback: (value: never) => Promise<T>) => callback(transaction as never) } as unknown as Database;
    await expect(createStrategyLifecycleRepository(database).appendDisabledToReplay(event(3))).rejects.toThrow("must be 2");
  });

  it("allows replay-to-shadow only after replay is recorded", async () => {
    let stored: PersistedStrategyLifecycleEvent | undefined;
    const transaction = {
      insert: () => ({ values: (value: PersistedStrategyLifecycleEvent) => ({ returning: async () => { stored = value; return [value]; } }) }),
      select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => stored ? [stored] : [] }) }) }) }),
    };
    const database = { select: transaction.select, transaction: async <T>(callback: (value: never) => Promise<T>) => callback(transaction as never) } as unknown as Database;
    const repository = createStrategyLifecycleRepository(database);
    await repository.appendDisabledToReplay(event(1));
    await expect(repository.appendReplayToShadow({ ...event(2), evidenceKey: "cross-sectional-momentum@1.0.0:shadow", fromStage: "replay", toStage: "shadow", reason: "Shadow approval." })).resolves.toMatchObject({ toStage: "shadow", revision: 2 });
  });

  it("allows shadow-to-paper only after shadow is recorded", async () => {
    let stored: PersistedStrategyLifecycleEvent = { ...event(1), fromStage: "replay", toStage: "shadow", evidenceKey: "cross-sectional-momentum@1.0.0:shadow" };
    const transaction = {
      insert: () => ({ values: (value: PersistedStrategyLifecycleEvent) => ({ returning: async () => { stored = value; return [value]; } }) }),
      select: () => ({ from: () => ({ where: () => ({ orderBy: () => ({ limit: async () => [stored] }) }) }) }),
    };
    const database = { transaction: async <T>(callback: (value: never) => Promise<T>) => callback(transaction as never) } as unknown as Database;
    await expect(createStrategyLifecycleRepository(database).appendShadowToPaper({ ...event(2), fromStage: "shadow", toStage: "paper", evidenceKey: "cross-sectional-momentum@1.0.0:paper" })).resolves.toMatchObject({ toStage: "paper", revision: 2 });
  });
});

describe("shadow observation repository", () => {
  const observation: PersistedShadowObservation = {
    assetClass: "us_equity", createdAt: new Date("2026-01-10T00:01:00Z"), expiresAt: new Date("2026-01-11T00:00:00Z"), observationId: "shadow-1", plannedExitPrice: "110", plannedStopPrice: "95", proposedEntryPrice: "100", rationale: "fixture", score: "0.5", signalTime: new Date("2026-01-10T00:00:00Z"), strategyKey: "fixture", strategyVersion: "1.0.0", symbol: "AAA",
  };
  const outcome: PersistedShadowObservationOutcome = { exitPrice: "105", observedAt: new Date("2026-01-10T01:00:00Z"), observationId: "shadow-1", reason: "time_stop", returnPercent: "5" };

  it("keeps the signal and outcome as separate one-time writes", async () => {
    let storedObservation: PersistedShadowObservation | undefined;
    let storedOutcome: PersistedShadowObservationOutcome | undefined;
    const transaction = {
      insert: () => ({ values: (value: PersistedShadowObservation | PersistedShadowObservationOutcome) => ({ returning: async () => { if ("proposedEntryPrice" in value) storedObservation = value; else storedOutcome = value; return [value]; } }) }),
      select: () => ({ from: (table: unknown) => ({ where: () => ({ limit: async () => table === shadowObservations ? (storedObservation ? [storedObservation] : []) : table === shadowObservationOutcomes ? (storedOutcome ? [storedOutcome] : []) : [] }) }) }),
    };
    const database = { insert: transaction.insert, select: transaction.select, transaction: async <T>(callback: (value: never) => Promise<T>) => callback(transaction as never) } as unknown as Database;
    const repository = createShadowObservationRepository(database);
    await expect(repository.append(observation)).resolves.toMatchObject({ observationId: "shadow-1" });
    await expect(repository.recordOutcome(outcome)).resolves.toMatchObject({ observationId: "shadow-1" });
    await expect(repository.recordOutcome(outcome)).rejects.toThrow("already exists");
  });
});

describe("paper order submission repository", () => {
  it("records an intent once and reconciles broker truth transactionally", async () => {
    let stored: PersistedPaperOrderSubmission | undefined;
    const transaction = {
      insert: () => ({ values: (value: PersistedPaperOrderSubmission) => ({ returning: async () => { stored = value; return [value]; } }) }),
      select: () => ({ from: (table: unknown) => ({ where: () => ({ limit: async () => table === paperOrderSubmissions && stored ? [stored] : [] }) }) }),
      update: () => ({ set: (value: Partial<PersistedPaperOrderSubmission>) => ({ where: () => ({ returning: async () => { stored = { ...stored!, ...value }; return [stored]; } }) }) }),
    };
    const database = { select: transaction.select, transaction: async <T>(callback: (value: never) => Promise<T>) => callback(transaction as never) } as unknown as Database;
    const repository = createPaperOrderRepository(database);
    const submission: PersistedPaperOrderSubmission = { approvalId: "approval-1", assetClass: "us_equity", clientOrderId: "intent-1-order", intentId: "intent-1", quantity: "0.02", status: "pending", symbol: "AAA" };
    await expect(repository.recordSubmission(submission)).resolves.toMatchObject({ intentId: "intent-1", status: "pending" });
    await expect(repository.recordSubmission(submission)).resolves.toMatchObject({ intentId: "intent-1" });
    await expect(repository.reconcile({ alpacaOrderId: "alpaca-1", filledQuantity: "0.02", intentId: "intent-1", status: "filled" })).resolves.toMatchObject({ alpacaOrderId: "alpaca-1", status: "filled" });
    await expect(repository.getByClientOrderId("intent-1-order")).resolves.toMatchObject({ status: "filled" });
  });
});
