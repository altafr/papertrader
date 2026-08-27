# Paper Autopilot activation runbook

This runbook activates only Alpaca paper trading. It does not authorize live trading, change risk limits, or bypass deterministic approval, freshness, kill-switch, or reconciliation gates.

## Preconditions

- Confirm the Worker is healthy and the daily scheduler is scheduled in UTC.
- Confirm the first natural scheduler-audit run is persisted as completed or failed with bounded evidence, and both durable queues are present and drained.
- Confirm the latest reconciliation is fresh and the USD 100,000 baseline is verified.
- Confirm the fixed risk policy remains no more than `5%` of invested notional planned loss per trade, with a maximum 5% adverse stop distance.
- Confirm the global kill switch is inactive and Telegram alert configuration is ready.
- Record a bounded, non-secret activation reference. Never put credentials in the reference.

## Read-only rehearsal

Run the hosted runtime-readiness command with command-scoped values only:

```sh
PAPER_AUTOPILOT_RUNTIME_READINESS=true \
PAPER_AUTOPILOT_ENABLED=true \
OPERATING_MODE=paper_autopilot \
pnpm --filter @momentum/worker paper-autopilot-runtime-readiness
```

Require `status:"ready"`, a fresh reconciliation, `globalKillSwitchActive:false`, and no blocked reasons. This command must not mutate Railway variables, enqueue work, or call Alpaca.

## Persistent activation

1. In Railway Worker variables, set `PAPER_AUTOPILOT_ENABLED=true` and `OPERATING_MODE=paper_autopilot` together. Keep `PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED=false` (or absent) while reviewing scheduled risk decisions.
2. Keep `TRADING_MODE=paper`, `ALPACA_PAPER_TRADE=true`, and the existing server-side paper credentials unchanged.
3. Restart/deploy the Worker and verify health. Startup reconciliation must complete before the scheduler becomes scheduled.
4. Run the guarded Paper Autopilot readiness and runtime-readiness checks again.
5. Start with a reviewed, deterministic, low-notional paper intent. No per-order operator confirmation is required after activation, but every submission still needs an unexpired risk approval and all execution-time gates.

## One bounded paper-order handoff

After the dry-run evidence is reviewed, enable `PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED=true` only for the controlled execution check. Use a single-share quantity and a fresh research run, then verify the persisted client order ID, Alpaca order status, immediate reconciliation, and Telegram entry/reconciliation alerts. Disable the flag again after the check if continuous scheduled order submission is not yet approved. The scheduled path never treats an approved risk decision as broker authority while this flag is off.

The no-write `paper-order-preflight` command reports `paper_order_submission_gate_disabled` until this flag is set. A `ready` preflight requires the paper baseline, a persisted research artifact, a fresh market snapshot, and the explicit submission gate; it never submits an order itself.

For a one-shot execution check, run `paper-order-from-research` inside the Worker with `PAPER_ORDER_FROM_RESEARCH_ONCE=true`, `PAPER_ORDER_RESEARCH_RUN_ID=<fresh-run-id>`, `PAPER_ORDER_APPROVAL_REFERENCE=<bounded-reference>`, `PAPER_AUTOPILOT_ENABLED=true`, `OPERATING_MODE=paper_autopilot`, and `PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED=true`. Keep `PAPER_ORDER_QUANTITY=1`; the command reconciles before and after submission and prints only redacted outcome metadata. Scheduled broker-enabled cycles are additionally bounded to one candidate per cycle and re-reconcile before the next candidate. Do not persist the submission flag unless continuous scheduled order submission has separately been approved.

Run this command from a Railway-hosted Worker runtime. `railway run` starts the child process locally, so a `DATABASE_URL` containing a `*.railway.internal` hostname is not resolvable from a developer laptop. If a local rehearsal is required, use a separately provisioned public PostgreSQL connection as a command-scoped `DATABASE_URL`; never print or commit that value. The production Worker should continue using the private database URL.

## Rollback

Set `PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED=false`, `PAPER_AUTOPILOT_ENABLED=false`, and `OPERATING_MODE=observe`, restart the Worker, and verify the scheduler/health state. If the kill switch or freshness gate blocks execution, do not override it; investigate and preserve the audit trail.

## Evidence

Record deployment ID, activation reference, UTC timestamps, readiness output, reconciliation capture time, queue counts, kill-switch state, and rollback decision. Never record Alpaca credentials, raw provider responses, or account secrets.
