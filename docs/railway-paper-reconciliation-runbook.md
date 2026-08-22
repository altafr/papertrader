# Railway paper reconciliation runbook

This runbook describes the one-run, read-only verification of the durable worker. It is not the procedure for enabling continuous scheduling or Paper Autopilot.

## Safety boundary

- The command reads the Alpaca **paper** account and writes one reconciled read model to Railway PostgreSQL.
- It does not submit, cancel, replace, or approve an order.
- `DURABLE_SCHEDULER_ENABLED` and `PAPER_AUTOPILOT_ENABLED` must remain disabled in persistent Railway variables.
- The broker and handler flags below are passed only to the one SSH process. They are not saved in Railway.
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

## Run exactly once

From an authenticated Railway CLI session, run this in the deployed worker. Replace the IDs only if the project/environment/service changes:

```sh
RAILWAY_CALLER='skill:use-railway@1.3.7' \
RAILWAY_AGENT_SESSION='railway-paper-one-run' \
railway ssh \
  --project dd693511-c5e0-4b47-af09-8c68cd2121f6 \
  --environment production \
  --service dd52c3be-ab1d-48b3-b16b-cd8d0efce9d1 \
  -- 'DURABLE_SCHEDULER_ONCE=true DURABLE_SCHEDULER_ENABLED=false BROKER_CONNECTION_ENABLED=true DAILY_PREPARATION_HANDLER_ENABLED=true PAPER_AUTOPILOT_ENABLED=false pnpm --filter @momentum/worker durable-one-run'
```

Expected success output is the generic line:

```text
Durable one-run paper reconciliation completed.
```

The process provisions the already-reviewed queues, consumes one immediate job, waits for completion, and shuts down. It does not create a recurring schedule.

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
