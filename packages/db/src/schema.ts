import { relations } from "drizzle-orm";
import { check, index, integer, jsonb, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
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

export const paperBaselineConfirmations = pgTable(
  "paper_baseline_confirmations",
  {
    accountId: text("account_id").notNull(),
    baseline: numeric("baseline", { precision: 20, scale: 8 }).notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull(),
    confirmationId: uuid("confirmation_id").defaultRandom().primaryKey(),
    note: text("note").notNull(),
    reference: text("reference").notNull().unique(),
    snapshotId: uuid("snapshot_id").notNull().references(() => accountSnapshots.id, { onDelete: "restrict" }),
  },
  (table) => [
    index("paper_baseline_confirmations_account_idx").on(table.accountId, table.confirmedAt),
    check("paper_baseline_confirmations_positive_baseline", sql`${table.baseline} > 0`),
    check("paper_baseline_confirmations_non_empty_text", sql`length(${table.accountId}) > 0 AND length(${table.note}) > 0 AND length(${table.reference}) > 0`),
  ],
);

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
    check("strategy_lifecycle_allowed_transitions", sql`(${table.fromStage} = 'disabled' AND ${table.toStage} = 'replay') OR (${table.fromStage} = 'replay' AND ${table.toStage} = 'shadow') OR (${table.fromStage} = 'shadow' AND ${table.toStage} = 'paper')`),
  ],
);

export const strategyPaperEvidence = pgTable(
  "strategy_paper_evidence",
  {
    closedTrades: integer("closed_trades").notNull(),
    consecutiveCalendarDays: integer("consecutive_calendar_days").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    duplicateOrderCount: integer("duplicate_order_count").notNull(),
    evidenceId: text("evidence_id").primaryKey(),
    maxDrawdownPercent: numeric("max_drawdown_percent", { precision: 20, scale: 8 }).notNull(),
    positiveTrades: integer("positive_trades").notNull(),
    riskViolationCount: integer("risk_violation_count").notNull(),
    staleDataBreachCount: integer("stale_data_breach_count").notNull(),
    strategyKey: text("strategy_key").notNull(),
    strategyVersion: text("strategy_version").notNull(),
  },
  (table) => [
    index("strategy_paper_evidence_strategy_captured_idx").on(table.strategyKey, table.strategyVersion, table.capturedAt),
    check("strategy_paper_evidence_counts_non_negative", sql`${table.closedTrades} >= 0 AND ${table.positiveTrades} >= 0 AND ${table.consecutiveCalendarDays} >= 0 AND ${table.riskViolationCount} >= 0 AND ${table.staleDataBreachCount} >= 0 AND ${table.duplicateOrderCount} >= 0`),
    check("strategy_paper_evidence_positive_within_closed", sql`${table.positiveTrades} <= ${table.closedTrades}`),
    check("strategy_paper_evidence_drawdown_non_negative", sql`${table.maxDrawdownPercent} >= 0`),
  ],
);

