export { createDatabase, type Database } from "./client.js";
export { createAccountStateRepository, createStrategyLifecycleRepository, type PersistedAccountSnapshot, type PersistedStrategyLifecycleEvent } from "./repository.js";
export {
  accountSnapshots,
  accountSnapshotsRelations,
  activities,
  orders,
  positions,
  positionsRelations,
  strategyLifecycleEvents,
} from "./schema.js";

export const DATABASE_ADAPTER_STATUS = "not_configured" as const;
