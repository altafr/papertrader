# Architecture Context

## Status

- **Stage:** Phase 3.11 restart-safe shadow evaluation runner implemented; Railway migration and first operator-run reconciliation remain operational dependencies.
- **Initial environment:** Alpaca paper trading only.
- **Primary timezone:** Store timestamps in UTC; display exchange time and operator-local time explicitly.
- **Core principle:** AI agents propose and explain; deterministic services authorize, submit, and reconcile.

## Platform Architecture

| Layer | Technology/choice | Responsibility |
| --- | --- | --- |
| Web application | Strict TypeScript Next.js application hosted on Vercel | Authenticated dashboard and controls; no direct broker authority |
| Styling/components | Accessible React component system selected during setup | Responsive operational UI |
| Database | Railway PostgreSQL | Canonical application state, constraints, transactions, audit data, and reconciled read models |
| Authentication | Clerk (`@clerk/nextjs` plus Railway-side token verification) | Single-operator identity; Railway API verifies every authenticated command and enforces the operator allowlist |
| Server secrets | Railway service variables; Vercel holds only frontend/auth values it requires | Alpaca credentials remain exclusively in Railway backend/worker services |
| Server API | TypeScript API service on Railway | Authenticated commands, protected Alpaca REST access, dashboard read endpoints, and health |
| PostgreSQL access | Drizzle ORM and Drizzle Kit over `node-postgres` | Typed queries, reviewed SQL migrations, PostgreSQL-native constraints, and explicit transactions |
| Durable orchestration | Railway persistent worker plus `pg-boss`; Railway cron only for bounded triggers | Daily schedules, retries, timeouts, workflows, reconciliation, and recovery |
| Runtime contracts | Zod | Validate environment, HTTP, database-boundary, queue, and external-provider payloads before domain use |
| Financial arithmetic | `decimal.js` with explicitly configured precision and rounding | Decimal-safe money, price, quantity, P/L, exposure, fee, and risk calculations |
| Live market worker | Railway persistent worker; Hostinger VPS or Render worker remain alternatives | Long-lived Alpaca market/trade WebSockets, supervised reconnect, gap detection, and transactional writes to PostgreSQL |
| Trading integration | Alpaca Trading API | Account, orders, positions, portfolio and activity |
| Market data | Alpaca Market Data REST/WebSocket APIs | Historical and real-time stocks/crypto data |
| MCP | Alpaca MCP server in an authorized MCP client | Research/operator tooling; not assumed available to published runtime |
| Notifications | [Select provider] | Critical operational and risk alerts |

Do not run the continuous trading loop in the browser or Vercel functions. Vercel hosts the dashboard; Railway hosts broker access, durable jobs, and the supervised continuous worker.

### Deployment Recommendation

- **Selected frontend host: Vercel.** Use a conventional Next.js TypeScript application for the authenticated operational dashboard. It communicates only with the authenticated Railway API and never receives Alpaca credentials or order authority.
- **Selected database/backend host: Railway.** Provision Railway PostgreSQL and separate persistent API and worker services. Keep database networking private within the Railway project; expose only the authenticated API.
- **Sites:** Technically capable of hosting an authenticated external-data dashboard, but not selected because Next.js on Vercel gives this long-lived operational application a more conventional source, preview, deployment, and maintenance path.
- **Existing Hostinger VPS:** Remains a possible later migration target, but the operator would own OS/container patching, firewalling, TLS, monitoring, restart supervision, secret handling, database operations, and recovery testing.

Railway cron may trigger bounded daily work, but a PostgreSQL-backed durable queue and persistent worker own stateful workflows, retries, dead-letter handling, and recovery. Server-side jobs run every calendar day independently of Vercel/dashboard availability. Disable serverless sleep/scale-to-zero for the API and stream worker.

### Phase 0.3 Technical Selections

