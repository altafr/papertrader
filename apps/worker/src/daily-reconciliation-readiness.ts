import { getDurableSchedulerReadiness, type DurableSchedulerReadiness } from "./durable-scheduler.js";
import type { DatabaseMigrationReadiness } from "./database-migration-readiness.js";

export interface DailyReconciliationReadiness {
  readonly blockedReasons: readonly string[];
  readonly checks: {
    readonly migration: DatabaseMigrationReadiness;
    readonly scheduler: DurableSchedulerReadiness;
  };
  readonly status: "blocked" | "disabled" | "ready";
}

/** Compute scheduler readiness with command-scoped activation gates; does not start a queue. */
export function getDailyReconciliationActivationSchedulerReadiness(environment: NodeJS.ProcessEnv = process.env): DurableSchedulerReadiness {
  if (environment.DAILY_RECONCILIATION_ACTIVATION_PREFLIGHT !== "true") {
    throw new Error("DAILY_RECONCILIATION_ACTIVATION_PREFLIGHT must be exactly true for the activation rehearsal.");
  }
  return getDurableSchedulerReadiness({
    ...environment,
    BROKER_CONNECTION_ENABLED: "true",
    DAILY_PREPARATION_HANDLER_ENABLED: "true",
    DURABLE_SCHEDULER_ENABLED: "true",
  });
}

export function combineDailyReconciliationReadiness(input: { readonly migration: DatabaseMigrationReadiness; readonly scheduler: DurableSchedulerReadiness }): DailyReconciliationReadiness {
  const blockedReasons = [
    ...(input.migration.status === "ready" ? [] : input.migration.blockedReasons.map((reason) => reason.startsWith("migration_") ? reason : `migration_${reason}`)),
    ...(input.scheduler.status === "blocked" ? input.scheduler.blockedReasons.map((reason) => `scheduler_${reason}`) : []),
  ];
  const status = blockedReasons.length > 0 ? "blocked" : input.scheduler.status === "disabled" ? "disabled" : "ready";
  return { blockedReasons, checks: input, status };
}
