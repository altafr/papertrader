import { and, asc, desc, eq } from "drizzle-orm";

import type { Database } from "./client.js";
import { accountSnapshots, activities, orders, positions, shadowObservationOutcomes, shadowObservations, strategyLifecycleEvents } from "./schema.js";

export interface PersistedShadowObservation {
  readonly assetClass: "crypto" | "us_equity";
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly observationId: string;
  readonly plannedExitPrice?: string;
  readonly plannedStopPrice: string;
  readonly proposedEntryPrice: string;
  readonly rationale: string;
  readonly score: string;
  readonly signalTime: Date;
  readonly strategyKey: string;
  readonly strategyVersion: string;
  readonly symbol: string;
  readonly timeStopAt?: Date;
}

export interface PersistedShadowObservationOutcome {
  readonly exitPrice: string;
  readonly observedAt: Date;
  readonly observationId: string;
  readonly reason: "expired" | "invalidated" | "stop" | "target" | "time_stop";
  readonly returnPercent: string;
}

export interface PersistedStrategyLifecycleEvent {
  readonly actorId: string;
  readonly approvedAt: Date;
  readonly approvedBy: string;
  readonly approvalNote: string;
  readonly evidenceKey: string;
  readonly eventId: string;
  readonly fromStage: "disabled";
  readonly reason: string;
  readonly requestedAt: Date;
  readonly revision: number;
  readonly strategyKey: string;
  readonly strategyVersion: string;
  readonly toStage: "replay";
}

export interface PersistedAccountSnapshot {
  readonly accountId: string;
  readonly buyingPower: string;
  readonly capturedAt: Date;
  readonly cash: string;
  readonly currency: string;
  readonly equity: string;
  readonly lastEquity?: string;
  readonly status: string;
}

export interface ReconciliationState {
  readonly account: PersistedAccountSnapshot;
  readonly activities: readonly {
    readonly accountId: string;
    readonly activityId: string;
    readonly activityType: string;
    readonly price?: string;
    readonly quantity?: string;
    readonly symbol?: string;
    readonly transactionTime?: Date;
  }[];
  readonly orders: readonly {
    readonly accountId: string;
    readonly alpacaOrderId: string;
    readonly assetClass: string;
    readonly clientOrderId?: string;
    readonly filledQuantity?: string;
    readonly quantity?: string;
    readonly side: string;
    readonly status: string;
    readonly submittedAt?: Date;
    readonly symbol: string;
    readonly type: string;
    readonly updatedAt?: Date;
  }[];
  readonly positions: readonly {
    readonly assetClass: string;
    readonly averageEntryPrice: string;
    readonly marketValue: string;
    readonly quantity: string;
    readonly symbol: string;
    readonly unrealizedPl: string;
  }[];
}

export function createAccountStateRepository(db: Database) {
  return {
    async getLatest(accountId: string) {
      const [row] = await db
        .select()
        .from(accountSnapshots)
        .where(eq(accountSnapshots.accountId, accountId))
        .orderBy(desc(accountSnapshots.capturedAt))
        .limit(1);
      return row;
    },

    async getLatestReadModel(accountId?: string) {
      const [snapshot] = accountId
        ? await db
            .select()
            .from(accountSnapshots)
            .where(eq(accountSnapshots.accountId, accountId))
            .orderBy(desc(accountSnapshots.capturedAt))
            .limit(1)
        : await db.select().from(accountSnapshots).orderBy(desc(accountSnapshots.capturedAt)).limit(1);
      if (!snapshot?.id) {
        return undefined;
      }
      const resolvedAccountId = snapshot.accountId;
      const [snapshotPositions, snapshotOrders, snapshotActivities] = await Promise.all([
        db.select().from(positions).where(eq(positions.accountSnapshotId, snapshot.id)),
        db.select().from(orders).where(eq(orders.accountId, resolvedAccountId)).orderBy(desc(orders.updatedAt)),
        db
          .select()
          .from(activities)
          .where(eq(activities.accountId, resolvedAccountId))
          .orderBy(desc(activities.transactionTime)),
      ]);
      const capturedAt = snapshot.capturedAt;
      return {
        activities: snapshotActivities,
        capturedAt,
        freshness: {
          ageSeconds: Math.max(0, Math.floor((Date.now() - capturedAt.getTime()) / 1000)),
          capturedAt,
        },
        orders: snapshotOrders,
        positions: snapshotPositions,
        snapshot,
      };
    },

    async save(snapshot: PersistedAccountSnapshot) {
      const [row] = await db.insert(accountSnapshots).values(snapshot).returning();
      return row;
    },

    async reconcile(state: ReconciliationState) {
      return db.transaction(async (transaction) => {
        const [snapshot] = await transaction.insert(accountSnapshots).values(state.account).returning();
        if (!snapshot?.id) {
          throw new Error("Account snapshot insert did not return an id.");
        }

        if (state.positions.length > 0) {
          await transaction.insert(positions).values(
            state.positions.map((position) => ({
              ...position,
              accountSnapshotId: snapshot.id,
            })),
          );
        }
        if (state.orders.length > 0) {
          await transaction
            .insert(orders)
            .values([...state.orders])
            .onConflictDoUpdate({
              target: orders.alpacaOrderId,
              set: {
                clientOrderId: orders.clientOrderId,
                filledQuantity: orders.filledQuantity,
                quantity: orders.quantity,
                status: orders.status,
                submittedAt: orders.submittedAt,
                updatedAt: orders.updatedAt,
              },
            });
        }
        if (state.activities.length > 0) {
          await transaction.insert(activities).values([...state.activities]).onConflictDoNothing();
        }
        return snapshot;
      });
    },
  };
}