export const paperOrderSubmissions = pgTable(
  "paper_order_submissions",
  {
    alpacaOrderId: text("alpaca_order_id"),
    approvalId: text("approval_id").notNull(),
    assetClass: text("asset_class").notNull(),
    clientOrderId: text("client_order_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    entryPrice: numeric("entry_price", { precision: 20, scale: 8 }),
    exitPlanReference: text("exit_plan_reference"),
    filledQuantity: numeric("filled_quantity", { precision: 20, scale: 8 }),
    intentId: text("intent_id").primaryKey(),
    marketSnapshot: jsonb("market_snapshot").$type<Readonly<Record<string, string | null>>>(),
    riskDecision: jsonb("risk_decision").$type<Readonly<{ readonly approvalStatus?: "approved" | "rejected"; readonly estimatedLoss?: string; readonly estimatedLossPercent?: string; readonly policyVersion?: string; readonly reasons?: readonly string[] }>>(),
    quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
    plannedStopPrice: numeric("planned_stop_price", { precision: 20, scale: 8 }),
    plannedTargetPrice: numeric("planned_target_price", { precision: 20, scale: 8 }),
    status: text("status").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    symbol: text("symbol").notNull(),
    strategyKey: text("strategy_key"),
    strategyVersion: text("strategy_version"),
    trailingStopPrice: numeric("trailing_stop_price", { precision: 20, scale: 8 }),
    timeStopAt: timestamp("time_stop_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    unique("paper_order_submissions_client_order_unique").on(table.clientOrderId),
    index("paper_order_submissions_status_updated_idx").on(table.status, table.updatedAt),
    check("paper_order_submissions_non_empty_text", sql`length(${table.intentId}) > 0 AND length(${table.approvalId}) > 0 AND length(${table.clientOrderId}) > 0 AND length(${table.symbol}) > 0`),
    check("paper_order_submissions_quantity_positive", sql`${table.quantity} > 0`),
  ],
);

export const agentRuns = pgTable(
  "agent_runs",
  {
    agentType: text("agent_type").notNull(),
    artifactConfidence: text("artifact_confidence"),
    artifactEvidenceRefs: jsonb("artifact_evidence_refs").$type<readonly string[]>(),
    artifactPayload: jsonb("artifact_payload").$type<Readonly<Record<string, unknown>>>(),
    artifactRationale: text("artifact_rationale"),
    artifactSchemaVersion: text("artifact_schema_version"),
    artifactType: text("artifact_type"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    errorCode: text("error_code"),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    inputRefs: jsonb("input_refs").$type<readonly string[]>().notNull(),
    modelProvider: text("model_provider"),
    promptVersion: text("prompt_version").notNull(),
    runId: text("run_id").primaryKey(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    status: text("status").notNull(),
    task: text("task").notNull(),
  },
  (table) => [
    index("agent_runs_status_created_idx").on(table.status, table.createdAt),
    check("agent_runs_non_empty_text", sql`length(${table.runId}) > 0 AND length(${table.agentType}) > 0 AND length(${table.promptVersion}) > 0 AND length(${table.task}) > 0`),
    check("agent_runs_status_valid", sql`${table.status} IN ('queued', 'running', 'succeeded', 'failed')`),
    check("agent_runs_artifact_pairing", sql`(${table.status} = 'succeeded' AND ${table.artifactType} IS NOT NULL AND ${table.artifactRationale} IS NOT NULL) OR (${table.status} <> 'succeeded')`),
  ],
);

export const durableOneRunAudits = pgTable(
  "durable_one_run_audits",
  {
    accountSnapshotId: uuid("account_snapshot_id").notNull().references(() => accountSnapshots.id, { onDelete: "restrict" }),
    approvalReference: text("approval_reference").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    runId: text("run_id").primaryKey(),
    status: text("status").notNull(),
  },
  (table) => [
    index("durable_one_run_audits_captured_idx").on(table.capturedAt),
    check("durable_one_run_audits_non_empty_text", sql`length(${table.runId}) > 0 AND length(${table.approvalReference}) > 0`),
    check("durable_one_run_audits_status_valid", sql`${table.status} = 'completed'`),
  ],
);

export const durableScheduleRuns = pgTable(
  "durable_schedule_runs",
  {
    accountSnapshotId: uuid("account_snapshot_id").references(() => accountSnapshots.id, { onDelete: "restrict" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    failureCode: text("failure_code"),
    runId: text("run_id").primaryKey(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    status: text("status").notNull(),
  },
  (table) => [
    index("durable_schedule_runs_scheduled_idx").on(table.scheduledAt),
    check("durable_schedule_runs_non_empty_text", sql`length(${table.runId}) > 0`),
    check("durable_schedule_runs_status_valid", sql`${table.status} IN ('running', 'completed', 'failed')`),
  ],
);

export const telegramAlertEvents = pgTable(
  "telegram_alert_events",
  {
    attempts: integer("attempts").notNull().default(0),
    code: text("code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    dedupeKey: text("dedupe_key").notNull().unique(),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    deliveryStatus: text("delivery_status").notNull().default("pending"),
    eventId: uuid("event_id").defaultRandom().primaryKey(),
    lastError: text("last_error"),
    message: text("message").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    severity: text("severity").notNull(),
  },
  (table) => [
    index("telegram_alert_events_occurred_idx").on(table.occurredAt),
    check("telegram_alert_events_non_empty", sql`length(${table.dedupeKey}) > 0 AND length(${table.code}) > 0 AND length(${table.message}) > 0`),
    check("telegram_alert_events_severity_valid", sql`${table.severity} IN ('critical', 'info', 'warning')`),
    check("telegram_alert_events_status_valid", sql`${table.deliveryStatus} IN ('pending', 'sent', 'failed')`),
    check("telegram_alert_events_attempts_valid", sql`${table.attempts} >= 0`),
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
    marketSnapshot: jsonb("market_snapshot").$type<Readonly<Record<string, string | null>>>(),
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
