export { createDatabase, type Database } from "./client.js";
export { createAccountStateRepository, type PersistedAccountSnapshot } from "./repository.js";
export {
  accountSnapshots,
  accountSnapshotsRelations,
  positions,
  positionsRelations,
} from "./schema.js";

export const DATABASE_ADAPTER_STATUS = "not_configured" as const;
