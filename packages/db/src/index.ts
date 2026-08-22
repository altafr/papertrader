export { createDatabase, type Database } from "./client.js";
export { createAccountStateRepository, createShadowObservationRepository, createStrategyLifecycleRepository, type PersistedAccountSnapshot, type PersistedPaperPromotionEvidence, type PersistedShadowObservation, type PersistedShadowObservationOutcome, type PersistedStrategyLifecycleEvent } from "./repository.js";
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
  strategyPaperEvidence,
} from "./schema.js";

export const DATABASE_ADAPTER_STATUS = "not_configured" as const;
