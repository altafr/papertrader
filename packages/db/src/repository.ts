import { desc, eq } from "drizzle-orm";

import type { Database } from "./client.js";
import { accountSnapshots, activities, orders, positions } from "./schema.js";

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