| Concern | Selection | Why it fits | Principal tradeoff / alternative considered |
| --- | --- | --- | --- |
| Single-operator authentication | Clerk | First-party Next.js support, backend token verification, and re-verification flows fit a Vercel UI with a separately deployed Railway API. | Adds a managed-vendor dependency. Better Auth would reduce that dependency but would make this project responsible for auth endpoints, session persistence, upgrades, and more of the authentication security surface. |
| PostgreSQL access and migrations | Drizzle ORM, Drizzle Kit, and `node-postgres` | Keeps schema and queries in strict TypeScript while retaining visible, reviewable SQL and direct use of PostgreSQL constraints and transactions. | Prisma has a broader generated-client workflow, but adds code generation and another schema abstraction where this system benefits from close SQL review. |
| Durable job queue | `pg-boss` | Uses the existing Railway PostgreSQL service and supports persistent workers, retries, backoff, scheduling, heartbeats, and dead-letter queues without adding Redis. | Queue state shares the database failure domain and consumes database capacity; queue health and retention therefore require separate monitoring and limits. |
| Runtime validation | Zod | TypeScript-first schemas can reject malformed configuration, commands, jobs, and provider payloads at trust boundaries. | Validation has runtime cost; validate at boundaries and avoid repeatedly parsing already trusted domain objects. |
| Decimal arithmetic | `decimal.js` | Arbitrary precision plus explicit precision and rounding avoids binary floating-point calculations for financial values. | Values need deliberate serialization; PostgreSQL `numeric` values and API/job payloads remain decimal strings rather than JavaScript numbers. |

These selections are architectural decisions, not installed dependencies. Phase 0.3 adds no authentication route, database schema, queue, broker connection, credential, or trading behavior. Dependency versions will be pinned only when each component is implemented and reviewed.

Implementation constraints:

- Clerk protects the dashboard, but the Railway API remains the authorization boundary. It must verify signature, issuer, audience/authorized party, expiry, and the exact allowlisted Clerk operator user ID on every non-health request.
- Public sign-up, possession of a valid non-operator Clerk account, or a frontend route guard must never grant application authority. Sensitive commands additionally require server-verified recent re-authentication and an audit record.
- Only server-side services receive private authentication configuration. Browser code may receive only Clerk values explicitly designated as publishable.
- Drizzle migrations are committed, reviewed as SQL, and applied through a controlled migration step. Production schema changes must not be inferred or pushed automatically at application startup.
- Raw SQL remains permitted for PostgreSQL constraints, locking, roles, append-only enforcement, and other safety invariants that cannot be expressed faithfully through the ORM.
- `pg-boss` owns operational queue tables, not canonical trading state. Jobs carry immutable record identifiers, handlers remain idempotent despite retries or crashes, and no queue job can bypass mode, freshness, risk, or execution-time checks.
- Queue schema upgrades use a pinned, reviewed procedure. Backlog, failed/dead-letter jobs, heartbeat age, retries, retention, and PostgreSQL load become monitored operational signals.
- Zod schemas live at trust boundaries and produce redacted failures; they must not log secrets or accept a structurally valid payload as proof of authorization.
- Financial values enter `decimal.js` from canonical decimal strings, use domain-specific cloned constructors with explicit precision and rounding, persist as PostgreSQL `numeric`, and serialize as strings. Conversion through JavaScript `number` is forbidden for authoritative calculations.

