import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

import type { Database } from "./client.js";
import { accountSnapshots, activities, agentRuns, durableOneRunAudits, durableScheduleRuns, orders, paperBaselineConfirmations, paperOrderSubmissions, positions, shadowObservationOutcomes, shadowObservations, strategyLifecycleEvents, strategyPaperEvidence, telegramAlertEvents } from "./schema.js";

export interface PersistedTelegramAlertEvent {
  readonly code: string;
  readonly dedupeKey: string;
  readonly message: string;
  readonly occurredAt: Date;
  readonly severity: "critical" | "info" | "warning";
}

export interface PersistedAgentArtifact {
  readonly artifactConfidence: string;
  readonly artifactEvidenceRefs: readonly string[];
  readonly artifactPayload: Readonly<Record<string, unknown>>;
  readonly artifactRationale: string;
  readonly artifactSchemaVersion: string;
  readonly artifactType: string;
}

export interface PersistedAgentRun {
  readonly agentType: string;
  readonly createdAt: Date;
  readonly inputRefs: readonly string[];
  readonly modelProvider?: string;
  readonly promptVersion: string;
  readonly runId: string;
  readonly status: "failed" | "queued" | "running" | "succeeded";
  readonly task: string;
}

export interface PersistedPaperOrderSubmission {
  readonly alpacaOrderId?: string;
  readonly approvalId: string;
  readonly assetClass: string;
  readonly clientOrderId: string;
  readonly filledQuantity?: string;
  readonly intentId: string;
  readonly marketSnapshot?: Readonly<Record<string, string | null>>;
  readonly riskDecision?: Readonly<{ readonly approvalStatus?: "approved" | "rejected"; readonly estimatedLoss?: string; readonly estimatedLossPercent?: string; readonly policyVersion?: string; readonly reasons?: readonly string[] }>;
  readonly quantity: string;
  readonly entryPrice?: string;
  readonly exitPlanReference?: string;
  readonly plannedStopPrice?: string;
  readonly plannedTargetPrice?: string;
  readonly strategyKey?: string;
  readonly strategyVersion?: string;
  readonly trailingStopPrice?: string;
  readonly timeStopAt?: Date;
  readonly status: string;
  readonly submittedAt?: Date;
  readonly symbol: string;
  readonly updatedAt?: Date;
}

export interface PersistedPaperPromotionEvidence {
  readonly capturedAt: Date;
  readonly closedTrades: number;
  readonly consecutiveCalendarDays: number;
  readonly duplicateOrderCount: number;
  readonly evidenceId: string;
  readonly maxDrawdownPercent: string;
  readonly positiveTrades: number;
  readonly riskViolationCount: number;
  readonly staleDataBreachCount: number;
  readonly strategyKey: string;
  readonly strategyVersion: string;
}

