import { desc, eq } from "drizzle-orm";

import type { Database } from "./client.js";
import { accountSnapshots } from "./schema.js";

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
  };
}
