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

export const orders = pgTable("orders", {
  accountId: text("account_id").notNull(),
  alpacaOrderId: text("alpaca_order_id").primaryKey(),
  assetClass: text("asset_class").notNull(),
  clientOrderId: text("client_order_id"),
  filledQuantity: numeric("filled_quantity", { precision: 20, scale: 8 }),
  quantity: numeric("quantity", { precision: 20, scale: 8 }),
  side: text("side").notNull(),
  status: text("status").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  symbol: text("symbol").notNull(),
  type: text("type").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const activities = pgTable("activities", {
  accountId: text("account_id").notNull(),
  activityId: text("activity_id").primaryKey(),
  activityType: text("activity_type").notNull(),
  price: numeric("price", { precision: 20, scale: 8 }),
  quantity: numeric("quantity", { precision: 20, scale: 8 }),
  symbol: text("symbol"),
  transactionTime: timestamp("transaction_time", { withTimezone: true }),
});

export const accountSnapshotsRelations = relations(accountSnapshots, ({ many }) => ({
  positions: many(positions),
}));

export const positionsRelations = relations(positions, ({ one }) => ({
  accountSnapshot: one(accountSnapshots, {
    fields: [positions.accountSnapshotId],
    references: [accountSnapshots.id],
  }),
}));
