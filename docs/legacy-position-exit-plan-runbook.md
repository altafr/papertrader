# Legacy Paper Position Exit-Plan Runbook

Use this only for a paper position opened before exit-plan metadata was introduced.

## Produce the current review report

Before changing anything, run the read-only report on the Worker:

```sh
EXIT_PLAN_REVIEW=true node /app/apps/worker/dist/exit-plan-review-command.js
```

It prints bounded JSON for the latest persisted snapshot, including each position's `managed`/`review_required` state, exact missing fields, and the non-secret backfill input names. It does not contact Alpaca, write PostgreSQL, or submit an order. Only continue to the backfill step for a position with a reviewed broker-linked submission and operator-approved values.

## Review the proposed plan

For the current AAPL position, the stored point-in-time entry snapshot is `314.39`. The documented research-watchlist defaults are a stop 5% below entry (`298.67`) and a target 4% above entry (`326.97`). These are proposed values, not an automatic instruction.

## Apply an explicitly approved plan

Run the guarded command on the Railway Worker only after reviewing the values:

```sh
EXIT_PLAN_BACKFILL=true \
EXIT_PLAN_INTENT_ID='<intent id>' \
EXIT_PLAN_ENTRY_PRICE='314.39' \
EXIT_PLAN_STOP_PRICE='298.67' \
EXIT_PLAN_TARGET_PRICE='326.97' \
EXIT_PLAN_STRATEGY_KEY='research-watchlist' \
EXIT_PLAN_STRATEGY_VERSION='1.0.0' \
EXIT_PLAN_REFERENCE='AAPL-EXIT-PLAN-001' \
node /app/apps/worker/dist/exit-plan-backfill-command.js
```

The command updates metadata only. It does not submit or cancel an order. It refuses to overwrite an existing plan and requires a bounded non-secret reference. Afterward, run the guarded position-management command and inspect its deterministic decision before enabling a recurring schedule.

Never use this procedure with live credentials or to invent an entry price from the current market.