export interface PersistedShadowObservation {
  readonly assetClass: "crypto" | "us_equity";
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly observationId: string;
  readonly plannedExitPrice?: string;
  readonly plannedStopPrice: string;
  readonly proposedEntryPrice: string;
  readonly rationale: string;
  readonly marketSnapshot?: Readonly<Record<string, string | null>>;
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
  readonly fromStage: "disabled" | "replay" | "shadow";
  readonly reason: string;
  readonly requestedAt: Date;
  readonly revision: number;
  readonly strategyKey: string;
  readonly strategyVersion: string;
  readonly toStage: "replay" | "shadow" | "paper";
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

export interface PersistedPaperBaselineConfirmation {
  readonly accountId: string;
  readonly baseline: string;
  readonly confirmedAt: Date;
  readonly note: string;
  readonly reference: string;
  readonly snapshotId: string;
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

export interface PersistedDurableOneRunProvenance {
  readonly approvalReference: string;
  readonly runId: string;
}

export interface PersistedDurableScheduleRun {
  readonly accountSnapshotId?: string;
  readonly completedAt?: Date;
  readonly failureCode?: string;
  readonly runId: string;
  readonly scheduledAt: Date;
  readonly startedAt: Date;
  readonly status: "completed" | "failed" | "running";
}

export function createDurableScheduleRunRepository(db: Database) {
  return {
    async start(run: Pick<PersistedDurableScheduleRun, "runId" | "scheduledAt" | "startedAt">) {
      const [row] = await db.insert(durableScheduleRuns).values({ runId: run.runId, scheduledAt: run.scheduledAt, startedAt: run.startedAt, status: "running" }).returning();
      if (!row) throw new Error("Durable schedule run insert did not return a row.");
      return row;
    },
    async complete(runId: string, completedAt: Date, accountSnapshotId: string) {
      const [row] = await db.update(durableScheduleRuns).set({ accountSnapshotId, completedAt, status: "completed" }).where(eq(durableScheduleRuns.runId, runId)).returning();
      if (!row) throw new Error("Durable schedule run was not found.");
      return row;
    },
    async fail(runId: string, completedAt: Date, failureCode: string) {
      const [row] = await db.update(durableScheduleRuns).set({ completedAt, failureCode, status: "failed" }).where(eq(durableScheduleRuns.runId, runId)).returning();
      if (!row) throw new Error("Durable schedule run was not found.");
      return row;
    },
    async getLatest() {
      const [row] = await db.select().from(durableScheduleRuns).orderBy(desc(durableScheduleRuns.scheduledAt)).limit(1);
      return row;
    },
  };
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

    async getInitial(accountId: string) {
      const [row] = await db.select().from(accountSnapshots).where(eq(accountSnapshots.accountId, accountId)).orderBy(asc(accountSnapshots.capturedAt)).limit(1);
      return row;
    },

    async confirmPaperBaseline(input: PersistedPaperBaselineConfirmation) {
      const [row] = await db.insert(paperBaselineConfirmations).values(input).onConflictDoNothing({ target: paperBaselineConfirmations.reference }).returning();
      if (!row) throw new Error("Paper baseline confirmation reference already exists.");
      return row;
    },

    async getLatestPaperBaselineConfirmation(accountId: string, baseline: string) {
      const [row] = await db.select().from(paperBaselineConfirmations).where(and(eq(paperBaselineConfirmations.accountId, accountId), eq(paperBaselineConfirmations.baseline, baseline))).orderBy(desc(paperBaselineConfirmations.confirmedAt)).limit(1);
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

    async reconcile(state: ReconciliationState, provenance?: PersistedDurableOneRunProvenance) {
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
                clientOrderId: sql`excluded.client_order_id`,
                filledQuantity: sql`excluded.filled_quantity`,
                quantity: sql`excluded.quantity`,
                status: sql`excluded.status`,
                submittedAt: sql`excluded.submitted_at`,
                updatedAt: sql`excluded.updated_at`,
              },
            });
          // Keep the auditable submission ledger aligned with broker truth for
          // every reconciliation path, not only position management.
          for (const order of state.orders) {
            if (!order.clientOrderId) continue;
            await transaction.update(paperOrderSubmissions).set({
              alpacaOrderId: order.alpacaOrderId,
              ...(order.filledQuantity !== undefined ? { filledQuantity: order.filledQuantity } : {}),
              status: order.status,
              ...(order.submittedAt !== undefined ? { submittedAt: order.submittedAt } : {}),
              ...(order.updatedAt !== undefined ? { updatedAt: order.updatedAt } : {}),
            }).where(eq(paperOrderSubmissions.clientOrderId, order.clientOrderId));
          }
        }
        if (state.activities.length > 0) {
          await transaction.insert(activities).values([...state.activities]).onConflictDoNothing();
        }
        if (provenance) {
          await transaction.insert(durableOneRunAudits).values({ accountSnapshotId: snapshot.id, approvalReference: provenance.approvalReference, capturedAt: state.account.capturedAt, runId: provenance.runId, status: "completed" });
        }
        return snapshot;
      });
    },

    async getDurableOneRunAudit(runId: string) {
      const [row] = await db.select().from(durableOneRunAudits).where(eq(durableOneRunAudits.runId, runId)).limit(1);
      return row;
    },

    async getDurableOneRunAuditByApprovalReference(approvalReference: string) {
      return db.select().from(durableOneRunAudits).where(eq(durableOneRunAudits.approvalReference, approvalReference)).limit(10);
    },

    async getLatestDurableOneRunAudit() {
      const [row] = await db.select().from(durableOneRunAudits).orderBy(desc(durableOneRunAudits.capturedAt)).limit(1);
      return row;
    },
  };
}

