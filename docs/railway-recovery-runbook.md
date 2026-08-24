# Railway recovery runbook

This runbook covers recovery of the paper-trading platform without enabling live trading or bypassing the deterministic gates. It is a procedure to review and rehearse; it does not claim that Railway backups or a restore drill have already been completed.

## Recovery boundaries

- PostgreSQL is the canonical application state for account snapshots, orders, audit provenance, queue state, and read models.
- Alpaca paper-account truth remains authoritative after recovery; reconcile it before resuming any worker or scheduler.
- Vercel is a replaceable dashboard surface. It must never be used as the source of financial truth.
- Railway service variables are secrets/configuration state and require a separate export/re-entry procedure; never put their values in a dump or ticket.
- Keep `DURABLE_SCHEDULER_ENABLED`, `DAILY_PREPARATION_HANDLER_ENABLED`, `BROKER_CONNECTION_ENABLED`, and `PAPER_AUTOPILOT_ENABLED` disabled during restoration.

## Before an incident

1. In Railway PostgreSQL, enable scheduled volume backups and point-in-time recovery according to the project plan; record retention and earliest recoverable timestamp in the operator change record.
2. Create an off-platform logical PostgreSQL dump using an approved secret channel and restricted storage. Do not print `DATABASE_URL` or include it in the dump filename.
3. Record the current Git commit, Railway API/Worker deployment IDs, migration ledger status, service-variable names (not values), and the latest verified reconciliation run ID.
4. Test that the dump can be downloaded and that its checksum is recorded separately from the dump contents.

## Restore drill (non-production target)

1. Create or select an isolated Railway environment/database; never restore over production first.
2. Restore the logical dump or point-in-time snapshot into that isolated database.
3. Apply only the reviewed migrations needed to reach the recorded schema version; application startup must not auto-migrate.
4. Run the guarded database-status and durable-status commands. Both durable queues must be present and drained before any worker test.
5. Start API/Worker with paper mode and all broker/scheduler/autopilot gates disabled.
6. Run a read-only read-model query and confirm audit rows, migration ledger, queue tables, and constraints are present. Do not infer broker truth from the restored snapshot.
7. Run one separately approved paper reconciliation against Alpaca paper, then verify fresh capture, persisted audit provenance, and dashboard read-only visibility.
8. Record restore duration, recovered timestamp, migration version, queue counts, reconciliation result, and any data loss window. Delete the isolated drill environment only through an explicitly reviewed change.

## Production incident recovery

1. Pause new activity by keeping scheduler, handler, broker, and Paper Autopilot flags disabled; do not change live mode.
2. Preserve bounded logs, deployment IDs, queue counts, and the last successful reconciliation metadata. Avoid copying account values or credentials into chat.
3. Choose the recovery point with the smallest safe data-loss window. Restore PostgreSQL to a new service/volume where practical, keeping the original available for investigation.
4. Verify schema, migration ledger, constraints, audit provenance, and queue state before routing API/Worker traffic to the recovered database.
5. Re-enter secrets through Railway secret storage, restart API/Worker, and verify health while all execution gates remain disabled.
6. Run an operator-approved paper reconciliation and compare broker truth to the recovered read model. Resume only after freshness, queue drain, kill-switch, and paper-mode checks pass.

## Rollback and abort

If any restore check fails, stop the recovered Worker, keep all persistent execution gates disabled, and retain the original database/service. Do not delete the original recovery source or retry a broker reconciliation blindly. Escalate with the generic failure code, migration version, queue counts, and timestamps only.

## Evidence required for sign-off

- Backup/PITR configuration and retention recorded.
- Successful isolated restore drill with checksum and timing.
- Migration ledger and schema constraints verified.
- Queue and dead-letter counts verified as present/drained.
- Paper reconciliation and audit provenance verified after restore.
- API/Worker health verified with execution gates disabled.
- Recovery owner, rollback decision, and next drill date recorded. Only then may the operator set `RECOVERY_DRILL_VERIFIED=true` together with bounded `RECOVERY_DRILL_APPROVAL_REFERENCE` and UTC `RECOVERY_DRILL_VERIFIED_AT` values.
