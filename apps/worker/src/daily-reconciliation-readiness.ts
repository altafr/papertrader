import type { DurableSchedulerReadiness } from "./durable-scheduler.js";
import type { DatabaseMigrationReadiness } from "./database-migration-readiness.js";

export interface DailyReconciliationReadiness {
  readonly blockedReasons: readonly string[];
  readonly checks: {
    readonly migration: DatabaseMigrationReadiness;
    readonly scheduler: DurableSchedulerReadiness;
  };
  readonly status: "blocked" | "disabled" | "ready";
}

export function combineDailyReconciliationReadiness(input: { readonly migration: DatabaseMigrationReadiness; readonly scheduler: DurableSchedulerReadiness }): DailyReconciliationReadiness {
  const blockedReasons = [
    ...(input.migration.status === "ready" ? [] : input.migration.blockedReasons.map((reason) => `migration_${reason}`)),
    ...(input.scheduler.status === "blocked" ? input.scheduler.blockedReasons.map((reason) => `scheduler_${reason}`) : []),
  ];
  const status = blockedReasons.length > 0 ? "blocked" : input.scheduler.status === "disabled" ? "disabled" : "ready";
  return { blockedReasons, checks: input, status };
}