export function createStrategyLifecycleRepository(db: Database) {
  return {
    async appendDisabledToReplay(event: PersistedStrategyLifecycleEvent) {
      if (event.fromStage !== "disabled" || event.toStage !== "replay") throw new Error("Only disabled to replay lifecycle events may be persisted.");
      return db.transaction(async (transaction) => {
        const [latest] = await transaction
          .select()
          .from(strategyLifecycleEvents)
          .where(and(eq(strategyLifecycleEvents.strategyKey, event.strategyKey), eq(strategyLifecycleEvents.strategyVersion, event.strategyVersion)))
          .orderBy(desc(strategyLifecycleEvents.revision))
          .limit(1);
        const expectedRevision = (latest?.revision ?? 0) + 1;
        if (latest && latest.toStage !== "disabled") throw new Error("Strategy lifecycle is no longer in the disabled stage.");
        if (event.revision !== expectedRevision) throw new Error(`Lifecycle revision must be ${expectedRevision}.`);
        const [row] = await transaction.insert(strategyLifecycleEvents).values(event).returning();
        return row;
      });
    },

    async list(strategyKey: string, strategyVersion: string) {
      return db
        .select()
        .from(strategyLifecycleEvents)
        .where(and(eq(strategyLifecycleEvents.strategyKey, strategyKey), eq(strategyLifecycleEvents.strategyVersion, strategyVersion)))
        .orderBy(asc(strategyLifecycleEvents.revision));
    },

    async getLatest(strategyKey: string, strategyVersion: string) {
      const [row] = await db
        .select()
        .from(strategyLifecycleEvents)
        .where(and(eq(strategyLifecycleEvents.strategyKey, strategyKey), eq(strategyLifecycleEvents.strategyVersion, strategyVersion)))
        .orderBy(desc(strategyLifecycleEvents.revision))
        .limit(1);
      return row;
    },
  };
}

export function createShadowObservationRepository(db: Database) {
  return {
    async append(observation: PersistedShadowObservation) {
      const [row] = await db.insert(shadowObservations).values(observation).returning();
      return row;
    },

    async recordOutcome(outcome: PersistedShadowObservationOutcome) {
      return db.transaction(async (transaction) => {
        const [observation] = await transaction.select().from(shadowObservations).where(eq(shadowObservations.observationId, outcome.observationId)).limit(1);
        if (!observation) throw new Error("Shadow observation was not found.");
        const [existing] = await transaction.select().from(shadowObservationOutcomes).where(eq(shadowObservationOutcomes.observationId, outcome.observationId)).limit(1);
        if (existing) throw new Error("Shadow observation outcome already exists.");
        const [row] = await transaction.insert(shadowObservationOutcomes).values(outcome).returning();
        return row;
      });
    },

    async get(observationId: string) {
      const [observation] = await db.select().from(shadowObservations).where(eq(shadowObservations.observationId, observationId)).limit(1);
      if (!observation) return undefined;
      const [outcome] = await db.select().from(shadowObservationOutcomes).where(eq(shadowObservationOutcomes.observationId, observationId)).limit(1);
      return { observation, outcome };
    },
  };
}