Primary references reviewed for this selection: [Clerk Next.js](https://clerk.com/docs/nextjs/getting-started/quickstart), [Clerk backend token verification](https://clerk.com/docs/reference/backend/verify-token), [Clerk re-verification](https://clerk.com/docs/guides/secure/reverification), [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql), [Drizzle migrations](https://orm.drizzle.team/docs/drizzle-kit-generate), [`pg-boss`](https://github.com/timgit/pg-boss), [Zod](https://zod.dev/), and [`decimal.js`](https://mikemcl.github.io/decimal.js/).

### Phase 1.1 Authenticated Shell

- `apps/web` uses Clerk middleware, `ClerkProvider`, a sign-in route, and a protected `/dashboard` server component. The public foundation page and `/health` endpoint remain available for operational checks.
- The dashboard requires a signed-in Clerk session and an exact `CLERK_OPERATOR_USER_ID`; a valid but different Clerk account receives an access-denied state.
- `apps/api` exposes `GET /v1/session` as the first protected API boundary. It verifies a Clerk session token with `authenticateRequest`, checks `CLERK_AUTHORIZED_PARTIES`, and applies the same exact operator allowlist.
- Missing Clerk configuration fails closed for protected surfaces (`503`); invalid sessions return `401`; authenticated non-operator sessions return `403`. No Clerk secret or token is returned in any response.
- Clerk variables are deployment configuration only. The API and worker remain paper-only, `BROKER_CONNECTION_ENABLED=false`, and no database or Alpaca adapter is invoked by this unit.

### Phase 1.2 Read-Only Account Boundary

- `packages/db` defines reviewed Drizzle PostgreSQL tables for account snapshots and associated positions, plus the committed SQL migration `0001_account_read_models.sql`.
- `packages/db` creates a PostgreSQL pool only when explicitly called with `DATABASE_URL`; application startup does not infer or apply migrations.
- `packages/alpaca` exposes only `readAccount()` and pins requests to `https://paper-api.alpaca.markets/v2/account`. Alpaca payloads are validated with Zod and financial values remain decimal strings.
- `apps/api` exposes authenticated `GET /v1/account`. It returns `503 broker_not_configured` while broker opt-in is disabled, and never exposes credentials. Errors are normalized to avoid leaking provider details.
- This unit adds no orders, market data, persistence startup, live endpoint, or risk bypass. The next unit should wire reconciliation persistence and dashboard read models after the migration is applied through Railway's controlled process.

### Phase 1.3 Read-Only Reconciliation Bundle

- `packages/alpaca` now validates and normalizes account, positions, orders, and account-activity responses into a single timestamped paper read bundle. The adapter still exposes no order or mutation method.
- `packages/db` adds append-only account activity storage, broker-order read-model storage with status refresh, and a transaction that writes one account snapshot, its positions, and the latest broker reads together.
- `apps/api` returns the expanded bundle from authenticated `GET /v1/account`; auth, paper-mode, explicit broker opt-in, and provider-error boundaries remain unchanged.
- The migration remains a controlled operator/deployment step. No hosted database write or Alpaca request is claimed until Railway applies the migration and the operator enables the existing paper-only broker flag.

### Phase 1.4 Persisted Read-Model API

- `packages/db` exposes a latest read-model query that joins the most recent account snapshot to its positions and the account's current broker-order/activity read models, with UTC capture time and computed age in seconds.
- `apps/api` exposes authenticated `GET /v1/read-model`. It returns `503 db_not_configured` without `DATABASE_URL`, `404 read_model_not_available` before a reconciliation exists, and a redacted `503 database_unavailable` for database/schema failures.
- The API creates the PostgreSQL pool lazily on the first authenticated read-model request; it never runs migrations at startup and does not expose database connection details.
- This unit does not claim that Railway has applied the migration or that a broker reconciliation has run. The dashboard can consume the endpoint only after those operational prerequisites are completed.

### Phase 1.5 Dashboard Read-Only Surfaces

- `apps/web/app/dashboard` consumes only the authenticated Railway `/v1/read-model` endpoint through a server component using a Clerk session token; it never receives Alpaca credentials or connects to PostgreSQL.
- The dashboard renders paper/read-only status, account equity/cash/buying power/status, capture age, positions, orders, and activities.
- Missing API configuration, authentication tokens, migration data, or connectivity produce explicit unavailable states. No frontend fallback grants access or invents financial values.
- The dashboard remains display-only. Controls, order submission, strategy actions, and risk changes are not part of this unit.

### Phase 1.6 Controlled Paper Reconciliation

- `apps/worker` provides a one-shot `reconcile` command that reads the paper account bundle and calls the transactional repository; it is not part of the always-on health process.
- The command requires `RECONCILE_ONCE=true`, the existing paper-only runtime guard, explicit broker opt-in, `DATABASE_URL`, and Railway server-side credentials. It closes the database pool after completion.
- Success logs contain only a generic completion message; failures contain no provider response, credential, SQL, or account value. The command performs no order mutation.
- Railway must apply `packages/db/migrations/0001_account_read_models.sql` through a controlled migration step before this command is run.

### Phase 2.1 Asset Discovery and Eligibility

- `packages/alpaca` validates Alpaca's paper `/v2/assets?status=active&tradable=true` response, filters the universe to `us_equity` and `crypto`, and normalizes asset identifiers, symbols, names, exchanges, status, and tradability.
- `apps/api` exposes authenticated `GET /v1/assets`, guarded by paper-only runtime configuration and explicit broker opt-in. It is a read-only discovery surface and does not grant order authority.
- Initial filtering intentionally stops at active, tradable asset class. Liquidity, spread, volatility, and research-universe thresholds remain operator decisions for the strategy/data phases.
- This unit adds no historical market-data, stream, strategy, risk, or order calls; no hosted broker request was performed.

### Phase 2.2 Protected Historical Market Data

- `packages/alpaca` adds a server-only market-data adapter pinned to `https://data.alpaca.markets`. It validates and normalizes stock/crypto historical bars and broker snapshots into internal decimal-string contracts.
- `apps/api` exposes authenticated `GET /v1/market-data/bars` and `GET /v1/market-data/snapshots`. Requests require paper-only runtime configuration, explicit broker opt-in, 1–10 validated symbols, and bounded bar limits.
- The API supports only the documented read paths and timeframes in this unit; it does not persist raw bars, expose credentials, or imply strategy/liquidity approval. Historical bars are inputs only and must be finalized/freshness-checked before strategy use.
- No WebSocket, backfill supervisor, strategy, risk, order, or hosted broker request was added.

### Phase 2.3 Supervised Market Stream and Backfill

- `packages/alpaca` validates Alpaca bar-stream messages and provides a supervisor that authenticates, subscribes to bounded symbols, tracks last-bar timestamps, detects interval gaps, marks the stream degraded, and requests REST backfill before resuming the subscribed state.
- `apps/worker` provides the paper-only runtime stream runner behind `MARKET_STREAM_ENABLED=false` by default. When explicitly enabled with broker opt-in, it uses Node's server-side WebSocket, reconnects with bounded backoff, and calls the existing market-data REST adapter for backfill.
- Stream configuration requires an explicit asset class, 1–10 symbols, timeframe, and stock feed. The worker does not expose stream credentials, persist raw ticks, evaluate strategies, submit orders, or bypass freshness gates.
- This unit does not claim a hosted stream has been enabled or connected; no hosted broker request was performed.

### Phase 2.4 Read-Only Dashboard Views

- `apps/web/app/dashboard` now presents overview/account, positions, orders & fills, performance, alerts, and recent activity sections from the authenticated persisted read model.
- Freshness is classified as fresh (≤5 minutes), delayed (≤15 minutes), or stale (>15 minutes); unavailable data remains explicitly unavailable. Capture timestamps are rendered as UTC with provenance.
- Performance and alert panels remain honest unavailable states until their persisted services exist. Market and trade streams are shown as disconnected/not enabled when no corresponding read model is present.
- The dashboard remains display-only: no controls, order methods, database connection, Alpaca credentials, strategy approval, or risk-policy mutation was added.

### Phase 2.5 Protected Reconciliation Verification

- `apps/api` exposes authenticated `GET /v1/reconciliation-status` for an operator-observed comparison of the latest persisted account snapshot against a fresh Alpaca paper account read.
- The comparison normalizes equivalent decimal representations and returns only `matched`/`mismatch`, checked field names, mismatch field names, and capture/check timestamps. It never returns broker payloads or secret material.
- The endpoint fails closed when PostgreSQL, broker opt-in, credentials, or a persisted snapshot are unavailable. It is not called automatically by the dashboard, preventing an implicit broker request on every page load.
- No writes, order methods, strategy/risk behavior, market-stream changes, or hosted broker request were added.

### Phase 3.1 Versioned Strategy Plug-in Contract

- `packages/domain` defines a versioned, typed strategy plug-in contract with owner, semantic version, asset class, required lookback, bounded parameter validation, deterministic evaluation inputs, and structured long-only signal candidates.
- Strategy lifecycle advancement is sequential: `disabled → replay → shadow → paper → eligible_live`. New registry entries must be disabled and semantic-versioned; duplicate keys and invalid lookbacks fail closed.
- Strategy evaluation returns proposals only. It cannot submit, cancel, replace, approve risk, change policy, or access credentials. Financial values remain decimal strings and input market data must be fresh Alpaca data.
- This unit adds no concrete momentum strategy, signal generation in production, persistence, broker request, or order behavior.

### Phase 3.2 Decimal-Safe Performance and Risk Metrics

- `packages/domain` uses the pinned `decimal.js` dependency for pure performance, exposure, drawdown, and planned-trade-risk calculations. Public results are serialized decimal strings.
- Performance metrics include total P/L, return percentage, peak-to-trough drawdown amount, and drawdown percentage over ordered equity points. Exposure sums absolute position market values and reports gross exposure percentage.
- Planned trade risk includes stop distance, quantity, estimated fees, and estimated slippage. It rejects risk above the lower of `0.25%` of current equity and `USD 100`, matching the initial USD 1,000 paper policy.
- These functions do not approve or submit orders, persist results, enable strategies, or access broker/database state. They fail on invalid or negative financial inputs.

### Phase 3.3 Point-in-Time Historical Replay

- `packages/domain` provides a deterministic replay harness that sorts finalized bars, gives each strategy only bars at or before its evaluation timestamp, and uses the next bar's open as the simulated entry.
- Replay requires a disabled or replay-stage strategy, validates its parameters, skips candidates without explicit exit/notional data, and applies configured per-trade fees plus two-sided slippage in basis points through decimal-safe functions.
- Results include simulated trades, skipped-signal count, evaluated-bar count, and performance metrics. Replay has no broker, database, credential, order, or paper-account side effect.
- Replay output is research evidence only; it is not a live or paper performance claim and cannot advance a strategy lifecycle by itself.

### Phase 3.4 Initial Momentum Research Plug-ins

- Added three deterministic, versioned, disabled-by-default research plug-ins: cross-sectional momentum, volume-confirmed breakout, and intraday trend continuation.
- Each plug-in validates bounded lookbacks and decimal parameters, evaluates only the supplied fresh bars, emits long-only proposal candidates with explicit entry/stop/target/time-stop fields, and has no sizing, risk approval, persistence, broker, or order authority.
- Failure regimes are fail-closed: insufficient history produces no candidate; negative/invalid parameters are rejected; breakout requires both a range break and relative-volume confirmation; trend continuation requires aligned fast and slow returns.
- These candidates remain research artifacts until replay evidence, shadow monitoring, operator-approved parameters, and the sequential lifecycle gates are completed.

### Phase 3.5 Regime-Based Replay Evidence

- Replay accepts an explicit research-only default notional when a strategy intentionally supplies no sizing authority; this makes simulated P/L reproducible without moving sizing into a strategy plug-in.
- Added named bull, bear, and choppy regime evidence orchestration plus a non-mutating assessment that reports sample-size, positive-regime, and drawdown-policy failures.
- Evidence assessment always remains non-promotable: it cannot advance a strategy stage, alter parameters, approve risk, persist a signal, contact Alpaca, or submit an order. Manual review and paper-forward evidence remain mandatory.

### Phase 3.6 Auditable Strategy Lifecycle Gate

- Added an append-only lifecycle record with revisioned transition events, actor identity, reason, approval note, strategy key/version, and evidence reference.
- The only implemented transition is `disabled → replay`; it requires matching three-regime evidence, passing automated evidence checks, an explicit operator approval note, and an exact current-stage match.
- Stage jumps, missing approvals, failed checks, mismatched versions, invalid timestamps, and blank reasons fail closed. Shadow, paper, and eligible-live transitions remain unavailable until their own gates are implemented.
- The current store is an in-process domain boundary for deterministic tests; production persistence must use the reviewed PostgreSQL audit schema before hosted promotion workflows are enabled.

### Phase 3.7 Lifecycle-Event PostgreSQL Persistence

- Added reviewed migration `0002_strategy_lifecycle_events.sql` and matching Drizzle schema/repository for append-only disabled-to-replay approval events.
- PostgreSQL enforces non-empty audit fields, positive revisions, unique strategy/version revisions, and the currently permitted `disabled → replay` transition. The repository checks the latest stage and expected revision inside a transaction before inserting.
- The repository is not wired to a hosted command yet; no migration is applied automatically, no authenticated operator endpoint exists, and no strategy stage is enabled in production.

### Phase 3.8 Authenticated Disabled-to-Replay Approval

- Added `POST /v1/strategies/lifecycle/replay`, protected by the existing exact single-operator Clerk boundary and paper-only runtime guard.
- The command validates a structured replay-evidence document, recomputes the automated sample/coverage/drawdown checks server-side, requires approval identity to match the authenticated operator, and persists only the domain-derived disabled-to-replay event.
- Unknown strategies, mismatched versions, malformed decimal/timestamp fields, insufficient regimes, failed evidence checks, and client-supplied stage/approval flags fail closed. The response exposes only strategy/version, replay stage, revision, and event ID.
- No Alpaca request, paper order, live endpoint, or later lifecycle transition is reachable through this command. Hosted database migration and Clerk/database configuration remain deployment dependencies.

### Phase 3.9 Shadow Observation Records

- Added a shadow-only observation contract that captures a strategy proposal and later closes it with a timestamped hypothetical outcome and decimal return percentage; it requires a strategy already in `shadow` stage and never creates an order.
- Added separate immutable PostgreSQL signal and one-time outcome tables. The repository inserts the signal once and records at most one outcome in a transaction; the original proposal is never updated or overwritten.
- Expired, invalidated, stop, target, and time-stop outcomes are explicit. Missing observations, duplicate IDs, duplicate outcomes, invalid prices, and out-of-order timestamps fail closed.
- No shadow promotion command, live market evaluator, paper order, broker request, or automatic lifecycle transition was added in this unit.

### Phase 3.10 Finalized-Bar Shadow Evaluator

- Added a pure evaluator that consumes finalized bars after the signal timestamp and closes an open observation on the first deterministic outcome.
- Outcome precedence is explicit: ambiguous stop-and-target bars become `invalidated`; otherwise stop, target, time-stop, then expiry are applied. Bars at/before the signal, other symbols, and bars after closure cannot influence the result.
- The evaluator returns hypothetical observation outcomes only. It has no sizing, risk approval, broker, order, database, or lifecycle-promotion authority.

### Phase 3.11 Restart-Safe Shadow Evaluation Runner

- Added a deterministic batch runner with injected finalized-bar source and persistence interfaces. It processes observations in stable ID order, closes only newly discovered outcomes, leaves unresolved observations open, and skips records already closed in PostgreSQL.
- Provider and persistence failures are converted to redacted observation-level failure codes so a durable worker can retry without exposing external error details.
- The runner is side-effect limited to the injected outcome repository. It does not fetch credentials, call Alpaca, submit orders, approve risk, or advance lifecycle stages.

## Runtime Components

1. **Railway API gateway:** Verifies operator identity, serves read models, validates commands, and persists canonical state transactionally in PostgreSQL.
2. **Railway scheduler/orchestrator:** Starts daily preparation, evaluation, reconciliation, and health workflows through a PostgreSQL-backed durable job queue.
3. **Market-data adapter:** Normalizes Alpaca stock/crypto bars, quotes, trades, snapshots, calendars, and news into internal contracts.
4. **Stream supervisor:** Maintains WebSocket connections, detects gaps, reconnects with backoff, and triggers REST backfill before declaring data fresh.
5. **Research agents:** Produce structured research artifacts and watchlist rankings. They have read-only data access.
6. **Strategy engine:** Runs versioned deterministic plug-ins and emits immutable signal candidates.
7. **Trade-intent service:** Converts candidates to normalized proposed trades, freezes inputs, and assigns expiry.
8. **Risk engine:** Applies code-defined policies and emits pass/fail plus rule-level reasons. It cannot be overridden by a strategy agent.
9. **Execution service:** Submits/cancels/replaces orders with unique client order IDs, bounded retries, and broker-response persistence.
10. **Reconciliation service:** Treats Alpaca as broker truth, resolves event gaps, and detects internal/broker discrepancies.
11. **Performance service:** Calculates ledger-based P/L, equity, exposure, drawdown, slippage, and strategy attribution.
12. **Alert service:** Delivers stale-data, rejected-order, disconnect, discrepancy, loss-limit, and kill-switch alerts.

Paper Autopilot requires no per-order operator confirmation. Submission still requires an unexpired deterministic risk approval and all execution-time mode, freshness, kill-switch, and account-state checks.

## Source Layout

Use a single strict TypeScript workspace with these boundaries:

- `apps/web` — Next.js dashboard deployed to Vercel; no Alpaca credentials, database connection, scheduling, or broker mutation code.
- `apps/api` — authenticated Railway HTTP API for dashboard reads and operator commands.
- `apps/worker` — Railway durable jobs, reconciliation, scheduling, and later Alpaca WebSocket supervision/execution.
- `packages/domain` — versioned domain contracts and state machines with no infrastructure dependencies.
- `packages/db` — PostgreSQL schema, migrations, repositories, constraints, and transaction helpers.
- `packages/alpaca` — server-only Alpaca adapters, normalization, and runtime validation.
- `packages/config` — typed environment contracts with explicit browser/server separation.

The first implementation unit creates only this compiling boundary structure. It must not add Alpaca credentials, broker calls, trading capability, or hosted resources.

## Agent Permission Matrix

| Agent | Market data | Research write | Config write | Risk approve | Order submit |
| --- | --- | --- | --- | --- | --- |
| Orchestrator | Read | No | No | No | No |
| Stock/Crypto research | Read | Own artifacts | No | No | No |
| Macro advisory | Read/news | Own artifacts | No | No | No |
| Strategy engine | Read frozen inputs | Signals only | No | No | No |
| Risk explainer | Read | Explanation only | No | No | No |
| Deterministic risk engine | Read canonical state | Decision record | Policy read-only | Yes | No |
| Execution service | Required snapshot | Execution events | No | Validates approval | Yes |
| Reconciliation | Broker read | Canonical events | No | No | Cancel only by policy |

No general-purpose LLM receives unrestricted order-submission capability.

## Alpaca Integration

### Environments

- `ALPACA_PAPER_TRADE=true` is required for Version 1.
- Use paper API keys in a server secret store; do not paste them into chat or source code.
- Live keys must use separate secrets and a separate deployment/environment.
- Live mode must not be selectable merely by changing a browser value or database row.

Document these variable names without recording their values:

- `APP_ENVIRONMENT` — must be `production-paper` for the hosted paper deployment.
- `TRADING_MODE` — must be `paper`; live mode is unavailable in Version 1.
- `BROKER_CONNECTION_ENABLED` — defaults to `false`; explicit `true` is not permitted until the read-only broker adapter gate is passed.
- `ALPACA_API_KEY` — paper account key ID in Version 1.
- `ALPACA_SECRET_KEY` — paper account secret in Version 1.
- `ALPACA_PAPER_TRADE` — must default to `true`; absence must never imply live mode.
- `ALPACA_TOOLSETS` — restrict MCP capabilities to the minimum required toolsets.

The paper trading base URL is fixed in server configuration to `https://paper-api.alpaca.markets`; it is not a browser- or operator-selectable live endpoint.

### MCP Usage

- Enable only required Alpaca MCP toolsets; begin with read-only `account,assets,stock-data,crypto-data,news,watchlists`.
- Keep the MCP `trading` toolset disabled during read-only and recommendation phases.
- Use MCP to aid research, account inspection, watchlists, and operator diagnostics in compatible clients.
- Do not assume a development-client MCP connector exists in the deployed app. Runtime automation calls Alpaca APIs from protected Railway infrastructure.

### REST and Streams

- REST handles account snapshots, assets, calendars/clock, historical bars, orders, positions, activities, and reconciliation.
- Market-data WebSockets feed real-time stock/crypto updates.
- Trading WebSockets feed order and account updates.
- Persist Alpaca request IDs when available for support and incident traceability.
- Respect subscription entitlements, symbol availability, connection limits, and rate limits.

## State Machines

### Trade Intent

`candidate → expired | risk_rejected | approved → submission_pending → submitted → acknowledged → partially_filled → filled | cancelled | rejected | expired → reconciled`

- Every transition is append-only and timestamped.
- Invalid transitions fail closed.
- An expired or risk-rejected intent cannot be submitted.
- Submission requires matching strategy version, risk-policy version, operating mode, and unexpired approval.

### System

`starting → healthy | degraded → paused → stopping → stopped`

- Any stale critical dependency can move the system to `degraded` or `paused`.
- A global kill switch overrides all strategy and scheduler states.

## Core Data Model

| Entity | Purpose | Key fields |
| --- | --- | --- |
| `system_config` | Current mode and operational config | mode, version, updated_by, effective_at |
| `risk_policies` | Versioned deterministic limits | version, status, thresholds_json, checksum |
| `strategies` | Plug-in identity and lifecycle | key, version, asset_class, stage, enabled |
| `strategy_parameters` | Versioned bounded parameters | strategy_version, values_json, effective_at |
| `strategy_runs` | Reproducible evaluations | strategy_version, input_snapshot_id, started_at, status |
| `market_snapshots` | Frozen inputs used by decisions | symbols, timestamps, source, freshness, payload/ref |
| `research_artifacts` | Agent outputs | agent_type, schema_version, evidence, created_at |
| `signals` | Normalized strategy candidates | symbol, side, score, rationale, valid_until |
| `trade_intents` | Immutable proposed trades | signal_id, quantity/notional, order_type, exit_plan |
| `risk_decisions` | Rule-by-rule pass/fail | intent_id, policy_version, account_snapshot_id, reasons |
| `orders` | Canonical submitted orders | client_order_id, alpaca_order_id, intent_id, status |
| `order_events` | Broker lifecycle events | order_id, event_type, broker_timestamp, raw_ref |
| `fills` | Execution records | order_id, quantity, price, fee, timestamp |
| `positions` | Reconciled current positions | symbol, asset_class, quantity, avg_price, strategy_key |
| `account_snapshots` | Broker/account truth over time | equity, cash, buying_power, timestamp |
| `performance_snapshots` | Derived dashboard metrics | pnl, exposure, drawdown, attribution, timestamp |
| `agent_runs` | Agent/job health and outputs | agent, job_id, status, latency, error_code |
| `commands` | Operator control requests | type, payload, requested_by, status |
| `audit_events` | Immutable security/decision trail | actor, action, entity, before_ref, after_ref, timestamp |
| `alerts` | Operational and risk incidents | severity, code, state, acknowledged_by |

High-volume raw ticks/bars may live in time-series/object storage; keep indexed decision snapshots and references in the primary database.

In Version 1, Railway PostgreSQL is the primary database. Large raw tick/bar payloads should not be copied indiscriminately into hot transactional tables; retain normalized bars, decision snapshots, checksums, and references required for replay and audit, with object storage or a specialized time-series store added if volume requires it.

## Risk Evaluation Order

1. Mode and global/strategy/asset kill switches.
2. Account status and trading eligibility.
3. Market/session eligibility and asset tradability.
4. Market/account/position data freshness and stream-gap status.
5. Signal expiry, strategy enabled stage, and strategy allocation.
6. Duplicate/cooldown/open-order conflict checks.
7. Daily loss, drawdown, gross exposure, crypto exposure, position count, and trade-count limits.
8. Symbol concentration and correlated-exposure limits when configured.
9. Liquidity, spread, volatility, notional, minimum increment, and estimated slippage.
10. Exit plan and order-type validity.

Position sizing must also reject any intent whose estimated loss at the planned stop, including estimated fees and slippage, exceeds the lower of `0.25%` of current equity and `USD 100`. The initial paper-account equity baseline is `USD 1,000` and must be reconciled before Paper Autopilot can start.

Any failure rejects the intent. Missing data is a failure, not a pass.

## Idempotency and Concurrency

- Derive `client_order_id` from environment, strategy run, intent, and attempt; enforce uniqueness with a PostgreSQL unique constraint.
- Acquire an intent-level lock/lease in a PostgreSQL transaction before submission.
- Persist submission intent before the broker call and persist response/request ID immediately after.
- On timeout or ambiguous response, query Alpaca by client order ID before retrying.
- Serialize conflicting operations per account and symbol when necessary.
- Deduplicate stream and webhook events by broker event identity plus payload checksum.

## Performance Accounting

- Alpaca account/position/order state is broker truth; internal state is a reconciled projection.
- Use decimal-safe arithmetic or integer minor units where applicable; never use binary floating point for persisted money calculations.
- Keep realized P/L, unrealized P/L, fees, slippage, deposits/withdrawals, and mark source distinct.
- Store timestamps in UTC and label display timezone.
- Performance views state whether values are broker-provided, calculated, delayed, or estimated.

## Security and Access

- Single operator authentication is required for all non-health routes.
- Re-authentication is required for mode changes, risk-limit loosening, live credential activation, flattening, and resume after kill.
- Server-side authorization protects every command and configuration change.
- Encrypt secrets using platform secret storage and redact sensitive headers/payloads from logs.
- Audit all logins, mode/risk/strategy changes, order commands, emergency actions, and secret-configuration status changes.
- Apply least privilege to MCP toolsets and runtime service credentials.
- Give the API and worker separate least-privilege PostgreSQL roles where practical; neither service may use a database superuser for normal runtime work.

## Reliability

- Durable jobs use bounded retries, exponential backoff, idempotency keys, and dead-letter handling.
- Stream reconnect requires gap detection and REST backfill before signals resume.
- Scheduled health and broker reconciliation continue even if no market signal exists.
- Alert delivery failures do not suppress the underlying risk or system state.
- Recovery after restart begins paused until account, positions, open orders, configuration, and freshness are reconciled.
- Enable Railway scheduled volume backups and point-in-time recovery, create off-platform logical PostgreSQL dumps, and test restoration. Source code, service variables, and queue/runbook recovery require separate procedures.

## Architectural Invariants

1. Version 1 cannot call Alpaca live trading endpoints.
2. Browser code never receives Alpaca credentials or direct order authority.
3. AI/strategy output cannot bypass deterministic risk approval.
4. Every broker write is idempotent and fully auditable.
5. Broker state is reconciled before the system resumes after an outage.
6. Missing, delayed, inconsistent, or stale critical data stops new entries.
7. Risk-limit breaches stop new entries immediately; exit/cancel behavior follows the configured emergency policy.
8. No strategy changes its own code, parameters, stage, or allocation.
9. Dashboard P/L never substitutes for broker reconciliation or the accounting ledger.
10. Always-on work runs on Railway server infrastructure, not in a browser, Sites/Vercel frontend function, or chat session.

## Live-Readiness Gates

Live modes remain unavailable until all are documented as passed:

- Minimum 30 consecutive calendar days stable paper operation.
- Restart, retry, duplicate submission, stream-gap, stale-data, rate-limit, partial-fill, rejected-order, and kill-switch tests pass.
- Strategy evaluation includes realistic fees/slippage and adequate sample size across regimes.
- Risk thresholds and emergency behavior receive explicit operator approval.
- Alerts have at least two tested delivery paths for critical incidents.
- Secrets, access control, audit logging, dependency review, backup, and recovery checks pass.
- Paper/live environment isolation is verified.
- A limited-capital live rollout and rollback plan is approved.
