export { createDatabase, type Database } from "./client.js";
export { createAccountStateRepository, createShadowObservationRepository, createStrategyLifecycleRepository, type PersistedAccountSnapshot, type PersistedShadowObservation, type PersistedShadowObservationOutcome, type PersistedStrategyLifecycleEvent } from "./repository.js";
export {
  accountSnapshots,
  accountSnapshotsRelations,
  activities,
  orders,
  positions,
  positionsRelations,
  strategyLifecycleEvents,
  shadowObservationOutcomes,
  shadowObservations,
} from "./schema.js";

export const DATABASE_ADAPTER_STATUS = "not_configured" as const;
