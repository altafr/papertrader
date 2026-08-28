# Momentum Autopilot — Project Context Pack

[![Paper-only verification](https://github.com/altafr/papertrader/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/altafr/papertrader/actions/workflows/ci.yml)

This folder contains the project context for a continuously running, multi-agent trading application with a Next.js dashboard on Vercel and a Railway backend connected to Alpaca.

## Product intent

Momentum Autopilot researches US stocks and supported crypto assets, prepares a daily plan, monitors live markets, ranks opportunities, submits risk-approved orders, reconciles fills, and displays live performance. It begins in paper trading and can move to live trading only after explicit readiness gates are passed.

## Files

1. `project-overview.md` — product, users, flows, requirements, scope, and release criteria.
2. `architecture.md` — agents, services, data model, Alpaca integration, security, and invariants.
3. `ui-context.md` — trading dashboard, control surfaces, states, and design system.
4. `code-standards.md` — implementation rules for financial calculations, agents, APIs, and tests.
5. `ai-workflow-rules.md` — how development agents should build and verify the system safely.
6. `progress-tracker.md` — delivery phases, decisions, blockers, and verification state.
7. `AGENTS.md` — root-level instructions telling development agents how to use the context pack.

The engineer-facing layered architecture diagram is in [`docs/architecture-block-diagram.md`](docs/architecture-block-diagram.md).

The guarded Telegram provider test procedure is in [`docs/telegram-alert-test-runbook.md`](docs/telegram-alert-test-runbook.md).

## Important integration distinction

- The Alpaca MCP server can support research and operator workflows in a compatible MCP client.
- A development-client MCP connection supplies context while building; it is not automatically part of the published app runtime.
- The deployed trading engine must use Alpaca's authenticated Trading and Market Data APIs from server-side infrastructure. Live streams use Alpaca WebSockets.
- Alpaca credentials must exist only in Railway service secret variables. Never paste keys into chat or commit them.

## Build order

1. Create the strict TypeScript Next.js project for Vercel and keep these files at the repository root.
2. Provision the Railway API, persistent worker, and PostgreSQL services; select a compatible authentication provider.
3. Create/reset the Alpaca paper account to the configured `USD 100,000` baseline, then add **paper trading** keys only to Railway API and worker service secret variables. Never paste their values into chat or source control.
4. Build the read-only dashboard and persisted audit log.
5. Add historical replay and strategy evaluation.
6. Add paper order submission behind the deterministic risk engine.
7. Add durable schedules and live stream workers.
8. Complete the live-readiness checklist before adding live credentials.

For the controlled hosted paper reconciliation procedure, see [`docs/railway-paper-reconciliation-runbook.md`](docs/railway-paper-reconciliation-runbook.md). It uses command-scoped Railway flags only; continuous scheduling and Paper Autopilot remain separate gates.

## Local workspace

- `apps/web` — Next.js dashboard for Vercel.
- `apps/api` — authenticated API boundary for Railway.
- `apps/worker` — durable job and stream-worker boundary for Railway.
- `packages/domain` — infrastructure-independent contracts.
- `packages/db` — PostgreSQL boundary; intentionally not configured in Phase 0.1.
- `packages/alpaca` — server-only broker boundary; intentionally not configured in Phase 0.1.
- `packages/config` — typed server configuration helpers.

Use `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` for the local verification loop. Phase 0.1 contains no credentials, broker request, database connection, or order behavior.

GitHub Actions runs the same locked, paper-only verification loop on pushes to `main`, every pull request, and manual `workflow_dispatch` runs. The workflow has read-only repository permissions and does not receive broker, database, Clerk, or deployment secrets.

Monitor runs or start a manual verification from the [GitHub Actions workflow page](https://github.com/altafr/papertrader/actions/workflows/ci.yml).

Hosted health monitors:

- [Railway API health](https://api-production-e0a6.up.railway.app/health)
- [Railway Worker health](https://worker-production-b362.up.railway.app/health)
- [Vercel dashboard](https://papertrader-web.vercel.app)

The health endpoints expose redacted operational state only. They do not expose credentials or provide order authority.

The current hosted runtime is Paper Autopilot with continuous crypto research, deterministic risk approval, idempotent paper execution, reconciliation, and position management enabled. Positions without stored exit-plan metadata are surfaced as `Review required` and remain fail-closed; they are never silently treated as managed. The dashboard and account CSV expose this status after Clerk authentication.

When the protected GitHub Actions secrets `OPERATOR_AUTH_TOKEN` and optional `OPERATOR_API_BASE_URL` are configured, the workflow also runs `pnpm verify:operator-overview` against the hosted authenticated overview and CSV contracts. If the token secret is absent, that live check is explicitly skipped; all local contract tests still run.

The workflow always runs the credential-free `pnpm verify:operator-auth-boundary` check, which confirms the hosted operator JSON and CSV routes reject unauthenticated requests with `401`.

The server must run daily preparation, health, reconciliation, and evaluation independently of an open browser. Paper Autopilot does not require per-order human confirmation, but every order still requires deterministic risk approval. The initial paper baseline is `USD 100,000` (Alpaca's current default); estimated loss at the planned stop is limited to `5%` of invested notional, with a maximum 5% adverse stop distance.

Railway PostgreSQL is the selected system of record. Railway also hosts the authenticated API, PostgreSQL-backed durable jobs, and persistent Alpaca market/trading WebSocket worker. Vercel hosts only the dashboard and contains no Alpaca credentials or direct order authority.

For the Alpaca MCP connection, configure `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, `ALPACA_PAPER_TRADE=true`, and a least-privilege `ALPACA_TOOLSETS` list in the MCP client's environment/secret configuration. Do not place their values in these files.

### Phase 0.4 operator setup

1. In Alpaca, select the Paper Trading account. Verify the account balance is the required `USD 100,000` baseline; create a new paper account if necessary. Generate fresh paper API keys after creating an account.
2. In Railway, set `APP_ENVIRONMENT=production-paper`, `TRADING_MODE=paper`, `ALPACA_PAPER_TRADE=true`, and leave `BROKER_CONNECTION_ENABLED=false` until the later read-only broker adapter is implemented.
3. Add the paper `ALPACA_API_KEY` and `ALPACA_SECRET_KEY` only to the Railway API and worker service variables. Seal both values after saving them. Do not put them in Vercel, GitHub, `.env.example`, browser code, logs, or PostgreSQL.
4. Keep the repository template in `.env.example` as names and safe defaults only. The API and worker fail closed if live mode is requested, paper mode is disabled, or broker access is enabled without both credentials.

### Telegram alert channel

Telegram is the selected primary notification provider. Keep `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` only in the Railway worker service variables. Leave `TELEGRAM_ALERTS_ENABLED=false` until the guarded channel test has passed. To send one approved test message, use the deployed worker with command-scoped `TELEGRAM_ALERTS_ENABLED=true`, `TELEGRAM_ALERT_TEST=true`, and a bounded `TELEGRAM_ALERT_TEST_APPROVAL_REFERENCE`, then run `pnpm --filter @momentum/worker telegram-alert-test`. The command prints only a generic success/failure message and never prints the token, chat ID, or Telegram response.

### Phase 1 Clerk setup

Create one Clerk application for the dashboard. Set the publishable key, secret key, exact operator user ID, and authorized Vercel origin only in the relevant hosted service variables. Vercel requires `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_OPERATOR_USER_ID`, and `CLERK_AUTHORIZED_PARTIES`; Railway API requires server-side `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_OPERATOR_USER_ID`, and `CLERK_AUTHORIZED_PARTIES`. The API rejects missing or non-operator sessions. Do not enable public application authority through a frontend route guard alone.

### Phase 1.2 account read setup

The reviewed migration is `packages/db/migrations/0001_account_read_models.sql`. Apply it through Railway's controlled migration process; the application does not run migrations automatically at startup. The authenticated Railway API exposes `GET /v1/account`, which remains `503 broker_not_configured` until `BROKER_CONNECTION_ENABLED=true`. Only then does it read the existing paper Alpaca credentials from Railway server variables. The adapter is read-only and accepts only `https://paper-api.alpaca.markets`; it has no order methods.

The account response now includes normalized account, positions, orders, and account-activity data. The database reconciliation repository writes the account snapshot and positions in one transaction, refreshes broker order status idempotently, and inserts activities append-only. No reconciliation is run automatically until the migration and explicit operator enablement are complete.

After reconciliation, authenticated `GET /v1/read-model` reads only the persisted latest snapshot and returns positions, orders, activities, capture time, and freshness age. It returns `503 db_not_configured` without `DATABASE_URL` and never runs migrations automatically.

The authenticated dashboard reads that endpoint server-side and displays paper/read-only status, account values, freshness, positions, orders, and activities. It shows an explicit unavailable state until Clerk, the API URL, the migration, and a first reconciliation are ready.

The authenticated server API also exposes `GET /v1/assets` when paper broker access is explicitly enabled. It returns only active, tradable US equities and crypto assets from Alpaca. This is discovery data, not a strategy watchlist, liquidity approval, or order authority.

The dashboard now renders the persisted account, positions, orders/fills, and activity read model with explicit fresh/delayed/stale states. Performance curves, alert feeds, and market/trade stream status remain visibly unavailable until those persisted services are implemented; the dashboard does not infer or fabricate them.

For an operator-observed broker comparison, the authenticated API exposes `GET /v1/reconciliation-status`. It compares the latest persisted account snapshot with a fresh paper Alpaca account read and returns only a match/mismatch result and field names. It is deliberately not called automatically by the dashboard.

Protected market-data reads are available through `GET /v1/market-data/bars?asset_class=us_equity&symbols=AAPL,MSFT&timeframe=1Day&limit=100` and `GET /v1/market-data/snapshots?asset_class=crypto&symbols=BTC/USD,ETH/USD`. Both require the same authenticated operator session and explicit paper broker opt-in, validate requests server-side, and return normalized data without granting strategy or order authority.

After applying the migration in Railway, run the worker's guarded one-shot reconciliation with `RECONCILE_ONCE=true pnpm --filter @momentum/worker reconcile`. The command also requires the existing paper-only variables, `BROKER_CONNECTION_ENABLED=true`, Railway `DATABASE_URL`, and server-side paper credentials. It is intentionally not part of worker startup or health checks.

## First implementation prompt

```text
Read AGENTS.md and all six project context files. Build only Phase 0.1 from progress-tracker.md: initialize Git and scaffold the strict TypeScript workspace with separate web, API, worker, domain, database, Alpaca-adapter, and configuration boundaries. Do not provision hosted resources, add credentials, call Alpaca, create order behavior, or begin Phase 1. Run the local quality checks and update progress-tracker.md with exact results.
```

## Disclaimer

This is a software specification, not investment advice or a claim of profitability. Momentum strategies can lose money. Paper results do not predict live results, and live execution must remain bounded by documented risk controls.
