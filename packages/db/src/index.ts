export { createDatabase, type Database } from "./client.js";
export { createAccountStateRepository, createAgentRunRepository, createDurableScheduleRunRepository, createPaperOrderRepository, createShadowObservationRepository, createStrategyLifecycleRepository, createTechSolverRepository, createTelegramAlertRepository, type PersistedAccountSnapshot, type PersistedAgentArtifact, type PersistedAgentRun, type PersistedDurableOneRunProvenance, type PersistedDurableScheduleRun, type PersistedPaperBaselineConfirmation, type PersistedPaperOrderSubmission, type PersistedPaperPromotionEvidence, type PersistedShadowObservation, type PersistedShadowObservationOutcome, type PersistedStrategyLifecycleEvent, type PersistedTechSolverAttempt, type PersistedTelegramAlertEvent } from "./repository.js";
export {
  accountSnapshots,
  accountSnapshotsRelations,
  activities,
  agentRuns,
  durableScheduleRuns,
  orders,
  positions,
  positionsRelations,
  paperOrderSubmissions,
  paperBaselineConfirmations,
  strategyLifecycleEvents,
  shadowObservationOutcomes,
  shadowObservations,
  strategyPaperEvidence,
  techSolverCases,
  telegramAlertEvents,
} from "./schema.js";

export const DATABASE_ADAPTER_STATUS = "not_configured" as const;
