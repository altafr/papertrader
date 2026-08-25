# Paper Autopilot activation runbook

This runbook activates only Alpaca paper trading. It does not authorize live trading, change risk limits, or bypass deterministic approval, freshness, kill-switch, or reconciliation gates.

## Preconditions

- Confirm the Worker is healthy and the daily scheduler is scheduled in UTC.
- Confirm the first natural scheduler-audit run is persisted as completed or failed with bounded evidence, and both durable queues are present and drained.
- Confirm the latest reconciliation is fresh and the USD 100,000 baseline is verified.
- Confirm the fixed risk policy remains the lower of `0.25%` of equity and no more than `USD 100` planned loss per trade, with a maximum 5% adverse stop distance.
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

1. In Railway Worker variables, set `PAPER_AUTOPILOT_ENABLED=true` and `OPERATING_MODE=paper_autopilot` together.
2. Keep `TRADING_MODE=paper`, `ALPACA_PAPER_TRADE=true`, and the existing server-side paper credentials unchanged.
3. Restart/deploy the Worker and verify health. Startup reconciliation must complete before the scheduler becomes scheduled.
4. Run the guarded Paper Autopilot readiness and runtime-readiness checks again.
5. Start with a reviewed, deterministic, low-notional paper intent. No per-order operator confirmation is required after activation, but every submission still needs an unexpired risk approval and all execution-time gates.

## Rollback

Set `PAPER_AUTOPILOT_ENABLED=false` and `OPERATING_MODE=observe`, restart the Worker, and verify the scheduler/health state. If the kill switch or freshness gate blocks execution, do not override it; investigate and preserve the audit trail.

## Evidence

Record deployment ID, activation reference, UTC timestamps, readiness output, reconciliation capture time, queue counts, kill-switch state, and rollback decision. Never record Alpaca credentials, raw provider responses, or account secrets.
