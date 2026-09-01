# Legacy Paper Position Exit-Plan Runbook

Use this only for a paper position opened before exit-plan metadata was introduced.

## Produce the current review report

Before changing anything, run the read-only report on the Worker:

```sh
PATH=/mise/installs/node/22.23.2/bin:$PATH EXIT_PLAN_REVIEW=true node /app/apps/worker/dist/exit-plan-review-command.js
```

It prints bounded JSON for the latest persisted snapshot, including each position's `managed`/`review_required` state, exact missing fields, and the non-secret backfill input names. The broker review also reports filled quantity and broker-reported average fill price for each candidate order, so entry values can be reviewed against broker evidence. It does not contact Alpaca, write PostgreSQL, or submit an order. Only continue to the backfill step for a position with a reviewed broker-linked submission and operator-approved values.

## Review the proposed plan

For the current AAPL position, the stored point-in-time entry snapshot is `314.39`. The documented research-watchlist defaults are a stop 5% below entry (`298.67`) and a target 4% above entry (`326.97`). These are proposed values, not an automatic instruction.

## Apply an explicitly approved plan

For a legacy position with no persisted submission row, first select one or more exact filled Alpaca orders from the broker review report and use the guarded adoption command below. For aggregated positions, provide all fills; US-equity quantities must sum exactly, while crypto permits only the documented `0.0001` net-position dust tolerance. Each selected order is persisted separately, preserving broker provenance. The command validates the orders against the live paper account and writes provenance only; it never submits or cancels an order.

```sh
EXIT_PLAN_ADOPT=true \
EXIT_PLAN_ASSET_CLASS='us_equity' \
EXIT_PLAN_SYMBOL='PFD' \
EXIT_PLAN_ALPACA_ORDER_IDS='<reviewed filled order id>[,<second reviewed fill id>...]' \
# Optional when every selected broker fill includes an average fill price; the command then derives a weighted broker-linked entry.
EXIT_PLAN_ENTRY_PRICE='<optional reviewed entry price>' \
EXIT_PLAN_STOP_PRICE='<operator-approved stop>' \
EXIT_PLAN_TARGET_PRICE='<operator-approved target>' \
EXIT_PLAN_STRATEGY_KEY='<reviewed strategy key>' \
EXIT_PLAN_STRATEGY_VERSION='<reviewed strategy version>' \
EXIT_PLAN_REFERENCE='PFD-EXIT-PLAN-REVIEW-001' \
PATH=/mise/installs/node/22.23.2/bin:$PATH node /app/apps/worker/dist/exit-plan-adoption-command.js
```

Add `EXIT_PLAN_ADOPT_DRY_RUN=true` to the same command to validate all inputs and broker matches without opening PostgreSQL or writing provenance.

From a workstation linked to the production Railway project, the same guarded commands can be run with the Worker environment's server-side secrets pulled ephemerally (the values are never printed):

```sh
railway run --project '<project-id>' --environment '<environment-id>' --service '<worker-service-id>' --no-local -- \
  env EXIT_PLAN_ADOPT=true EXIT_PLAN_ADOPT_DRY_RUN=true \
  EXIT_PLAN_ASSET_CLASS='...' EXIT_PLAN_SYMBOL='...' \
  EXIT_PLAN_ALPACA_ORDER_IDS='...' EXIT_PLAN_ENTRY_PRICE='...' \
  EXIT_PLAN_STOP_PRICE='...' EXIT_PLAN_TARGET_PRICE='...' \
  EXIT_PLAN_STRATEGY_KEY='...' EXIT_PLAN_STRATEGY_VERSION='...' \
  EXIT_PLAN_REFERENCE='...' \
  pnpm --filter @momentum/worker exit-plan-adopt
```

When `EXIT_PLAN_ENTRY_PRICE` is omitted, the successful preflight JSON shows the weighted average of the selected broker-reported fills and uses that value as the entry. After reviewing the successful preflight JSON, remove `EXIT_PLAN_ADOPT_DRY_RUN=true` and run the identical command once. The command writes provenance only; it does not submit, cancel, or replace a broker order. Keep the Railway identifiers and all plan values operator-reviewed, and never paste secret environment values into a shell history or chat.

Use `EXIT_PLAN_TIME_STOP_AT` instead of `EXIT_PLAN_TARGET_PRICE` only when an explicit time stop is the reviewed plan.

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
PATH=/mise/installs/node/22.23.2/bin:$PATH node /app/apps/worker/dist/exit-plan-backfill-command.js
```

The command updates metadata only. It does not submit or cancel an order. It refuses to overwrite an existing plan and requires a bounded non-secret reference. Afterward, run the guarded position-management command and inspect its deterministic decision before enabling a recurring schedule.

Never use this procedure with live credentials or to invent an entry price from the current market.