export function createTelegramAlertRepository(db: Database) {
  return {
    async enqueue(input: PersistedTelegramAlertEvent) {
      const [row] = await db.insert(telegramAlertEvents).values({ code: input.code, dedupeKey: input.dedupeKey, message: input.message, occurredAt: input.occurredAt, severity: input.severity }).onConflictDoNothing({ target: telegramAlertEvents.dedupeKey }).returning();
      return row;
    },
    async markSent(eventId: string) {
      return db.update(telegramAlertEvents).set({ attempts: sql`${telegramAlertEvents.attempts} + 1`, deliveredAt: new Date(), deliveryStatus: "sent", lastError: null }).where(eq(telegramAlertEvents.eventId, eventId)).returning();
    },
    async markFailed(eventId: string, errorCode: string) {
      return db.update(telegramAlertEvents).set({ attempts: sql`${telegramAlertEvents.attempts} + 1`, deliveryStatus: "failed", lastError: errorCode }).where(eq(telegramAlertEvents.eventId, eventId)).returning();
    },
    async listRecent(limit = 100) {
      return db.select().from(telegramAlertEvents).orderBy(desc(telegramAlertEvents.occurredAt)).limit(limit);
    },
    async hasSent(code: string) {
      const [row] = await db.select({ eventId: telegramAlertEvents.eventId }).from(telegramAlertEvents).where(and(eq(telegramAlertEvents.code, code), eq(telegramAlertEvents.deliveryStatus, "sent"))).limit(1);
      return Boolean(row);
    },
    async hasRecent(code: string, dedupeKeyPrefix: string, since: Date) {
      const [row] = await db.select({ eventId: telegramAlertEvents.eventId }).from(telegramAlertEvents).where(and(eq(telegramAlertEvents.code, code), sql`${telegramAlertEvents.dedupeKey} LIKE ${`${dedupeKeyPrefix}:%`}`, gte(telegramAlertEvents.occurredAt, since))).limit(1);
      return Boolean(row);
    },
    async listRetryable(limit = 20, maxAttempts = 5) {
      const rows = await db.select().from(telegramAlertEvents).where(and(inArray(telegramAlertEvents.deliveryStatus, ["pending", "failed"]), lt(telegramAlertEvents.attempts, maxAttempts))).orderBy(asc(telegramAlertEvents.occurredAt)).limit(limit);
      return rows.map((row) => ({ code: row.code, eventId: row.eventId, message: row.message, occurredAt: row.occurredAt, severity: row.severity as "critical" | "info" | "warning" }));
    },
  };
}

export function createAgentRunRepository(db: Database) {
  return {
    async enqueue(run: PersistedAgentRun) {
      const [row] = await db.insert(agentRuns).values(run).returning();
      return row;
    },

    async start(runId: string, startedAt: Date) {
      const [row] = await db.update(agentRuns).set({ startedAt, status: "running" }).where(and(eq(agentRuns.runId, runId), eq(agentRuns.status, "queued"))).returning();
      if (!row) throw new Error("Queued agent run was not found.");
      return row;
    },

    async succeed(runId: string, finishedAt: Date, artifact: PersistedAgentArtifact) {
      const [row] = await db.update(agentRuns).set({
        artifactConfidence: artifact.artifactConfidence,
        artifactEvidenceRefs: artifact.artifactEvidenceRefs,
        artifactPayload: artifact.artifactPayload,
        artifactRationale: artifact.artifactRationale,
        artifactSchemaVersion: artifact.artifactSchemaVersion,
        artifactType: artifact.artifactType,
        finishedAt,
        status: "succeeded",
      }).where(and(eq(agentRuns.runId, runId), eq(agentRuns.status, "running"))).returning();
      if (!row) throw new Error("Running agent run was not found.");
      return row;
    },

    async fail(runId: string, finishedAt: Date, errorCode: string) {
      const [row] = await db.update(agentRuns).set({ errorCode, finishedAt, status: "failed" }).where(and(eq(agentRuns.runId, runId), eq(agentRuns.status, "running"))).returning();
      if (!row) throw new Error("Running agent run was not found.");
      return row;
    },

    async get(runId: string) {
      const [row] = await db.select().from(agentRuns).where(eq(agentRuns.runId, runId)).limit(1);
      return row;
    },

    async listRecent(limit = 50) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("Agent run limit must be an integer from 1 to 100.");
      return db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(limit);
    },
  };
}

