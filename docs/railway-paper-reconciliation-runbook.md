# Railway paper reconciliation runbook

This runbook describes the one-run, read-only verification of the durable worker. It is not the procedure for enabling continuous scheduling or Paper Autopilot.

## Safety boundary

- The command reads the Alpaca **paper** account and writes one reconciled read model to Railway PostgreSQL.
- It does not submit, cancel, replace, or approve an order.
- `DURABLE_SCHEDULER_ENABLED` and `PAPER_AUTOPILOT_ENABLED` must remain disabled in persistent Railway variables.
- If persistent scheduling is later reviewed for activation, it additionally requires the non-secret `DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE`; this is an activation reference, not approval for individual paper orders.
- The broker and handler flags below are passed only to the one SSH process. They are not saved in Railway.
- The approval reference below is a bounded, non-secret operator/ticket reference passed only to the one SSH process. It is not a credential and is not saved as a persistent Railway variable.
- Never paste connection strings, Alpaca keys, Clerk secrets, or command output containing secrets into chat or source control.

## Before running

Confirm the following in Railway's worker service:

1. `TRADING_MODE=paper`
2. `ALPACA_PAPER_TRADE=true`
3. `DATABASE_URL` is present (normally the reference `${{Postgres.DATABASE_URL}}`)
4. `BROKER_CONNECTION_ENABLED` is not persistently enabled
5. `DURABLE_SCHEDULER_ENABLED`, `DAILY_PREPARATION_HANDLER_ENABLED`, and `PAPER_AUTOPILOT_ENABLED` are absent or `false`
6. The guarded readiness check reports `status: "disabled"`:

```sh
DURABLE_QUEUE_READINESS=true pnpm --filter @momentum/worker durable-readiness
```

7. You have an explicit operator approval reference for this one-run (for example, a change ticket ID). Do not use an Alpaca key, account value, or other secret as the reference.

For a database-only probe, run the separate guarded command first. It performs
only `SELECT 1` and does not contact Alpaca or start a queue:

```sh
env DATABASE_STATUS=true pnpm --filter @momentum/worker database-status
```

Expected output is `{"databaseReachable":true}`. The command must not be
persistently enabled.

## Rehearse daily scheduler activation

Before changing persistent Railway variables, run the read-only activation rehearsal. It uses a command-scoped reference and overlays the scheduler, handler, and broker gates in memory only:

```sh
DAILY_RECONCILIATION_READINESS=true \
DAILY_RECONCILIATION_ACTIVATION_PREFLIGHT=true \
DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE=scheduler-review-123 \
pnpm --filter @momentum/worker daily-reconciliation-activation-preflight
```

The expected result is `status:"ready"` only when migration readiness and all simulated paper prerequisites pass. The rehearsal creates no queue client, makes no Alpaca request, writes no reconciliation state, and does not alter persistent variables. A ready rehearsal does not itself authorize activation.

## Run exactly once

From an authenticated Railway CLI session, run this in the deployed worker. Replace the IDs only if the project/environment/service changes:

```sh
RAILWAY_CALLER='skill:use-railway@1.3.7' \
RAILWAY_AGENT_SESSION='railway-paper-one-run' \
railway ssh \
  --project dd693511-c5e0-4b47-af09-8c68cd2121f6 \
  --environment production \
  --service dd52c3be-ab1d-48b3-b16b-cd8d0efce9d1 \
  -- 'DURABLE_SCHEDULER_ONCE=true DURABLE_SCHEDULER_APPROVAL_REFERENCE=ticket-123 DURABLE_SCHEDULER_ENABLED=false BROKER_CONNECTION_ENABLED=true DAILY_PREPARATION_HANDLER_ENABLED=true PAPER_AUTOPILOT_ENABLED=false pnpm --filter @momentum/worker durable-one-run'
```

Expected success output is bounded JSON metadata:

```text
{"approvalReference":"ticket-123","runId":"run-2026-08-23","status":"completed"}
```

The operator-facing `runId` is retained in the payload and audit provenance; the internal pg-boss job identifier is a deterministic UUID derived from it.

The process verifies that the already-reviewed queues are present, consumes one immediate job, waits for completion, and shuts down. Queue creation belongs to the separate guarded migration command; this process does not create a recurring schedule.

### Compiled command path in Railway SSH

The deployed Worker image keeps compiled command entrypoints beneath
`/app/apps/worker/dist`, not `/app/dist`. For read-only diagnostics that are
intended to run inside the deployed image, use the full path, for example:

```sh
RAILWAY_CALLER='skill:use-railway@1.3.7' \
RAILWAY_AGENT_SESSION='railway-paper-read-only' \
railway ssh \
  --project dd693511-c5e0-4b47-af09-8c68cd2121f6 \
  --environment production \
  --service dd52c3be-ab1d-48b3-b16b-cd8d0efce9d1 \
  -- 'PAPER_PERFORMANCE_REPORT=true node apps/worker/dist/paper-performance-report-command.js'
```

This command is read-only: it reads persisted paper snapshots and emits the
bounded performance report. It does not submit, cancel, or modify broker
orders. Never print or persist the environment values containing credentials.

## Verify and close out

After the command exits:

1. Confirm the command exited `0` and printed no secret values.
2. Inspect queue presence and bounded counts without starting a scheduler:

```sh
DURABLE_QUEUE_STATUS=true pnpm --filter @momentum/worker durable-status
```

3. Confirm the authenticated dashboard's Operations Health card shows an updated reconciliation capture and still shows Scheduler and Paper Autopilot as disabled.
4. Re-list persistent worker variables and confirm the broker, handler, scheduler, and autopilot flags remain absent or `false`.
5. Record the deployment ID, timestamp, generic command result, queue counts, and dashboard observation in `progress-tracker.md`; do not record account values or credentials.

## Failure handling

The command has a bounded timeout and exits non-zero on a failed reconciliation. Do not retry repeatedly. Preserve the generic failure output, inspect bounded Railway worker logs for infrastructure symptoms, and leave persistent flags disabled until the cause is reviewed. A failed run does not authorize enabling continuous scheduling or Paper Autopilot.

## Separate recurring-scheduler activation and rollback

Do not activate recurring scheduling as part of a one-run verification. Activation is a separate operator decision and requires the successful rehearsal above plus a new, recorded activation reference.

Before activation, record the current values of these Worker variables and confirm the global kill switch is inactive:

- `DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE` — bounded non-secret review reference
- `DURABLE_SCHEDULER_ENABLED=true`
- `DAILY_PREPARATION_HANDLER_ENABLED=true`
- `BROKER_CONNECTION_ENABLED=true`
- `PAPER_AUTOPILOT_ENABLED=false`

Apply those changes together through the Railway variable UI or an authenticated, reviewed CLI change. Restart the Worker, then verify private Worker Health reports a scheduled/ready durable scheduler, the UTC cron, and no degraded state. Observe one scheduled cycle and confirm the queue, audit provenance, reconciliation freshness, and dashboard result.

Rollback is immediate and fail-closed: set `DURABLE_SCHEDULER_ENABLED=false`, `DAILY_PREPARATION_HANDLER_ENABLED=false`, and `BROKER_CONNECTION_ENABLED=false`, leave `PAPER_AUTOPILOT_ENABLED=false`, restart the Worker, and verify health returns to disabled/observe mode. Do not delete queue or audit data during rollback; preserve it for diagnosis and reconciliation.
