import { relations } from "drizzle-orm";
import { check, index, integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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

export const strategyLifecycleEvents = pgTable(
  "strategy_lifecycle_events",
  {
    actorId: text("actor_id").notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }).notNull(),
    approvedBy: text("approved_by").notNull(),
    approvalNote: text("approval_note").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    evidenceKey: text("evidence_key").notNull(),
    eventId: text("event_id").primaryKey(),
    fromStage: text("from_stage").notNull(),
    reason: text("reason").notNull(),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
    revision: integer("revision").notNull(),
    strategyKey: text("strategy_key").notNull(),
    strategyVersion: text("strategy_version").notNull(),
    toStage: text("to_stage").notNull(),
  },
  (table) => [
    unique("strategy_lifecycle_strategy_revision_unique").on(table.strategyKey, table.strategyVersion, table.revision),
    index("strategy_lifecycle_strategy_revision_idx").on(table.strategyKey, table.strategyVersion, table.revision),
    check("strategy_lifecycle_non_empty_text", sql`length(${table.actorId}) > 0 AND length(${table.approvedBy}) > 0 AND length(${table.approvalNote}) > 0 AND length(${table.evidenceKey}) > 0 AND length(${table.eventId}) > 0 AND length(${table.reason}) > 0 AND length(${table.strategyKey}) > 0 AND length(${table.strategyVersion}) > 0`),
    check("strategy_lifecycle_revision_positive", sql`${table.revision} > 0`),
    check("strategy_lifecycle_allowed_transitions", sql`(${table.fromStage} = 'disabled' AND ${table.toStage} = 'replay') OR (${table.fromStage} = 'replay' AND ${table.toStage} = 'shadow')`),
  ],
);

export const shadowObservations = pgTable(
  "shadow_observations",
  {
    assetClass: text("asset_class").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    observationId: text("observation_id").primaryKey(),
    plannedExitPrice: numeric("planned_exit_price", { precision: 20, scale: 8 }),
    plannedStopPrice: numeric("planned_stop_price", { precision: 20, scale: 8 }).notNull(),
    proposedEntryPrice: numeric("proposed_entry_price", { precision: 20, scale: 8 }).notNull(),
    rationale: text("rationale").notNull(),
    score: numeric("score", { precision: 20, scale: 8 }).notNull(),
    signalTime: timestamp("signal_time", { withTimezone: true }).notNull(),
    strategyKey: text("strategy_key").notNull(),
    strategyVersion: text("strategy_version").notNull(),
    symbol: text("symbol").notNull(),
    timeStopAt: timestamp("time_stop_at", { withTimezone: true }),
  },
  (table) => [
    check("shadow_observation_non_empty_text", sql`length(${table.observationId}) > 0 AND length(${table.strategyKey}) > 0 AND length(${table.strategyVersion}) > 0 AND length(${table.symbol}) > 0 AND length(${table.rationale}) > 0`),
    check("shadow_observation_prices_non_negative", sql`${table.proposedEntryPrice} >= 0 AND ${table.plannedStopPrice} >= 0 AND (${table.plannedExitPrice} IS NULL OR ${table.plannedExitPrice} >= 0)`),
  ],
);

export const shadowObservationOutcomes = pgTable(
  "shadow_observation_outcomes",
  {
    exitPrice: numeric("exit_price", { precision: 20, scale: 8 }).notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    observationId: text("observation_id").primaryKey().references(() => shadowObservations.observationId, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
    returnPercent: numeric("return_percent", { precision: 20, scale: 8 }).notNull(),
  },
  (table) => [
    check("shadow_outcome_exit_non_negative", sql`${table.exitPrice} > 0`),
    check("shadow_outcome_reason_valid", sql`${table.reason} IN ('expired', 'invalidated', 'stop', 'target', 'time_stop')`),
  ],
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
