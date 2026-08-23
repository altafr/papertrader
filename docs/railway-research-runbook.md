# Railway paper research one-run runbook

This is a separately approved, single paper market-data read and agent-run persistence check. It is not a procedure for enabling recurring research, Paper Autopilot, or live trading.

## Required command-scoped gates

Before running, confirm the deployed worker is paper-only and migration `0008` is applied. Keep all persistent scheduler, handler, broker, durable, and Paper Autopilot flags disabled.

The one-run process requires all of these variables on the SSH command only:

- `RESEARCH_MARKET_RUN_ONCE=true`
- `RESEARCH_MARKET_OPERATOR_APPROVAL=true`
- `RESEARCH_MARKET_APPROVAL_REFERENCE=<non-secret ticket or change reference>`
- `BROKER_CONNECTION_ENABLED=true`
- `TRADING_MODE=paper`
- `ALPACA_PAPER_TRADE=true`
- `RESEARCH_AGENT_TYPE=stock_research` or `crypto_research`
- `RESEARCH_SYMBOLS` containing the reviewed bounded symbols

The approval reference is recorded only as provenance if a future persistence flow chooses to retain it; never use a credential or account value as the reference.

## Guarded command

Before the one-run command, validate the complete command-scoped configuration without constructing clients:

```sh
RESEARCH_MARKET_PREFLIGHT=true RESEARCH_MARKET_RUN_ONCE=true RESEARCH_MARKET_OPERATOR_APPROVAL=true RESEARCH_MARKET_APPROVAL_REFERENCE=ticket-123 BROKER_CONNECTION_ENABLED=true TRADING_MODE=paper ALPACA_PAPER_TRADE=true RESEARCH_AGENT_TYPE=stock_research RESEARCH_SYMBOLS=AAPL RESEARCH_TIMEFRAME=1Day RESEARCH_LIMIT=20 RESEARCH_MAX_CANDIDATES=5 pnpm --filter @momentum/worker research-market-preflight
```

The preflight prints bounded metadata only. It must pass before the one-run command below is considered.

Run once from the deployed worker after explicit operator approval. Replace IDs only if the Railway project/environment/service changes:

```sh
RAILWAY_CALLER='skill:use-railway@1.3.7' \
RAILWAY_AGENT_SESSION='railway-research-one-run' \
railway ssh \
  --project dd693511-c5e0-4b47-af09-8c68cd2121f6 \
  --environment production \
  --service dd52c3be-ab1d-48b3-b16b-cd8d0efce9d1 \
  -- 'RESEARCH_MARKET_RUN_ONCE=true RESEARCH_MARKET_OPERATOR_APPROVAL=true RESEARCH_MARKET_APPROVAL_REFERENCE=ticket-123 BROKER_CONNECTION_ENABLED=true TRADING_MODE=paper ALPACA_PAPER_TRADE=true RESEARCH_AGENT_TYPE=stock_research RESEARCH_SYMBOLS=AAPL RESEARCH_TIMEFRAME=1Day RESEARCH_LIMIT=20 RESEARCH_MAX_CANDIDATES=5 pnpm --filter @momentum/worker research-market-run-once'
```

Expected output is the generic success line `Market research run completed.`. A failure must remain generic; do not retry repeatedly without review.

## Verify and close out

Record only the deployment ID, timestamp, approval reference, generic result, and bounded run metadata from the authenticated dashboard/API. Do not record market payloads, account values, credentials, or raw logs. Confirm persistent scheduler, handler, broker, durable, and Paper Autopilot flags remain disabled after the command exits.

This command reads paper market data once and persists one research artifact. It does not submit, cancel, replace, or approve orders, and it does not start a recurring scheduler.