export function createStrategyLifecycleRepository(db: Database) {
  const appendTransition = async (event: PersistedStrategyLifecycleEvent) => {
    const allowed = (event.fromStage === "disabled" && event.toStage === "replay") || (event.fromStage === "replay" && event.toStage === "shadow") || (event.fromStage === "shadow" && event.toStage === "paper");
    if (!allowed) throw new Error("Only disabled to replay, replay to shadow, or shadow to paper lifecycle events may be persisted.");
    return db.transaction(async (transaction) => {
      const [latest] = await transaction
        .select()
        .from(strategyLifecycleEvents)
        .where(and(eq(strategyLifecycleEvents.strategyKey, event.strategyKey), eq(strategyLifecycleEvents.strategyVersion, event.strategyVersion)))
        .orderBy(desc(strategyLifecycleEvents.revision))
        .limit(1);
      const expectedRevision = (latest?.revision ?? 0) + 1;
      if (latest && latest.toStage !== event.fromStage) throw new Error(event.fromStage === "disabled" ? "Strategy lifecycle is no longer in the disabled stage." : "Strategy lifecycle source stage does not match the latest recorded stage.");
      if (!latest && event.fromStage !== "disabled") throw new Error("A later lifecycle transition requires a recorded source stage.");
      if (event.revision !== expectedRevision) throw new Error(`Lifecycle revision must be ${expectedRevision}.`);
      const [row] = await transaction.insert(strategyLifecycleEvents).values(event).returning();
      return row;
    });
  };
  return {
    async appendDisabledToReplay(event: PersistedStrategyLifecycleEvent) {
      return appendTransition(event);
    },
    async appendReplayToShadow(event: PersistedStrategyLifecycleEvent) {
      return appendTransition(event);
    },
    async appendShadowToPaper(event: PersistedStrategyLifecycleEvent) {
      return appendTransition(event);
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

    async getLatestPaperEvidence(strategyKey: string, strategyVersion: string) {
      const [row] = await db.select().from(strategyPaperEvidence)
        .where(and(eq(strategyPaperEvidence.strategyKey, strategyKey), eq(strategyPaperEvidence.strategyVersion, strategyVersion)))
        .orderBy(desc(strategyPaperEvidence.capturedAt)).limit(1);
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

    async listOpen() {
      const rows = await db.select().from(shadowObservations);
      const open = [] as typeof rows;
      for (const row of rows) {
        const [outcome] = await db.select().from(shadowObservationOutcomes).where(eq(shadowObservationOutcomes.observationId, row.observationId)).limit(1);
        if (!outcome) open.push(row);
      }
      return open;
    },

    async listClosed(strategyKey: string, strategyVersion: string) {
      const rows = await db.select().from(shadowObservations).where(and(eq(shadowObservations.strategyKey, strategyKey), eq(shadowObservations.strategyVersion, strategyVersion)));
      const closed: { readonly observation: typeof rows[number]; readonly outcome: typeof shadowObservationOutcomes.$inferSelect }[] = [];
      for (const observation of rows) {
        const [outcome] = await db.select().from(shadowObservationOutcomes).where(eq(shadowObservationOutcomes.observationId, observation.observationId)).limit(1);
        if (outcome) closed.push({ observation, outcome });
      }
      return closed;
    },
  };
}

export function createPaperOrderRepository(db: Database) {
  return {
    async recordSubmission(submission: PersistedPaperOrderSubmission) {
      return db.transaction(async (transaction) => {
        const [existingIntent] = await transaction.select().from(paperOrderSubmissions).where(eq(paperOrderSubmissions.intentId, submission.intentId)).limit(1);
        if (existingIntent) {
          // Scheduled risk evaluation reuses a deterministic intent for the
          // same market setup. Refresh only the dry-run evidence row; never
          // mutate an order that has entered broker execution/reconciliation.
          const isRiskEvidence = submission.status === "risk_dry_run_approved" || submission.status === "risk_dry_run_rejected";
          const existingIsRiskEvidence = existingIntent.status === "risk_dry_run_approved" || existingIntent.status === "risk_dry_run_rejected";
          if (isRiskEvidence && existingIsRiskEvidence) {
            const [refreshed] = await transaction.update(paperOrderSubmissions).set({
              approvalId: submission.approvalId,
              assetClass: submission.assetClass,
              quantity: submission.quantity,
              status: submission.status,
              symbol: submission.symbol,
              ...(submission.entryPrice ? { entryPrice: submission.entryPrice } : {}),
              ...(submission.plannedStopPrice ? { plannedStopPrice: submission.plannedStopPrice } : {}),
              ...(submission.plannedTargetPrice ? { plannedTargetPrice: submission.plannedTargetPrice } : {}),
              ...(submission.strategyKey ? { strategyKey: submission.strategyKey } : {}),
              ...(submission.strategyVersion ? { strategyVersion: submission.strategyVersion } : {}),
              ...(submission.trailingStopPrice ? { trailingStopPrice: submission.trailingStopPrice } : {}),
              ...(submission.marketSnapshot ? { marketSnapshot: submission.marketSnapshot } : {}),
              ...(submission.riskDecision ? { riskDecision: submission.riskDecision } : {}),
              updatedAt: submission.updatedAt ?? new Date(),
            }).where(eq(paperOrderSubmissions.intentId, submission.intentId)).returning();
            return refreshed ?? existingIntent;
          }
          return existingIntent;
        }
        const [existingClient] = await transaction.select().from(paperOrderSubmissions).where(eq(paperOrderSubmissions.clientOrderId, submission.clientOrderId)).limit(1);
        if (existingClient && existingClient.intentId !== submission.intentId) throw new Error("Client order ID is already bound to another intent.");
        const [row] = await transaction.insert(paperOrderSubmissions).values({
          approvalId: submission.approvalId,
          assetClass: submission.assetClass,
          clientOrderId: submission.clientOrderId,
          intentId: submission.intentId,
          quantity: submission.quantity,
          status: submission.status,
          symbol: submission.symbol,
          ...(submission.entryPrice ? { entryPrice: submission.entryPrice } : {}),
          ...(submission.exitPlanReference ? { exitPlanReference: submission.exitPlanReference } : {}),
          ...(submission.plannedStopPrice ? { plannedStopPrice: submission.plannedStopPrice } : {}),
          ...(submission.plannedTargetPrice ? { plannedTargetPrice: submission.plannedTargetPrice } : {}),
          ...(submission.strategyKey ? { strategyKey: submission.strategyKey } : {}),
          ...(submission.strategyVersion ? { strategyVersion: submission.strategyVersion } : {}),
          ...(submission.trailingStopPrice ? { trailingStopPrice: submission.trailingStopPrice } : {}),
          ...(submission.timeStopAt ? { timeStopAt: submission.timeStopAt } : {}),
          ...(submission.alpacaOrderId ? { alpacaOrderId: submission.alpacaOrderId } : {}),
          ...(submission.filledQuantity ? { filledQuantity: submission.filledQuantity } : {}),
          ...(submission.marketSnapshot ? { marketSnapshot: submission.marketSnapshot } : {}),
          ...(submission.riskDecision ? { riskDecision: submission.riskDecision } : {}),
          ...(submission.submittedAt ? { submittedAt: submission.submittedAt } : {}),
          ...(submission.updatedAt ? { updatedAt: submission.updatedAt } : {}),
        }).returning();
        return row;
      });
    },

    async recordSubmissionsAtomically(submissions: readonly PersistedPaperOrderSubmission[]) {
      if (submissions.length === 0) throw new Error("At least one paper order submission is required.");
      return db.transaction(async (transaction) => transaction.insert(paperOrderSubmissions).values(submissions.map((submission) => ({
        approvalId: submission.approvalId,
        assetClass: submission.assetClass,
        clientOrderId: submission.clientOrderId,
        intentId: submission.intentId,
        quantity: submission.quantity,
        status: submission.status,
        symbol: submission.symbol,
        ...(submission.entryPrice ? { entryPrice: submission.entryPrice } : {}),
        ...(submission.exitPlanReference ? { exitPlanReference: submission.exitPlanReference } : {}),
        ...(submission.plannedStopPrice ? { plannedStopPrice: submission.plannedStopPrice } : {}),
        ...(submission.plannedTargetPrice ? { plannedTargetPrice: submission.plannedTargetPrice } : {}),
        ...(submission.strategyKey ? { strategyKey: submission.strategyKey } : {}),
        ...(submission.strategyVersion ? { strategyVersion: submission.strategyVersion } : {}),
        ...(submission.trailingStopPrice ? { trailingStopPrice: submission.trailingStopPrice } : {}),
        ...(submission.timeStopAt ? { timeStopAt: submission.timeStopAt } : {}),
        ...(submission.alpacaOrderId ? { alpacaOrderId: submission.alpacaOrderId } : {}),
        ...(submission.filledQuantity ? { filledQuantity: submission.filledQuantity } : {}),
        ...(submission.submittedAt ? { submittedAt: submission.submittedAt } : {}),
        ...(submission.updatedAt ? { updatedAt: submission.updatedAt } : {}),
      }))).returning());
    },

    async reconcile(input: { readonly alpacaOrderId: string; readonly filledQuantity?: string; readonly status: string; readonly submittedAt?: Date; readonly intentId: string; readonly updatedAt?: Date }) {
      return db.transaction(async (transaction) => {
        const [existing] = await transaction.select().from(paperOrderSubmissions).where(eq(paperOrderSubmissions.intentId, input.intentId)).limit(1);
        if (!existing) throw new Error("Paper order submission was not found.");
        const [row] = await transaction.update(paperOrderSubmissions).set({
          alpacaOrderId: input.alpacaOrderId, status: input.status,
          ...(input.filledQuantity !== undefined ? { filledQuantity: input.filledQuantity } : {}),
          ...(input.submittedAt !== undefined ? { submittedAt: input.submittedAt } : {}),
          ...(input.updatedAt !== undefined ? { updatedAt: input.updatedAt } : {}),
        }).where(eq(paperOrderSubmissions.intentId, input.intentId)).returning();
        return row;
      });
    },

    async markFailed(intentId: string) {
      const [row] = await db.update(paperOrderSubmissions).set({ status: "failed", updatedAt: new Date() }).where(eq(paperOrderSubmissions.intentId, intentId)).returning();
      if (!row) throw new Error("Paper order submission was not found.");
      return row;
    },

    async ratchetTrailingStop(intentId: string, trailingStopPrice: string) {
      const [row] = await db.update(paperOrderSubmissions).set({ trailingStopPrice, updatedAt: new Date() }).where(and(eq(paperOrderSubmissions.intentId, intentId), or(isNull(paperOrderSubmissions.trailingStopPrice), lt(paperOrderSubmissions.trailingStopPrice, trailingStopPrice)))).returning();
      return row;
    },

    async getByClientOrderId(clientOrderId: string) {
      const [row] = await db.select().from(paperOrderSubmissions).where(eq(paperOrderSubmissions.clientOrderId, clientOrderId)).limit(1);
      return row;
    },

    async getByIntentId(intentId: string) {
      const [row] = await db.select().from(paperOrderSubmissions).where(eq(paperOrderSubmissions.intentId, intentId)).limit(1);
      return row;
    },

    async listRecent(limit = 500) {
      return db.select().from(paperOrderSubmissions).orderBy(desc(paperOrderSubmissions.createdAt)).limit(limit);
    },

    async listActiveExitSubmissions() {
      return db.select({ clientOrderId: paperOrderSubmissions.clientOrderId, intentId: paperOrderSubmissions.intentId, status: paperOrderSubmissions.status }).from(paperOrderSubmissions).where(sql`${paperOrderSubmissions.clientOrderId} LIKE '%-exit-%' AND ${paperOrderSubmissions.status} NOT IN ('filled', 'canceled', 'cancelled', 'expired', 'rejected', 'failed')`);
    },

    async listExitPlans() {
      // Exit-plan metadata is shared by equities and crypto.  Filtering this
      // read to equities would silently leave crypto positions unmanaged.
      return db.select().from(paperOrderSubmissions).where(and(
        isNotNull(paperOrderSubmissions.entryPrice),
        isNotNull(paperOrderSubmissions.plannedStopPrice),
        isNotNull(paperOrderSubmissions.strategyKey),
        isNotNull(paperOrderSubmissions.strategyVersion),
        or(isNotNull(paperOrderSubmissions.plannedTargetPrice), isNotNull(paperOrderSubmissions.timeStopAt)),
      )).orderBy(desc(paperOrderSubmissions.createdAt));
    },

    async backfillExitPlan(input: { readonly intentId: string; readonly entryPrice: string; readonly plannedStopPrice: string; readonly plannedTargetPrice?: string; readonly strategyKey: string; readonly strategyVersion: string; readonly timeStopAt?: Date; readonly exitPlanReference: string }) {
      const [existing] = await db.select().from(paperOrderSubmissions).where(eq(paperOrderSubmissions.intentId, input.intentId)).limit(1);
      if (!existing) throw new Error("Paper order submission was not found.");
      if (existing.entryPrice || existing.plannedStopPrice || existing.strategyKey || existing.strategyVersion || existing.exitPlanReference) throw new Error("Paper order already has exit-plan metadata.");
      const [row] = await db.update(paperOrderSubmissions).set({ entryPrice: input.entryPrice, plannedStopPrice: input.plannedStopPrice, ...(input.plannedTargetPrice ? { plannedTargetPrice: input.plannedTargetPrice } : {}), strategyKey: input.strategyKey, strategyVersion: input.strategyVersion, ...(input.timeStopAt ? { timeStopAt: input.timeStopAt } : {}), exitPlanReference: input.exitPlanReference }).where(eq(paperOrderSubmissions.intentId, input.intentId)).returning();
      return row;
    },
  };
}
