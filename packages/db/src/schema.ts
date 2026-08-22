import { relations } from "drizzle-orm";
import { numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const accountSnapshots = pgTable("account_snapshots", {
  accountId: text("account_id").notNull(),
  buyingPower: numeric("buying_power", { precision: 20, scale: 8 }).notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  cash: numeric("cash", { precision: 20, scale: 8 }).notNull(),
  currency: text("currency").notNull(),
  equity: numeric("equity", { precision: 20, scale: 8 }).notNull(),
  id: uuid("id").defaultRandom().primaryKey(),
  lastEquity: numeric("last_equity", { precision: 20, scale: 8 }),
  status: text("status").notNull(),
});

export const positions = pgTable(
  "positions",
  {
    accountSnapshotId: uuid("account_snapshot_id")
      .notNull()
      .references(() => accountSnapshots.id, { onDelete: "cascade" }),
    assetClass: text("asset_class").notNull(),
    averageEntryPrice: numeric("average_entry_price", { precision: 20, scale: 8 }).notNull(),
    marketValue: numeric("market_value", { precision: 20, scale: 8 }).notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
    symbol: text("symbol").notNull(),
    unrealizedPl: numeric("unrealized_pl", { precision: 20, scale: 8 }).notNull(),
  },
  (table) => [unique("positions_snapshot_symbol_unique").on(table.accountSnapshotId, table.symbol)],
);

export const accountSnapshotsRelations = relations(accountSnapshots, ({ many }) => ({
  positions: many(positions),
}));

export const positionsRelations = relations(positions, ({ one }) => ({
  accountSnapshot: one(accountSnapshots, {
    fields: [positions.accountSnapshotId],
    references: [accountSnapshots.id],
  }),
}));
