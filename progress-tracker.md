# Progress Tracker

## Snapshot

- **Phase:** Phase 6.27 — Paper Autopilot readiness report.
- **Status:** Agent runs have deterministic contracts, reviewed PostgreSQL persistence, authenticated list/detail reads, a dashboard health surface, a paper-only market-data run-once boundary, a disabled-by-default daily research readiness surface, a separately named validated queue boundary, an explicit stock/crypto preparation planner, a fail-closed queue-handler composition, a readiness-gated scheduler registration boundary, safe runtime health reporting, explicit opt-in worker composition, guarded local/CI readiness commands, verified hosted disabled readiness, separate approval/reference guards, bounded research-run preflight validation, non-secret approval provenance, bounded explicit/latest persisted-run verification, deployed hosted tooling, deterministic source bar-integrity checks with duplicate/out-of-order distinctions, verified deployed integrity code, a guarded read-only database probe, an automated source/browser credential-value audit, an explicit paper operating-mode contract, persistent dashboard mode visibility, a truthful public foundation status, worker mode health, worker integration configuration health, a command-scoped approval reference for the durable one-run, explicit paper baseline/single-trade risk invariants, authenticated operator-visible risk policy metadata, and a guarded Paper Autopilot configuration-readiness report; Railway migration `0008` is applied, `DATABASE_URL` is verified on the backend services with private-host reachability and read-only PostgreSQL connectivity, while research scheduling, durable reconciliation, and Paper Autopilot remain disabled.
- **Current operating mode:** Paper only; order submission not yet enabled.
- **Current goal:** Run the separately approved one-run paper reconciliation using the reviewed runbook, then verify its result in the authenticated dashboard.
- **Last updated:** 2026-08-23.

## Delivery Roadmap

### Phase 0 — Foundation and Setup

#### 0.1 Source foundation — first action

- [x] Initialize this directory as a Git repository and set `main` as the default local branch.
- [x] Scaffold a strict TypeScript workspace with `apps/web`, `apps/api`, `apps/worker`, and shared packages for domain contracts, database access, Alpaca normalization, and configuration.
- [x] Create the Next.js dashboard in `apps/web`; keep API, scheduling, broker access, and worker code out of the frontend package.
- [x] Add root scripts for typecheck, lint, tests, and production builds without adding Alpaca credentials or order submission.
- [x] Commit the existing context pack and the compiling scaffold as the recoverable baseline.

**0.1 exit gate:** All three applications compile locally, shared contracts import cleanly, no secret or broker call exists, and the baseline commit is reproducible.

#### 0.2 Hosted foundation

- [x] Create/connect the remote source repository.
- [x] Push the baseline and protect the remote `main` branch.
- [x] Create the Vercel project for `apps/web` with preview and production environments.
- [x] Create one Railway project with separate `api`, `worker`, and PostgreSQL services.
- [x] Keep PostgreSQL private to Railway services; expose only the API health surface pending Phase 1 authentication.
- [x] Configure local development, Vercel preview/production, and Railway production-paper variables without any live-trading configuration.

#### 0.3 Technical selections

- [x] Select and record Clerk as the Next.js/Railway-compatible single-operator authentication provider.
- [x] Select and record Drizzle ORM, Drizzle Kit, and `node-postgres` for PostgreSQL access and migrations.
- [x] Select and record `pg-boss` as the PostgreSQL-backed durable job queue.
- [x] Select and record Zod and `decimal.js` for runtime validation and decimal arithmetic.

#### 0.4 Security and paper-account setup

- [x] Create or reset the Alpaca paper account to the `USD 1,000` baseline (operator-confirmed; value not inspected).
- [x] Add paper credentials only to Railway service variables and require `ALPACA_PAPER_TRADE=true` (operator-confirmed; secret values not inspected).
- [x] Add placeholders/documentation—not values—for required environment variables.
- [x] Add fail-closed runtime validation for paper mode, broker opt-in, and required credentials.
- [ ] Verify Vercel, browser bundles, source control, logs, and PostgreSQL contain no Alpaca credentials.

#### 0.5 Operational decisions

- [ ] Review and approve Version 1 scope and the initial paper risk policy.
- [ ] Decide the default emergency-stop response before implementing paper execution.
- [ ] Select the Alpaca market-data subscription/feed.
- [ ] Select critical alert providers and at least two eventual critical-alert paths.

#### 0.6 Phase 0 verification

- [ ] Verify local typecheck, lint, tests, and production builds.
- [ ] Verify Vercel preview deployment and Railway API/worker health endpoints.
- [ ] Verify Railway PostgreSQL connectivity through private networking.
- [ ] Enable scheduled database backups and record the later restore-drill requirement.
- [ ] Record exact results and remaining decisions before starting Phase 1.

**Phase 0 exit gate:** The versioned scaffold deploys safely, Vercel can reach only the authenticated Railway API, Railway services can reach private PostgreSQL, secrets are correctly isolated, and no Alpaca order capability exists.

### Phase 1 — Trusted Read-Only Foundation

- [x] Add single-operator authentication and authorization shell with Railway API operator enforcement.
- [x] Create the initial PostgreSQL read-model schema, reviewed migration, constraints, and indexes.
- [x] Add server-only Alpaca paper-account adapter with paper-endpoint enforcement and response validation.
- [x] Display account status, equity, cash, buying power, positions, orders, and activities.
- [x] Add health, freshness, paper-mode banner, and reconciliation status.
- [ ] Verify browser bundles/logs never contain Alpaca secrets.

### Phase 2 — Market Data and Dashboard

- [x] Add stock/crypto asset discovery and eligibility filters.
- [x] Add historical bars/snapshots through protected server calls.
- [x] Add supervised market/trading WebSocket worker with backfill.
- [x] Build Overview, Positions, Orders & fills, Performance, and Alerts views.
- [x] Reconcile dashboard/account data against Alpaca.

### Phase 3 — Strategy and Replay Foundation

- [x] Implement versioned strategy plug-in interface.
- [x] Implement decimal-safe performance and risk metrics.
- [x] Build historical replay with point-in-time inputs, fees, and slippage.
- [x] Implement three initial momentum research strategies.
- [x] Add regime-based replay evidence and non-promoting assessment.
- [x] Add auditable disabled → replay lifecycle gate.
- [x] Add reviewed PostgreSQL lifecycle-event schema and repository.
- [x] Add authenticated disabled → replay approval command.
- [x] Define shadow observation records and one-time outcomes.
- [x] Add finalized-bar shadow evaluator with deterministic outcome precedence.
- [x] Add restart-safe shadow evaluation runner with idempotent outcome writes.
- [x] Add opt-in worker configuration, one-shot command boundary, and health record.
- [x] Wire finalized-bar source/repository and bounded recurring scheduler.
- [x] Add authenticated replay → shadow promotion command using persisted shadow outcomes.
- [x] Add deterministic shadow → paper readiness gate and migration.
- [x] Add authenticated shadow → paper command using persisted paper-forward evidence.
- [ ] Add remaining paper → eligible-live gate and paper execution foundations.

### Phase 4 — Research Agents and Daily Preparation

- [x] Implement orchestrator and structured agent-run records.
- [x] Add stock and crypto research agents with read-only tools.
- [x] Add macro advisory and economic-event context.
- [x] Persist agent-run records and expose an authenticated read-only health/audit view.
- [ ] Produce persisted daily stock and continuous crypto plans.
- [ ] Add agent health, evidence, and audit views.

### Phase 5 — Risk and Paper Execution

- [ ] Implement immutable signals and trade intents.
- [x] Implement immutable signals and deterministic paper risk checks.
- [x] Add immutable trade intents and execution-time risk approvals.
- [x] Add idempotent paper execution service.
- [x] Persist submissions and reconcile broker truth records.
- [x] Wire execution, persistence, reconciliation, and Paper Autopilot mode gates end to end.
- [x] Add controlled partial-fill, terminal-state, retry, and restart-recovery rules/tests.
- [ ] Verify Paper Autopilot against the hosted paper account before enabling it.
- [ ] Add order/trade stream handling and full reconciliation.
- [ ] Test rejected orders, partial fills, timeouts, duplicates, and restarts.

### Phase 6 — Durable Autopilot

- [x] Add durable schedules, bounded retries, dead-letter handling, and scheduler health/recovery state.
- [ ] Implement Observe, Recommend, and Paper Autopilot mode gates.
- [ ] Verify Paper Autopilot submits deterministically approved paper orders without per-order human confirmation.
- [ ] Verify daily server jobs run independently of the dashboard and expose last-run/next-run health.
- [ ] Add pause, kill switches, cancel-only, liquidation, and safe resume.
- [ ] Configure/test critical alerts.
- [ ] Run continuously in paper mode and collect operational evidence.

### Phase 7 — Live Readiness (Separate Approval Required)

- [ ] Complete at least 30 consecutive calendar days stable paper operation.
- [ ] Pass all architecture live-readiness gates.
- [ ] Review performance across regimes with realistic costs and sample sizes.
- [ ] Approve risk limits, limited-capital rollout, and rollback plan.
- [ ] Complete security, dependency, backup, and recovery review.
- [ ] Implement Live Confirm before considering Live Autopilot.

## Completed Build Unit — Phase 0.1

- **User-visible outcome:** A truthful foundation page identifies Paper, Read-only foundation, and No broker connection states.
- **Boundaries created:** Next.js web, Node API, inactive worker, domain contracts, database placeholder, Alpaca placeholder, and server configuration.
- **External effects:** None. No hosted resource, database, credential, Alpaca request, or order behavior was created.
- **Acceptance criteria:**
  - [x] Git repository uses local `main` as its default branch.
  - [x] Web, API, worker, and shared package boundaries compile.
  - [x] Browser code has no database or broker dependency.
  - [x] API `/health` returns a healthy foundation response.
  - [x] Worker reports both database and Alpaca as `not_configured` and exits.
  - [x] Typecheck, lint, unit tests, and production builds pass.

## Phase 0.2 Review Handoff

- **User story:** As the operator, I have an isolated Vercel frontend and Railway API/worker/PostgreSQL foundation connected to version-controlled deployments, with no broker access.
- **In scope:** Remote repository, protected `main`, Vercel project, Railway API/worker/PostgreSQL services, private networking, and environment separation.
- **Out of scope:** Authentication implementation, Alpaca credentials or calls, database domain schema, market streams, agents, strategies, risk, and order behavior.

## Completed Hosted Unit — Phase 0.2

- **Source control:** Baseline pushed to `altafr/papertrader`; remote `main` requires pull requests, enforces administrator protection and conversation resolution, and rejects force-pushes and deletion.
- **Source delivery:** Pull request `#1` was squash-merged to protected `main` as commit `9f692ff` after local and hosted checks passed.
- **Vercel:** `papertrader-web` is connected to the GitHub repository with `apps/web` as root, shared workspace sources enabled, and dependency-aware builds. Production and preview deployments are Ready; deployment protection remains enabled.
- **Railway:** Project `papertrader` contains healthy `api`, `worker`, and PostgreSQL services. The API alone has a public domain; worker and PostgreSQL have none.
- **Environment safety:** API and worker use `APP_ENVIRONMENT=production-paper`, `TRADING_MODE=paper`, and `BROKER_CONNECTION_ENABLED=false`. No Alpaca variable, credential, client, request, or order path exists.
- **Persistence boundary:** The worker now stays online only to serve `/health`; it reports database and Alpaca adapters as `not_configured`.
- **Deployment source:** Railway API and worker both track `main`; their post-merge deployments completed successfully.

## Completed Decision Unit — Phase 0.3

- **User story:** As the operator, I have explicit, recorded technical choices for authentication, PostgreSQL access/migrations, durable jobs, runtime validation, and decimal-safe finance calculations.
- **Selected stack:** Clerk; Drizzle ORM/Drizzle Kit with `node-postgres`; `pg-boss`; Zod; and `decimal.js`.
- **Recorded safeguards:** Railway API authorization boundary, exact single-operator allowlist, server-verified re-authentication for sensitive commands, reviewed SQL migrations, idempotent durable jobs, redacted validation errors, and string-based decimal serialization.
- **External effects:** None. No package, authentication route, database schema, queue, credential, Alpaca request, or trading behavior was added.

## Active Build Unit — Phase 0.4

- **User story:** As the operator, I have a paper-only Alpaca account fixed to the USD 1,000 baseline, with credentials isolated to Railway and absent everywhere else.
- **Implemented in this unit:** Added `.env.example` safe defaults, server-side paper-only runtime validation, startup fail-closed checks in the API and worker, tests, and operator setup instructions.
- **Still in scope:** Complete the deployed-surface credential audit; the account reset and Railway variable entry were operator-confirmed without exposing their values.
- **Out of scope:** Authentication implementation, database domain schema, queue implementation, broker trading calls, strategies, risk decisions, or order behavior.
- **Operator dependency:** Account reset and secret entry require the operator's authenticated Alpaca/Railway sessions; secret values must never be pasted into chat, source, logs, or documentation.

## Completed Build Unit — Phase 1.1

- **User story:** As the single operator, I can reach an authenticated dashboard shell, while the Railway API independently verifies the Clerk session and exact allowlisted user before serving a protected session response.
- **Implemented:** Added Clerk Next.js middleware/provider/sign-in/dashboard route, a fail-closed unauthenticated configuration state, Railway API `/v1/session` authentication using `authenticateRequest`, authorized-party validation, exact operator allowlisting, and non-secret Clerk environment documentation.
- **Safety boundary:** `/health` remains public; `/v1/session` returns `503` when Clerk is not provisioned, `401` for invalid sessions, `403` for a valid non-operator session, and never returns secret material. No Alpaca call, database connection, schema, order route, or broker authority was added.
- **Operator dependency:** Clerk hosted variables must be configured before the dashboard can authenticate in Vercel/Railway. Values must not be pasted into chat or source control.
- **Next smallest unit:** Add reviewed PostgreSQL migrations and a read-only account-state repository, then connect the paper Alpaca account adapter behind the authenticated API.

## Completed Build Unit — Phase 1.2

- **User story:** As the operator, I can request authenticated paper-account state through a server-only API boundary, with validated values ready for PostgreSQL reconciliation and dashboard reads.
- **Implemented:** Added Drizzle PostgreSQL schema definitions and reviewed SQL migration for account snapshots and positions; added a lazy `node-postgres`/Drizzle client and latest-snapshot repository; added a Zod-validated Alpaca paper account reader and authenticated `GET /v1/account`.
- **Safety boundary:** The Alpaca adapter exposes `readAccount()` only, hard-pins the paper endpoint, reads credentials only from server process configuration, returns decimal values as strings, and returns `503 broker_not_configured` while explicit broker opt-in is disabled. No order, live endpoint, market stream, or browser credential path exists.
- **Deployment dependency:** The migration must be applied through Railway's controlled database migration step before persistence is used. Broker reads require existing Railway-only paper credentials and `BROKER_CONNECTION_ENABLED=true`; no secret values were inspected or changed.
- **Next smallest unit:** Add positions/orders/activity read normalization and transactional reconciliation writes, then expose dashboard read models and freshness state.

## Completed Build Unit — Phase 1.3

- **User story:** As the operator, I can retrieve one authenticated paper snapshot containing account, positions, orders, and activities, with a transaction-ready persistence boundary for reconciliation.
- **Implemented:** Expanded the Alpaca adapter with Zod validation for `/v2/account`, `/v2/positions`, `/v2/orders`, and `/v2/account/activities`; added orders and activities tables/migration indexes; added transactional account/position/order/activity reconciliation with idempotent order refresh and append-only activity inserts.
- **Safety boundary:** All broker methods remain read-only and pinned to the Alpaca paper endpoint. API responses require the existing operator authentication and explicit `BROKER_CONNECTION_ENABLED=true`; no order submission, live endpoint, market stream, or strategy/risk behavior was added.
- **Deployment dependency:** The migration still requires controlled application in Railway. No hosted database write or Alpaca request was performed in this unit.
- **Next smallest unit:** Apply the migration in Railway, perform one operator-observed paper reconciliation, and expose persisted freshness/read-model endpoints to the dashboard.

## Completed Build Unit — Phase 1.4

- **User story:** As the operator, I can request the latest persisted account read model and see when it was captured, without the API querying the broker or exposing database details.
- **Implemented:** Added a latest-read-model repository query spanning the newest account snapshot, positions, broker orders, and activities; added UTC capture/freshness metadata; added authenticated `GET /v1/read-model` with explicit database-not-configured, model-not-available, and redacted database-failure responses.
- **Safety boundary:** The endpoint is authenticated and read-only. PostgreSQL creation is lazy, migrations are never applied by the application, and no browser code receives credentials or direct database access.
- **Deployment dependency:** The Railway migration and one controlled paper reconciliation remain operator/deployment actions. Until then, the endpoint correctly returns a fail-closed unavailable state.
- **Next smallest unit:** Apply the migration, run one paper reconciliation, verify `/v1/read-model` against persisted data, and wire dashboard read-only account/positions/orders surfaces.

## Completed Build Unit — Phase 1.6

- **User story:** As the operator, I can run one explicitly guarded server-side reconciliation that reads paper Alpaca state and persists it transactionally, without enabling any order behavior.
- **Implemented:** Added `apps/worker`'s `reconcile` command and reusable reconciliation mapping. It requires `RECONCILE_ONCE=true`, the paper-only runtime guard, explicit broker opt-in, Railway credentials, and `DATABASE_URL`; it closes the PostgreSQL pool and emits only generic success/failure messages.
- **Safety boundary:** The command is one-shot and separate from worker health. It cannot run by default, cannot use a live endpoint, cannot submit/cancel orders, and does not log account values or provider errors.
- **Deployment dependency:** Railway CLI is not installed in this workspace, so no hosted migration or reconciliation was attempted. Apply the reviewed migration first, then run the guarded command from the Railway worker service.
- **Next smallest unit:** Execute the controlled Railway migration and one reconciliation, then verify `/v1/read-model` and the hosted dashboard with real persisted paper data.

## Completed Build Unit — Phase 1.5

- **User story:** As the operator, I can see the paper/read-only account state, freshness, positions, orders, and activities in the authenticated dashboard without granting the browser broker or database authority.
- **Implemented:** Replaced the placeholder dashboard with server-side API consumption using a Clerk session token, safe response-shape validation, account/freshness cards, positions/orders/activity lists, and explicit unavailable states for missing configuration, authentication, migration data, or connectivity.
- **Safety boundary:** The browser calls only the authenticated Railway API; no Alpaca credentials, database connection, order method, control action, or fabricated financial fallback exists in the frontend.
- **Deployment dependency:** Dashboard data remains unavailable until Clerk/API configuration, the Railway migration, and one controlled paper reconciliation are completed.
- **Next smallest unit:** Apply the migration, run one paper reconciliation, verify hosted API/dashboard data, then add the reconciliation health signal and scheduled server-side refresh.

## Open Questions

| Priority | Question | Impact | Owner |
| --- | --- | --- | --- |
| P1 | Which Alpaca market-data subscription/feed will be used? | Coverage, latency, entitlements, and tests | Operator |
| P1 | What exact cancel/liquidate action should the global emergency stop perform by default? | Loss containment and operational safety | Operator |
| P2 | Which alert channels should receive critical incidents? | Response time | Operator |
| P2 | What stock and crypto universe/liquidity thresholds should be used for initial research? | Strategy capacity and data usage | Operator |
| P2 | Which macro/news sources supplement Alpaca news, if any? | Advisory coverage and external cost | Operator |

## Completed Build Unit — Phase 2.1

- **User story:** As the operator, I can retrieve the active, tradable stock and crypto universe through an authenticated server boundary for later market-data and research work.
- **Implemented:** Added a server-only Alpaca asset reader and authenticated `GET /v1/assets`; responses are validated, normalized, and limited to `us_equity` and `crypto` assets.
- **Safety boundary:** The route is paper-only, requires explicit broker opt-in and operator authentication, and has no order, strategy, risk, or browser credential behavior. Active/tradable class filtering is not a liquidity or strategy approval.
- **Deployment dependency:** No hosted broker request was performed. Railway migration and the guarded reconciliation remain separate operational prerequisites.
- **Next smallest unit:** Add protected historical bars/snapshots through Alpaca read calls, after the operator records the market-data subscription/feed decision.

## Completed Build Unit — Phase 2.2

- **User story:** As the operator, I can request validated historical bars and current broker snapshots for a bounded stock or crypto symbol list through the authenticated server API.
- **Implemented:** Added the server-only market-data adapter and authenticated `GET /v1/market-data/bars` and `GET /v1/market-data/snapshots` routes. Alpaca payloads are validated and normalized with decimal values serialized as strings.
- **Safety boundary:** Market-data calls are read-only, pinned to Alpaca's market-data endpoint, paper-runtime gated, broker-opt-in gated, and limited to 1–10 symbols with bounded bar limits. No raw data persistence, WebSocket, strategy, risk, or order behavior was added.
- **Deployment dependency:** No hosted broker request was performed. Railway migration and guarded account reconciliation remain separate operational prerequisites.
- **Next smallest unit:** Add supervised market/trading WebSocket ingestion, sequence-gap detection, and REST backfill before any strategy consumes streaming data.

## Completed Build Unit — Phase 2.3

- **User story:** As the operator, I can run a server-side paper market stream with explicit configuration, bounded reconnects, freshness state, gap detection, and REST backfill before data resumes.
- **Implemented:** Added validated stream-message normalization and a supervisor that authenticates/subscribes, tracks bar timestamps, detects gaps, requests REST backfill, and marks reconnects degraded. Added the worker runtime runner with WebSocket transport wiring and opt-in configuration.
- **Safety boundary:** `MARKET_STREAM_ENABLED` defaults off; enabling it requires paper runtime, explicit broker opt-in, server credentials, a bounded symbol list, timeframe, and stock feed. No live endpoint, raw-data persistence, strategy, risk, or order behavior was added.
- **Deployment dependency:** No hosted stream was enabled or connected. Railway migration and guarded account reconciliation remain separate operational prerequisites; the market-data feed choice remains an operator decision.
- **Next smallest unit:** Build read-only dashboard views for overview, positions, orders/fills, performance, and alerts with freshness/degraded states.

## Completed Build Unit — Phase 2.4

- **User story:** As the operator, I can inspect reconciled paper account state through an authenticated, read-only dashboard with clear data provenance and freshness/degraded states.
- **Implemented:** Expanded the dashboard with overview/account metrics, positions table, orders & fills, recent activity, performance and alerts placeholders, section navigation, responsive table treatment, and explicit fresh/delayed/stale/unavailable states.
- **Safety boundary:** The browser still calls only the authenticated Railway API. Performance and alert values are never inferred; disconnected streams and missing read models are visibly labeled. No controls, order authority, database access, or broker credentials were added.
- **Deployment dependency:** Dashboard values remain unavailable until Clerk/API configuration, the reviewed Railway migration, and a controlled paper reconciliation are completed. No hosted broker request was performed.
- **Next smallest unit:** Apply the migration and run one guarded paper reconciliation, then verify dashboard/account data against Alpaca before adding performance persistence or alert actions.

## Completed Build Unit — Phase 2.5

- **User story:** As the operator, I can explicitly verify that the latest persisted account read model matches a fresh Alpaca paper account read without exposing broker payloads or triggering a write.
- **Implemented:** Added authenticated `GET /v1/reconciliation-status` and a decimal-aware comparison contract covering account ID-independent equity, cash, buying power, currency, and status fields. Responses contain only comparison status, field names, and timestamps.
- **Safety boundary:** The comparison is server-side, paper-only, operator-authenticated, broker-opt-in gated, and never runs automatically from the dashboard. No order, database write, strategy, or risk mutation exists.
- **Deployment dependency:** No hosted migration, persisted snapshot, or broker request has been verified in this workspace. The endpoint will fail closed until Railway PostgreSQL is migrated, a guarded reconciliation has run, and broker access is explicitly enabled.
- **Next smallest unit:** Apply the reviewed migration and run one guarded paper reconciliation, then perform the operator-observed comparison and dashboard verification.

## Completed Build Unit — Phase 3.1

- **User story:** As a researcher, I can define a versioned strategy plug-in with bounded parameters and deterministic, read-only signal proposals without granting it order or risk authority.
- **Implemented:** Added the domain strategy contract, structured market/position inputs, long-only signal-candidate output, sequential lifecycle transition guard, and a disabled-only strategy registry with semantic-version and lookback validation.
- **Safety boundary:** New strategies register disabled; evaluation is proposal-only, uses decimal strings, requires fresh Alpaca input by contract, and has no broker, database, credential, risk-approval, or order access.
- **Deployment dependency:** No concrete strategy was enabled, no strategy evaluated in production, and no hosted migration or broker request was performed.
- **Next smallest unit:** Add decimal-safe performance and risk metrics as pure functions, with boundary tests before any strategy is enabled.

## Completed Build Unit — Phase 3.2

- **User story:** As a researcher, I can calculate P/L, return, drawdown, exposure, and planned trade risk with decimal-safe arithmetic before a strategy or order path is enabled.
- **Implemented:** Added the pinned `decimal.js` dependency and pure domain functions for ordered equity performance, gross exposure, and planned-stop risk including fees and slippage. Results use fixed decimal strings.
- **Safety boundary:** The risk metric enforces the lower of `0.25%` current equity and `USD 100`; invalid/negative inputs fail closed. Metrics do not approve orders, persist state, access broker data, or enable strategies.
- **Deployment dependency:** No strategy was enabled, no production evaluation or broker request occurred, and the hosted migration/reconciliation remains pending.
- **Next smallest unit:** Build point-in-time historical replay with explicit fees/slippage and no live or paper order side effects.

## Completed Build Unit — Phase 3.3

- **User story:** As a researcher, I can replay a disabled/replay-stage strategy against finalized historical bars without look-ahead, while accounting for explicit fees and slippage.
- **Implemented:** Added a deterministic point-in-time replay harness that supplies only bars available at each evaluation timestamp, simulates next-bar-open entries and explicit exits, skips incomplete candidates, and returns trades plus decimal-safe performance metrics.
- **Safety boundary:** Replay is research-only and side-effect free. It cannot access Alpaca, PostgreSQL, credentials, paper accounts, risk approval, or order methods; replay output does not promote a strategy lifecycle.
- **Deployment dependency:** No strategy was enabled, no production replay ran, and no hosted migration or broker request occurred.
- **Next smallest unit:** Implement the three initial momentum strategy candidates as disabled research plug-ins with deterministic tests and documented failure regimes.

## Completed Build Unit — Phase 3.4

- **User story:** As a researcher, I can compare three deterministic momentum hypotheses against point-in-time data without enabling them for paper execution.
- **Implemented:** Added cross-sectional momentum ranking, volume-confirmed breakout, and intraday trend continuation plug-ins with bounded parameter schemas, explicit proposal exits/stops/time stops, and a shared disabled-only registry list.
- **Safety boundary:** All three are `disabled`, proposal-only, long-only, and free of broker, database, credential, sizing-authority, risk-approval, or order methods. Insufficient history and failed confirmation conditions return no signal; invalid parameters fail closed.
- **Deployment dependency:** No production evaluation, hosted migration, broker request, or paper order behavior was added.
- **Next smallest unit:** Exercise each plug-in through historical replay across representative market regimes, then document lifecycle promotion evidence before any shadow or paper stage.

## Completed Build Unit — Phase 3.5

- **User story:** As a researcher, I can run each disabled momentum candidate across named bull, bear, and choppy regimes with reproducible costs and a documented evidence assessment.
- **Implemented:** Added an explicit research-only default notional to historical replay, regime replay orchestration, and a non-mutating assessment for minimum trade sample, positive-regime coverage, and maximum drawdown policy checks.
- **Safety boundary:** Evidence never promotes a strategy or changes its stage; strategies remain disabled and cannot access broker, database, credentials, risk approval, or order methods. Sizing is supplied by the replay caller, not the strategy.
- **Deployment dependency:** No production replay, hosted migration, broker request, persistence, or paper order behavior was added.
- **Next smallest unit:** Define and implement the lifecycle state machine's auditable promotion records, starting with disabled → replay and preserving operator approval boundaries.

## Completed Build Unit — Phase 3.6

- **User story:** As the operator, I can approve a qualifying strategy's move from `disabled` to `replay` and receive an immutable, revisioned transition record tied to the strategy version and evidence.
- **Implemented:** Added the lifecycle record/event contract and in-process append-only store. The gate validates exact stage sequencing, actor/reason/timestamp, three distinct regimes, automated evidence checks, matching strategy version, and explicit operator approval.
- **Safety boundary:** Only `disabled → replay` is implemented. No stage jump or shadow/paper/live transition is possible; no broker, database, credential, risk approval, sizing, or order behavior was added.
- **Deployment dependency:** The store is deliberately in-process until a reviewed PostgreSQL audit migration and authenticated API command are implemented. No hosted promotion can occur from this unit.
- **Next smallest unit:** Add the reviewed PostgreSQL lifecycle-event schema/repository, retaining append-only and unique revision constraints.

## Completed Build Unit — Phase 3.7

- **User story:** As the operator, I can persist a validated disabled-to-replay approval as an append-only PostgreSQL audit event with a unique strategy/version revision.
- **Implemented:** Added migration `0002_strategy_lifecycle_events.sql`, Drizzle schema, and a repository that checks the current stage and expected revision transactionally before inserting. Database constraints require non-empty audit fields, positive revisions, and disabled → replay only.
- **Safety boundary:** The migration is not applied by application startup, the repository is not exposed through an API command yet, and no strategy stage or paper order behavior is enabled.
- **Deployment dependency:** Railway migration application remains a controlled operator action; no hosted database write or broker request was performed.
- **Next smallest unit:** Add the authenticated operator command that composes domain evidence/approval validation with this repository, retaining re-authentication and append-only controls.

## Completed Build Unit — Phase 3.8

- **User story:** As the authenticated operator, I can submit replay evidence for one versioned strategy and persist a validated `disabled → replay` approval without granting order authority.
- **Implemented:** Added protected `POST /v1/strategies/lifecycle/replay`, structured Zod request validation, server-side evidence assessment, authenticated approval identity matching, domain lifecycle validation, and redacted success/error responses.
- **Safety boundary:** The endpoint accepts no client approval boolean or arbitrary target stage; it only supports known disabled momentum strategies and persists the domain-derived replay event. No broker, order, risk, or live behavior was added.
- **Deployment dependency:** Clerk configuration, the reviewed PostgreSQL migration, and `DATABASE_URL` are required before hosted use. No hosted migration or broker request was performed.
- **Next smallest unit:** Implement the next lifecycle gate only after defining shadow-mode observation records and their separate approval/evidence requirements.

## Completed Build Unit — Phase 3.9

- **User story:** As a researcher, I can record a hypothetical signal for a shadow-stage strategy and later record exactly one market outcome without creating or mutating an order.
- **Implemented:** Added the shadow observation domain contract/store, migrations `0003_shadow_observations.sql`, Drizzle tables, and repository for immutable signal rows plus one-time outcome rows.
- **Safety boundary:** Shadow observations require `shadow` stage, use decimal-string prices, reject invalid timing/duplicates, and have no broker, risk approval, sizing, paper order, or live authority. No strategy is currently promoted to shadow.
- **Deployment dependency:** The migration remains a controlled Railway action; no hosted migration, live market evaluator, or broker request was performed.
- **Next smallest unit:** Build a server-side shadow evaluator that consumes finalized market bars and closes observations deterministically, with no order path.

## Completed Build Unit — Phase 3.10

- **User story:** As a researcher, I can close shadow observations from finalized bars using reproducible stop/target/time-stop/expiry rules without look-ahead or order behavior.
- **Implemented:** Added pure single-bar and sequence evaluators. They ignore bars at/before the signal or for other symbols, stop after the first outcome, and mark simultaneous stop/target hits invalidated.
- **Safety boundary:** Evaluation produces hypothetical outcomes only; no broker, database write, risk approval, sizing, paper order, or lifecycle promotion is reachable from the evaluator.
- **Deployment dependency:** A server-side runner and controlled shadow-stage promotion are still required; no hosted migration or broker request was performed.
- **Next smallest unit:** Add a durable shadow-evaluation runner that reads finalized bars and writes one-time outcomes through the repository, retaining freshness and restart boundaries.

## Completed Build Unit — Phase 3.11

- **User story:** As an operator, I can rerun shadow evaluation safely after a restart without duplicating outcomes or losing unresolved observations.
- **Implemented:** Added a stable-order batch runner with injected finalized-bar reads, idempotent closed-record checks, one-time outcome persistence, open/closed counts, and redacted source/persistence failure codes.
- **Safety boundary:** The runner has no broker, credential, order, risk, or lifecycle authority; all external effects are limited to the injected shadow outcome repository.
- **Deployment dependency:** The Railway worker scheduler and production finalized-bar adapter are not wired yet; no hosted migration or broker request was performed.
- **Next smallest unit:** Add a worker command/schedule boundary and health record for shadow evaluation, keeping it opt-in and disabled by default.

## Completed Build Unit — Phase 3.12

- **User story:** As an operator, I can see whether shadow evaluation is disabled or ready, and any one-shot invocation fails closed unless explicitly enabled with a configured source.
- **Implemented:** Added bounded worker configuration, shadow readiness fields to worker health, startup validation, and `pnpm --filter @momentum/worker shadow-evaluate` command boundary.
- **Safety boundary:** Shadow evaluation defaults off. The command does not claim success or run without a finalized-bar adapter; no broker, credential, risk, paper order, or lifecycle authority was added.
- **Deployment dependency:** The finalized-bar source/repository wiring and Railway schedule remain unimplemented; no hosted migration or broker request was performed.
- **Next smallest unit:** Wire the worker command to the finalized-bar source and shadow repository, then add bounded recurring scheduling with last-run/next-run health.

## Completed Build Unit — Phase 3.13

- **User story:** As an operator, I can explicitly enable a paper-only shadow worker that reads finalized bars, closes open observations idempotently, and exposes last/next run health.
- **Implemented:** Wired the worker command and optional scheduler to Alpaca historical market-data reads, PostgreSQL open observations/outcomes, the deterministic batch runner, and bounded scheduler health.
- **Safety boundary:** The path is disabled by default, requires paper broker opt-in plus database/source readiness, uses read-only market-data calls, writes only shadow outcomes, and cannot submit orders or promote strategies.
- **Deployment dependency:** Railway must apply migrations and configure the explicit shadow/source flags before use; no hosted migration or broker request was performed in this workspace.
- **Next smallest unit:** Run controlled shadow observations and define the replay → shadow promotion evidence gate; keep paper order behavior disabled.

## Completed Build Unit — Phase 3.14

- **User story:** As an operator, I can assess closed shadow observations for one exact strategy version and record an approved replay-to-shadow transition without enabling execution.
- **Implemented:** Added closed-observation evidence construction, decimal-safe sample/positive/worst-loss assessment, migration `0004_allow_replay_shadow_lifecycle.sql`, repository transition checks, and the in-process replay → shadow gate.
- **Safety boundary:** Evidence assessment never promotes automatically. The gate requires explicit matching operator approval and passing deterministic checks; no order, broker mutation, or paper execution path was added.
- **Deployment dependency:** Railway must apply migrations `0002`–`0004` through the controlled process; no hosted migration or broker request was performed in this workspace.
- **Next smallest unit:** Add the authenticated API command that loads persisted shadow outcomes, runs the assessment, and appends the reviewed replay-to-shadow event.

## Completed Build Unit — Phase 3.15

- **User story:** As the authenticated operator, I can request replay-to-shadow promotion using persisted closed shadow outcomes rather than client-supplied evidence.
- **Implemented:** Added `POST /v1/strategies/lifecycle/shadow`, server-controlled assessment and policy defaults, latest-stage verification, PostgreSQL closed-outcome loading, append-only revision two persistence, and redacted response/error handling.
- **Safety boundary:** The command requires Clerk operator identity, paper-only runtime configuration, a prior replay event, deterministic shadow checks, and explicit approval. It cannot submit orders or promote directly to paper/live execution.
- **Deployment dependency:** Apply migrations through Railway's controlled process and ensure closed shadow outcomes exist before invoking the command; no hosted migration or broker request was performed in this workspace.
- **Next smallest unit:** Implement the shadow → paper gate with paper-forward evidence and deterministic risk/readiness checks.

## Completed Build Unit — Phase 3.16

- **User story:** As an operator, I can evaluate whether a shadow strategy has enough paper-forward evidence to enter the paper stage without silently enabling execution.
- **Implemented:** Added paper-forward evidence and assessment contracts, default 30-calendar-day/20-trade policy, checks for drawdown, risk violations, stale data, and duplicate orders, lifecycle shadow → paper enforcement, repository support, and migration `0005_allow_shadow_paper_lifecycle.sql`.
- **Safety boundary:** Assessment is non-promoting and requires exact strategy/version evidence, passing deterministic checks, and explicit approval. No paper order submission, live endpoint, or automatic execution was added.
- **Deployment dependency:** Railway must apply migration `0005` through the controlled process; actual paper execution remains a later phase.
- **Next smallest unit:** Add the authenticated shadow-to-paper command that loads persisted paper-forward evidence and appends the reviewed event.

## Completed Build Unit — Phase 3.17

- **User story:** As the authenticated operator, I can promote a shadow strategy to paper using persisted paper-forward evidence and a server-controlled readiness assessment.
- **Implemented:** Added the `strategy_paper_evidence` schema/read model, migration `0006_strategy_paper_evidence.sql`, authenticated `POST /v1/strategies/lifecycle/paper`, exact-stage/version checks, deterministic reassessment, append-only revision handling, and redacted responses.
- **Safety boundary:** The command requires paper-only runtime configuration and explicit operator approval, but does not submit orders or enable Paper Autopilot. Risk, freshness, kill-switch, and reconciliation gates remain required later.
- **Deployment dependency:** Apply migrations `0005` and `0006` through Railway's controlled process and populate evidence through a reviewed server-side process; no hosted migration or broker request was performed.
- **Next smallest unit:** Build the deterministic paper risk/execution boundary without adding live capability.

## Completed Build Unit — Phase 5.1

- **User story:** As the paper execution boundary, I can accept only immutable, versioned signals and reject proposals that violate deterministic account, freshness, exposure, position-count, entry-count, kill-switch, or planned-loss rules.
- **Implemented:** Added immutable paper signals, policy defaults, decimal-safe risk assessment, explicit rule-level reasons, and tests for the USD 1,000 baseline and lower-of-0.25%-equity/USD-100 risk cap.
- **Safety boundary:** The risk assessment has no broker or order authority. It never submits, approves exceptions, changes limits, or enables live trading.
- **Deployment dependency:** No hosted migration, broker request, credential access, or paper order behavior was added.
- **Next smallest unit:** Add immutable trade-intent records and execution-time risk approvals with idempotency keys.

## Completed Build Unit — Phase 5.2

- **User story:** As the paper execution boundary, I can create a stable trade intent and obtain a fresh deterministic risk decision immediately before any future paper submission.
- **Implemented:** Added immutable trade intents, timestamp/expiry validation, execution-time reassessment, versioned approval records, one-approval-per-intent storage, and rejection tests for expiry and invalid quantities.
- **Safety boundary:** Approval records have no broker or order side effects and cannot bypass risk, freshness, kill-switch, or paper-mode checks.
- **Deployment dependency:** No hosted migration, broker request, credential access, paper order, or live capability was added.
- **Next smallest unit:** Add idempotent paper-order execution against the Alpaca paper endpoint, with approval and paper-mode gates enforced at submission.

## Completed Build Unit — Phase 5.3

- **User story:** As the paper execution boundary, I can submit an approved intent to Alpaca paper once and safely return the existing order on retry.
- **Implemented:** Added the server-only paper order adapter, client-order-ID idempotency lookup, approved-intent/paper-mode gates, paper endpoint pinning, normalized order responses, and adapter tests.
- **Safety boundary:** Only buy orders are supported. No live URL, credential logging, cancel/replace, liquidation, or agent override path exists. The adapter does not itself approve risk.
- **Deployment dependency:** Broker opt-in and paper credentials remain server-side; order submission is not wired into the worker/API flow until persistence and reconciliation are complete.
- **Next smallest unit:** Persist order submissions and reconcile broker truth transactionally before exposing any Paper Autopilot mode.

## Completed Build Unit — Phase 5.4

- **User story:** As the paper execution service, I can persist each approved intent once and reconcile broker status/fills without losing the audit trail or allowing a different intent to reuse its client order ID.
- **Implemented:** Added `paper_order_submissions`, migration `0007_paper_order_submissions.sql`, unique intent/client-ID constraints, transactional record/reconcile repository methods, and tests for duplicate-safe recording and broker updates.
- **Safety boundary:** Persistence has no order authority and reconciliation does not approve or submit orders. Paper Autopilot remains disabled; no live endpoint or credential path was added.
- **Deployment dependency:** Apply migration `0007` through Railway's controlled process before wiring the adapter to worker/API execution.
- **Next smallest unit:** Wire approved paper submission, persistence, and account/order reconciliation behind an explicit Paper Autopilot mode gate.

## Completed Build Unit — Phase 6.1

- **User story:** As the paper autopilot worker, I can execute only a currently approved intent when the explicit paper mode gate is enabled, persist the attempt, reconcile the broker result, and mark failures safely.
- **Implemented:** Added `PAPER_AUTOPILOT_ENABLED` fail-closed configuration, worker startup checks, approved-intent execution orchestration, pending/submitted/failed persistence flow, and end-to-end mock tests.
- **Safety boundary:** The gate requires paper mode, paper broker opt-in, server credentials, database configuration, and approved risk state. Live mode remains impossible; no agent can override the gate.
- **Deployment dependency:** Apply migration `0007` through Railway's controlled process and keep the flag false until the operator completes controlled paper verification.
- **Next smallest unit:** Run controlled paper-only execution/retry/partial-fill/restart tests and add durable scheduling/recovery safeguards.

## Completed Build Unit — Phase 6.2

- **User story:** As the paper recovery service, I can reconcile partial fills and terminal broker states without accepting an overfill, identity mismatch, status regression, or duplicate submission.
- **Implemented:** Added broker-status recovery classification, client-ID/quantity validation, terminal-state protection, partial-fill handling, worker integration, and recovery tests.
- **Safety boundary:** Contradictory broker responses fail closed and are marked failed; no second client order ID, live endpoint, or automatic retry loop is created.
- **Deployment dependency:** Controlled paper tests must be run only after migration `0007` and broker credentials are configured in Railway; Paper Autopilot remains off by default.
- **Next smallest unit:** Add durable scheduled execution/recovery and controlled hosted paper verification.

## Completed Build Unit — Phase 6.3

- **User story:** As the server runtime, I can retain a UTC daily-preparation job across restarts, retry bounded failures, route exhausted jobs to a dead-letter queue, and expose last/next-run health without requiring the dashboard.
- **Implemented:** Added the pinned `pg-boss` dependency, durable daily queue/dead-letter configuration, UTC schedule, bounded exponential retry settings, worker health state, startup/database gates, and focused scheduler tests.
- **Safety boundary:** `DURABLE_SCHEDULER_ENABLED` defaults to false; enabling it requires PostgreSQL, explicit handler approval, and `BROKER_CONNECTION_ENABLED=true`. The current handler performs only read-only paper-account reconciliation; the queue cannot bypass deterministic paper risk or execution gates.
- **Deployment dependency:** Railway must retain `DATABASE_URL`, apply the reviewed queue migration procedure through `pg-boss`, and keep the flag disabled until the handler and operator-run paper checks are complete.
- **Next smallest unit:** Enable the queue only after the Railway migration/configuration review, then run controlled hosted paper verification and restart tests.

## Completed Build Unit — Phase 6.4

- **User story:** As the operator, I can provision the durable queue through a one-shot guarded command, independently of worker startup, and verify that a worker restart re-registers the schedule without losing the queue boundary.
- **Implemented:** Added `pnpm --filter @momentum/worker durable-migrate` with an explicit `DURABLE_QUEUE_MIGRATE=true` guard, idempotent queue provisioning, and stop/start registration tests.
- **Safety boundary:** The command validates paper-only runtime and `DATABASE_URL`, starts no scheduler, performs no Alpaca request, and logs only generic success/failure messages. `DURABLE_QUEUE_MIGRATE` must not be persistent.
- **Deployment dependency:** Run the one-shot command from Railway's worker context after reviewing the generated `pg-boss` schema operation; keep `DURABLE_SCHEDULER_ENABLED=false` until the command and a controlled paper reconciliation are observed.
- **Next smallest unit:** Execute the guarded Railway queue migration and one restart/reconciliation verification with the operator's approval.

## Completed Build Unit — Phase 6.5

- **User story:** As the operator, I can verify the hosted durable queue after migration without starting workers, exposing credentials, or placing an order.
- **Implemented:** Added `pnpm --filter @momentum/worker durable-status`, which reports only queue presence and bounded counts for the work/dead-letter queues and exits non-zero when either queue is absent.
- **Safety boundary:** The command requires `DURABLE_QUEUE_STATUS=true`, paper-only runtime, and `DATABASE_URL`; it starts no scheduler, calls no Alpaca endpoint, and prints no connection details.
- **Deployment dependency:** Run `durable-migrate` first, then `durable-status` from Railway's worker context; no hosted command has been run from this workspace.
- **Next smallest unit:** Run the two guarded Railway commands, restart the worker, and observe one controlled paper reconciliation.

## Completed Build Unit — Phase 6.6

- **User story:** As the operator, I can trigger one immediate daily reconciliation job after a worker restart without waiting for the UTC schedule or creating duplicate work.
- **Implemented:** Added `pnpm --filter @momentum/worker durable-run-once`, a guarded idempotent enqueue using a deterministic UTC job ID, and tests for duplicate suppression.
- **Safety boundary:** The command requires `DURABLE_QUEUE_RUN_ONCE=true`, paper-only runtime, and `DATABASE_URL`; it only enqueues the existing read-only reconciliation job and never calls Alpaca or submits an order directly.
- **Deployment dependency:** Run `durable-migrate`, `durable-status`, restart the worker, then run `durable-run-once` from Railway; inspect status and reconciliation read models afterward.
- **Next smallest unit:** Perform the controlled Railway migration/status/restart/run-once sequence and record the observed evidence.

## Active Build Unit — Phase 6.7

- **User story:** As the operator, I can verify the deployed worker and durable queue in Railway's private runtime before allowing a read-only paper reconciliation.
- **Verified:** Added `DATABASE_URL=${{Postgres.DATABASE_URL}}` references to both Railway API and worker with deploys initially skipped; deployed the Phase 6 worker successfully; ran the guarded queue migration through Railway SSH; verified both work and dead-letter queues are present with zero queued, active, and failed jobs.
- **Safety boundary:** `DURABLE_SCHEDULER_ENABLED=false`, `DAILY_PREPARATION_HANDLER_ENABLED=false`, and `BROKER_CONNECTION_ENABLED=false` remain active. No Alpaca request, reconciliation, or order submission has occurred.
- **Remaining operator gate:** `BROKER_CONNECTION_ENABLED=true` must be explicitly approved before the worker may call the Alpaca paper read API. The worker now fails closed if durable reconciliation is enabled without that opt-in.
- **Next smallest unit:** After approval, enable broker connection and the verified handler, restart the worker, enqueue one run-once job, and verify the persisted read model.

## Completed Build Unit — Phase 6.8

- **User story:** As the operator, I can initialize the application schema in Railway transactionally before any reconciliation worker uses it.
- **Implemented:** Added `pnpm --filter @momentum/worker database-migrate`, a guarded migration runner with ordered reviewed SQL files, a `schema_migrations` ledger, per-migration transactions, and fail-closed rollback behavior.
- **Safety boundary:** The command requires `DATABASE_MIGRATE=true`, paper-only runtime, and `DATABASE_URL`; it performs no Alpaca call, order submission, scheduler start, or live-mode action.
- **Deployment dependency:** Run it inside the deployed Railway worker after the `pg-boss` migration and before enabling broker reconciliation.
- **Next smallest unit:** Apply the application migrations, confirm all required tables, then enable the paper broker read gate for one controlled reconciliation.
- **Hosted evidence:** Worker deployment reached `SUCCESS`; migrations `0001` through `0007` applied; `schema_migrations` contains 7 records; `account_snapshots`, `paper_order_submissions`, and `strategy_lifecycle_events` are present.

## Completed Build Unit — Phase 6.9

- **User story:** As the operator, I can run one explicitly guarded paper reconciliation inside Railway and verify that broker truth is persisted without enabling an order loop.
- **Verified:** Ran `RECONCILE_ONCE=true` with a temporary command-scoped `BROKER_CONNECTION_ENABLED=true`; the paper reconciliation completed and persisted 1 account snapshot, 1 position, and 1 order read-model row.
- **Safety boundary:** The persistent Railway broker flag remains false; no scheduler, Paper Autopilot, order submission, or live endpoint was enabled. Queue work and dead-letter counts remain zero.
- **Deployment dependency:** The Alpaca paper credentials and read-only account state are now verified in Railway; future scheduler activation must retain explicit broker, handler, and paper-mode gates.
- **Next smallest unit:** Add operator-visible reconciliation health and scheduler activation checks before considering Paper Autopilot enablement.

## Completed Build Unit — Phase 6.10

- **User story:** As the operator, I can see whether persisted paper reconciliation is fresh and whether the daily scheduler is disabled, blocked by missing gates, or ready for a separately approved activation.
- **Implemented:** Added authenticated `GET /v1/operations-health`, which reads the latest persisted model without contacting Alpaca and returns reconciliation status (`fresh`, `delayed`, `stale`, or `unavailable`) plus non-secret broker, handler, scheduler, and Paper Autopilot gate states.
- **Safety boundary:** The endpoint is read-only and operator-authenticated. It never enables a flag, starts a queue, submits an order, or exposes credentials. Scheduler readiness requires broker and handler opt-ins but persistent production flags remain disabled.
- **Verification:** `pnpm test` passes 99 tests; typecheck, lint, and production builds pass.
- **Hosted verification:** Railway API deployment `ad38f77b-4c12-45c8-83db-e2bbde091399` reached `SUCCESS`; `/health` returned HTTP 200; unauthenticated `/v1/operations-health` returned HTTP 401; API and worker remain `TRADING_MODE=paper`, `ALPACA_PAPER_TRADE=true`, `BROKER_CONNECTION_ENABLED=false`, with scheduler/handler/autopilot flags absent or false.
- **Next smallest unit:** Add a guarded worker readiness command before any scheduler activation review.

## Completed Build Unit — Phase 6.11

- **User story:** As the operator, I can check scheduler activation prerequisites without starting the worker, connecting to Alpaca, or changing Railway state.
- **Implemented:** Added `pnpm --filter @momentum/worker durable-readiness`, guarded by `DURABLE_QUEUE_READINESS=true`. It reports `disabled`, `blocked`, or `ready`, exposes only boolean gate checks and safe reason codes, and exits non-zero when an explicitly enabled scheduler is blocked.
- **Safety boundary:** The command is read-only and does not connect to PostgreSQL, inspect queue state, call Alpaca, start `pg-boss`, submit orders, or enable any environment variable. Paper mode and credentials are represented only as booleans.
- **Verification:** `pnpm test` passes 100 tests; typecheck, lint, and production build pass. Default invocation reports `disabled`; an explicitly enabled but incomplete environment reports `blocked` and exits 1.
- **Hosted verification:** Worker deployment `9bb31a13-e3d4-4a15-a6a0-63997e07b11d` reached `SUCCESS`; guarded Railway SSH readiness reported `status=disabled`, `databaseConfigured=true`, `paperCredentialsConfigured=true`, `paperMode=true`, and all activation flags false/disabled. No broker call or scheduler start occurred.
- **Next smallest unit:** Deploy the worker command and run the guarded readiness check in Railway; keep persistent scheduler, broker, handler, and Paper Autopilot flags disabled.

## Completed Build Unit — Phase 6.12

- **User story:** As the operator, I can exercise one durable reconciliation job through the scheduler worker boundary without turning on continuous scheduling or Paper Autopilot.
- **Implemented:** Added `pnpm --filter @momentum/worker durable-one-run`. It requires `DURABLE_SCHEDULER_ONCE=true`, command-scoped broker and verified-handler opt-ins, paper credentials, and `DATABASE_URL`; it provisions the existing queues, consumes exactly one read-only reconciliation job, waits with a bounded timeout, and shuts down.
- **Safety boundary:** The command refuses to run if persistent `DURABLE_SCHEDULER_ENABLED=true` or `PAPER_AUTOPILOT_ENABLED=true`; it does not create a recurring schedule, submit orders, or alter persistent Railway variables.
- **Verification:** `pnpm test` passes 101 tests; typecheck, lint, and production build pass. Missing handler/broker gates fail closed with a non-zero exit and no secret output.
- **Deployment dependency:** A hosted run requires explicit operator approval for temporary command-scoped `BROKER_CONNECTION_ENABLED=true` and `DAILY_PREPARATION_HANDLER_ENABLED=true`; persistent scheduler and Paper Autopilot flags remain disabled.
- **Hosted deployment:** Worker deployment `9faf1392-c6ed-4735-a8ee-5ed59708feb4` reached `SUCCESS`; Railway SSH readiness reports `status=disabled` with paper mode/database/credentials configured and all activation flags disabled. The one-run command itself has not been executed.
- **Next smallest unit:** Execute the one-run command in Railway, verify the persisted snapshot and queue counts, then restore the command-scoped environment automatically on process exit.

## Completed Build Unit — Phase 6.13

- **User story:** As the operator, I can see reconciliation freshness and scheduler/broker/Paper Autopilot gates directly in the authenticated dashboard.
- **Implemented:** Added strict parsing for the operations-health response and a responsive dashboard card that shows reconciliation age, scheduler state, broker-read gate, and Paper Autopilot state. Unavailable health remains visibly degraded; no fallback financial values are invented.
- **Safety boundary:** The dashboard only reads the authenticated API. It cannot change flags, start queues, access PostgreSQL, access Alpaca credentials, or submit orders.
- **Verification:** `pnpm test` passes 102 tests; typecheck, lint, and production build pass.
- **Hosted preview:** Vercel preview `https://papertrader-c6ucnqt30-altafrs-projects.vercel.app` reports `Ready`; unauthenticated requests correctly redirect to Vercel SSO because deployment protection is enabled. Authenticated visual verification remains an operator-browser step.
- **Next smallest unit:** Verify the dashboard preview and then execute the separately approved one-run paper reconciliation.

## Completed Build Unit — Phase 6.14

- **User story:** As the operator, I have a repeatable, safe procedure for one hosted paper reconciliation and know what evidence to collect afterward.
- **Implemented:** Added [`docs/railway-paper-reconciliation-runbook.md`](docs/railway-paper-reconciliation-runbook.md) and linked it from `README.md`. It documents preflight gates, command-scoped SSH variables, expected output, queue/read-model verification, persistent-variable checks, and failure handling.
- **Safety boundary:** The runbook explicitly forbids persistent flag changes, live credentials, repeated retries, and any assumption that a paper read authorizes continuous scheduling or Paper Autopilot.
- **Verification:** Documentation links and commands were reviewed against the deployed worker scripts; no hosted broker or database action was performed in this unit.
- **Next smallest unit:** Obtain explicit operator approval, run the one-run command once, and record redacted evidence.

## Completed Build Unit — Phase 6.15

- **User story:** As the maintainer, I receive the same paper-only quality checks on every pull request and push to `main`.
- **Implemented:** Added `.github/workflows/ci.yml` with locked pnpm installation, Node 22, lint, tests, typecheck, and production build. The workflow has `contents: read` permissions, a bounded timeout, and no service credentials.
- **Safety boundary:** CI never connects to Railway, PostgreSQL, Alpaca, Clerk, Vercel, or any order path; it verifies source only.
- **Verification:** The same four commands pass locally; workflow syntax and referenced scripts match the repository manifests.
- **Next smallest unit:** Obtain explicit operator approval, run the one-run paper reconciliation, and record redacted hosted evidence.

## Completed Operations Unit — Phase 6.16

- **User story:** As the operator, I can verify that Railway's PostgreSQL connection is configured on both backend services and usable without exposing the connection string.
- **Verified:** Railway CLI variable inspection found non-empty `DATABASE_URL` values on `api` and `worker`, with the PostgreSQL service's own `DATABASE_URL` also present. Values were classified without printing their contents.
- **Connectivity evidence:** The deployed Worker parsed `DATABASE_URL` without printing it, reached `postgres.railway.internal:5432`, and the PostgreSQL service returned `1` for a read-only `SELECT 1`. The Worker also ran the guarded, read-only `durable-status` command successfully and returned both work and dead-letter queues as present with zero queued, active, and failed jobs.
- **Safety boundary:** No variable, deployment, migration, broker flag, scheduler flag, Paper Autopilot flag, or order behavior was changed. The check did not print credentials or account values.
- **Next smallest unit:** Obtain explicit operator approval, run the one-run paper reconciliation, and record redacted hosted evidence.

## Completed Build Unit — Phase 6.17

- **User story:** As the operator, I can repeat a safe Railway database connectivity check without running a queue, calling Alpaca, or changing persistent configuration.
- **Implemented:** Added the guarded `database-status` Worker command and `verifyDatabaseConnectivity` probe. It requires `DATABASE_STATUS=true`, paper-only runtime, and `DATABASE_URL`, executes only `SELECT 1`, closes the pool, and emits no connection details.
- **Safety boundary:** The command is one-shot and command-scoped. It cannot start scheduling, call Alpaca, write application state, submit orders, or enable Paper Autopilot; provider failures are redacted to a generic error.
- **Verification:** `pnpm test` passes 147 tests; typecheck, lint, and production build pass. The command is ready for a hosted disabled-by-default deployment check.
- **Hosted verification:** Worker deployment `d28e267c-42cd-4cfa-b364-9f30c8468bca` reached `SUCCESS`; Railway SSH returned `{"databaseReachable":true}` using `env DATABASE_STATUS=true pnpm --filter @momentum/worker database-status`. Persistent broker, research, durable-scheduler, daily-handler, and Paper Autopilot flags remain disabled or unset.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation.

## Completed Build Unit — Phase 6.18

- **User story:** As the maintainer, I receive an automated check that prevents credential-like values from entering source control or browser output.
- **Implemented:** Added `scripts/audit-secret-surfaces.sh`, the `audit:secret-surfaces` package script, and a GitHub CI step after the production build. It scans assigned secret values in source/tracked files and database/Clerk secret formats in browser static output.
- **Safety boundary:** The audit emits only filenames on failure, never matching values. It does not access Railway, PostgreSQL, Alpaca, Clerk, or any order path.
- **Verification:** Fresh `pnpm build`, `pnpm audit:secret-surfaces`, `pnpm test` (147 tests), `pnpm typecheck`, `pnpm lint`, and `git diff --check` pass.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation.

## Completed Build Unit — Phase 6.19

- **User story:** As the operator, I can see and validate whether the server is in Observe, Recommend, or Paper Autopilot mode without accidentally enabling execution.
- **Implemented:** Added strict `getPaperOperatingMode` configuration resolution, contradiction checks, API operations-health mode output, dashboard parsing/rendering, and configuration/dashboard tests.
- **Safety boundary:** Defaults remain `observe`; live modes are impossible; Paper Autopilot still requires its existing broker, paper, risk, freshness, and execution gates. No mode-changing route or persistent Railway variable was added.
- **Verification:** 149 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass.
- **Hosted verification:** API deployment `5bae4605-c1e8-4115-bbdc-90982aab61ad` reached `SUCCESS`; `/health` returned HTTP 200 and unauthenticated `/v1/operations-health` returned HTTP 401. `OPERATING_MODE` is unset in Railway, resolving to safe `observe`; broker, scheduler, handler, and Paper Autopilot flags remain disabled or unset.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation.

## Completed Build Unit — Phase 6.20

- **User story:** As the operator, I can see the current operating mode in the dashboard's always-visible status bar.
- **Implemented:** Replaced the generic dashboard “Read-only” badge with the authenticated server-resolved mode and an explicit `Mode unavailable` state when operations health cannot be read.
- **Safety boundary:** The browser remains display-only; it does not infer mode, change configuration, access credentials, or submit orders.
- **Verification:** The dashboard production build, 149 tests, typecheck, lint, secret-surface audit, and diff checks pass.
- **Hosted preview:** Vercel preview deployment `dpl_CQua9HGsqECuzwatPiKrU8CgWsaj` reached `Ready`; unauthenticated HTTP returned `302` to deployment protection. Authenticated visual review remains an operator-browser step.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation.

## Completed Build Unit — Phase 6.21

- **User story:** As an operator or reviewer, I see an accurate public description of what is deployed without confusing the initial scaffold with the current paper-only infrastructure.
- **Implemented:** Updated the public foundation page's phase label, mode/broker badges, deployment-boundary states, copy, and safety description to match the current Vercel/Railway architecture.
- **Safety boundary:** The page remains informational and exposes no secrets, database access, Alpaca calls, controls, scheduler authority, risk approval, or order methods.
- **Verification:** 149 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Vercel preview `dpl_BgZVSWj78ASLQtrBBTedh98DQK5c` is Ready; unauthenticated HTTP returns `302` due to deployment protection.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation.

## Completed Operations Unit — Phase 6.22

- **User story:** As the operator, I can verify the private Worker agrees with the API and dashboard about the current operating mode and gate state.
- **Implemented:** Added `operatingMode` to the shared Worker health contract, resolved it through the paper-only config guard, and made startup fail closed on contradictory mode flags.
- **Safety boundary:** Health remains read-only; it cannot enable modes, call Alpaca, write application state, start schedules, or submit orders.
- **Verification:** 149 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `06735237-cbfa-4bc0-8004-cd4e899b53ba` succeeded; private `/health` returned HTTP 200 with `operatingMode:"observe"` and all optional gates disabled.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation.

## Completed Operations Unit — Phase 6.23

- **User story:** As the operator, I can distinguish configured paper prerequisites from enabled broker execution on the private Worker.
- **Implemented:** Worker health reports non-secret Alpaca and PostgreSQL configuration status separately from the broker-connection gate, while preserving the resolved paper operating mode and optional scheduler/research/shadow gate state.
- **Safety boundary:** The health endpoint is read-only and reports status only; it cannot expose secret values, call Alpaca, write application state, start schedules, enable Paper Autopilot, or submit orders.
- **Verification:** Worker deployment `af3ef28a-174d-4a63-bd5c-b5d5ac046201` reached `SUCCESS`; private `/health` returned HTTP 200 with `status:"healthy"`, `operatingMode:"observe"`, `alpaca:"configured"`, `database:"configured"`, `brokerConnectionEnabled:false`, and durable/research/shadow gates disabled.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation.

## Completed Build Unit — Phase 6.24

- **User story:** As the operator, I can tie a hosted one-run reconciliation to a bounded non-secret approval or change reference without making that reference a persistent credential or execution authority.
- **Implemented:** Added command-scoped `DURABLE_SCHEDULER_APPROVAL_REFERENCE` validation, passed the reference only in the immediate one-run payload, added rejection/acceptance tests, and updated the Railway runbook.
- **Safety boundary:** The reference cannot authorize orders, change persistent Railway variables, enable recurring scheduling, or bypass paper/broker/database gates. No hosted command was executed.
- **Verification:** 151 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation.

## Completed Build Unit — Phase 6.25

- **User story:** As the operator, I can rely on explicit domain invariants for the USD 1,000 paper baseline and the maximum USD 100 single-trade risk.
- **Implemented:** Named the baseline and absolute risk-ceiling constants and added regression tests proving the deterministic risk engine applies the lower of 0.25% of current equity and USD 100, including fees and slippage.
- **Safety boundary:** The invariants remain paper-only and side-effect free; they cannot enable strategies, approve trades, call Alpaca, write PostgreSQL, or modify Railway variables.
- **Verification:** 153 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation.

## Completed Build Unit — Phase 6.26

- **User story:** As the operator, I can see the active paper baseline and single-trade risk ceiling in the authenticated operations dashboard.
- **Implemented:** Extended the redacted operations-health API contract and dashboard parser/card with the USD 1,000 baseline, USD 100 absolute ceiling, and 0.25% equity limit.
- **Safety boundary:** The values are server-provided display metadata; no browser control, policy mutation, approval bypass, broker call, database write, or execution enablement was added.
- **Verification:** 153 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. API deployment `c4c0901c-f9ea-4638-95af-add7ca2227fd` reached `SUCCESS`; `/health` returned HTTP 200 and unauthenticated `/v1/operations-health` returned HTTP 401. Vercel preview `dpl_E378eJz2ZU3AauLptSPJeogFqhCW` reached `Ready`; unauthenticated HTTP returned the expected deployment-protection 302. No Railway worker flags changed.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation.

## Completed Build Unit — Phase 6.27

- **User story:** As the operator, I can inspect whether unattended paper execution is configuration-ready without enabling it or contacting external services.
- **Implemented:** Added `PAPER_AUTOPILOT_READINESS=true pnpm --filter @momentum/worker paper-autopilot-readiness`, with bounded checks for paper mode, credentials, database/broker gates, scheduler/handler gates, operating mode, and risk invariants.
- **Safety boundary:** The command is read-only and client-free; `ready` means configuration-ready only and explicitly retains a runtime freshness gate. It cannot start schedules, read Alpaca, write PostgreSQL, approve an intent, or submit an order.
- **Verification:** 156 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `7f225657-eedb-4c42-b803-a7a8b4e6a7fe` reached `SUCCESS`; hosted `PAPER_AUTOPILOT_READINESS=true` returned `status:"disabled"`, paper mode/credentials/database configured, broker/scheduler/handler/autopilot gates disabled, and `runtimeFreshnessGateRequired:true`. No Alpaca or PostgreSQL client was constructed.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation; keep the hosted readiness result disabled until then.

## Completed Build Unit — Phase 4.1

- **User story:** As the orchestrator, I can create and track structured research-agent runs with provenance and concise evidence without granting any agent financial authority.
- **Implemented:** Added `packages/domain/src/agent-runs.ts` with agent-role metadata, versioned artifact contracts, immutable run records, lifecycle validation, registered-handler dispatch, and redacted failure codes. Added focused tests covering lifecycle ordering, duplicate IDs, malformed artifacts, handler failures, and unregistered agents.
- **Safety boundary:** The unit is in-process and paper-only. It does not call an LLM, Alpaca, PostgreSQL, scheduler, risk approval, or order path. Agent output is evidence-bearing input only; no output can approve or submit a trade.
- **Verification:** `pnpm test` passes 106 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass across the workspace.
- **Next smallest unit:** Add read-only stock and crypto research agents that consume validated market inputs and emit bounded artifacts through this orchestrator.

## Completed Build Unit — Phase 4.2

- **User story:** As the research layer, I can rank fresh stock and crypto bar inputs into bounded watchlist evidence without placing orders or changing strategy state.
- **Implemented:** Added deterministic `runStockResearch` and `runCryptoResearch` handlers with positive-price/volume and timestamp validation, point-in-time momentum/average-volume calculations, asset-class separation, 20-candidate output bounds, and source evidence references.
- **Safety boundary:** The handlers are read-only domain functions. They do not call Alpaca, PostgreSQL, an LLM, a scheduler, a risk engine, or an order method; their output is explicitly not an order recommendation.
- **Verification:** `pnpm test` passes 109 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass across the workspace.
- **Next smallest unit:** Add authenticated, read-only worker/API wiring for persisted agent-run health and research artifacts, keeping the handlers disabled by default.

## Completed Build Unit — Phase 4.3

- **User story:** As the operator, I can inspect recent research-agent run status and provenance through an authenticated API without exposing private artifact contents or granting control authority.
- **Implemented:** Added migration `0008_agent_runs.sql`, Drizzle `agent_runs` schema, transactional status repository, and authenticated `GET /v1/agent-runs?limit=50`. The response is metadata-only and bounded to 1–100 records.
- **Safety boundary:** The migration is not applied automatically; no agent invocation, broker call, order action, risk approval, scheduler activation, or configuration mutation was added. Missing database/auth configuration fails closed, and artifact payload/rationale are omitted from the read view.
- **Verification:** `pnpm test` passes 110 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass across the workspace. Hosted migration and endpoint verification remain pending the controlled Railway process and authenticated operator session.
- **Next smallest unit:** Add the macro advisory/economic-event read-only artifact contract, then wire bounded research runs through the durable worker only after migration review.

## Completed Build Unit — Phase 4.4

- **User story:** As the research layer, I can represent scheduled macro/economic events and deterministic timing risk flags without allowing advisory context to authorize a trade.
- **Implemented:** Added validated economic-event records, bounded 1–168-hour horizons, source references, high-impact-near and sparse-source flags, and the `macro_advisory` structured artifact/handler.
- **Safety boundary:** The artifact is advisory-only and does not call external providers, alter risk policy, approve/reject intents, or submit orders. Invalid timestamps, stale input, blank fields, and oversized inputs fail closed.
- **Verification:** `pnpm test` passes 112 tests; `pnpm typecheck` passes across the workspace. Full lint/build remain part of the final phase handoff.
- **Next smallest unit:** Wire bounded stock/crypto/macro research runs through a disabled-by-default worker command after the hosted `0008_agent_runs` migration is reviewed.

## Completed Build Unit — Phase 4.5

- **User story:** As the server runtime, I can execute exactly one explicitly guarded research artifact run and persist its status without creating a recurring job or financial authority.
- **Implemented:** Added `apps/worker`'s `research-run-once` command and reusable runner. It requires `RESEARCH_RUN_ONCE=true`, bounded `RESEARCH_INPUT_JSON`, an explicit agent type, paper-only runtime, and `DATABASE_URL`; it persists queued/running/succeeded or redacted failed status, then exits.
- **Safety boundary:** The command does not fetch market data, call an LLM, contact Alpaca, start a scheduler, approve risk, or submit orders. It remains disabled by default and requires migration `0008` before hosted use.
- **Verification:** `pnpm test` passes 114 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass across the workspace.
- **Next smallest unit:** Apply migration `0008` through Railway's controlled process, then perform a separately approved non-broker research-run verification with safe fixture input.

## Completed Operations Unit — Phase 4.6

- **User story:** As the operator, I can verify the hosted database is ready for agent-run records without starting research or trading behavior.
- **Verified:** Deployed Worker `c8db3f78-e562-451d-bbf6-6ad93c092f6f` reached `SUCCESS`; guarded `database-migrate` reported `appliedThrough=0008` and `migrationCount=8`.
- **Safety boundary:** No synthetic research artifact was inserted, no Alpaca request or broker flag was enabled, and durable scheduler, handler, and Paper Autopilot remain disabled.
- **Next smallest unit:** Obtain explicit approval for one non-broker fixture research run, or continue implementing the next read-only artifact boundary without hosted execution.

## Completed Build Unit — Phase 4.7

- **User story:** As the operator, I can see recent research-agent health and provenance in the authenticated dashboard without exposing private artifact content or gaining control authority.
- **Implemented:** Added strict `parseAgentRuns` response validation, server-side dashboard loading from `/v1/agent-runs`, responsive run-health rows, status states, and explicit unavailable/degraded handling.
- **Safety boundary:** The browser receives metadata only; artifact payloads and rationale remain server-side. No agent execution, broker call, scheduler activation, risk approval, or order method was added.
- **Verification:** `pnpm test` passes 115 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass across the workspace.
- **Next smallest unit:** Obtain explicit approval for one non-broker fixture research run, or implement the next read-only agent evidence surface without hosted execution.

## Completed Build Unit — Phase 4.8

- **User story:** As the operator, I can inspect one stored agent artifact through an authenticated API without receiving unbounded or secret-like payload content.
- **Implemented:** Added `GET /v1/agent-runs/:runId`, strict run-ID validation, bounded recursive payload handling, secret-key redaction, rationale truncation, and not-found/incomplete-artifact states. Added focused redaction tests.
- **Safety boundary:** The endpoint is read-only and metadata/artifact inspection only. It cannot execute agents, change configuration, call Alpaca, approve risk, or submit orders.
- **Verification:** `pnpm test` passes 117 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass across the workspace.
- **Next smallest unit:** Obtain explicit approval for one non-broker fixture research run, or continue implementing read-only agent evidence tooling without hosted execution.

## Completed Build Unit — Phase 4.9

- **User story:** As the research runtime, I can read bounded historical bars from the Alpaca paper market-data endpoint and convert them into validated research input without creating trading authority.
- **Implemented:** Added the server-only paper market-data source adapter, bounded request validation, mapping tests, and guarded `research-market-run-once` worker command. It supports stock/crypto research, approved timeframes, 1–10 symbols, 2–1,000 bars, and 1–20 candidates.
- **Safety boundary:** The command requires explicit command-scoped broker opt-in and remains disabled by default. It performs one read-only market-data call and one agent-run persistence write; it cannot submit orders, approve risk, enable a scheduler, or use live endpoints.
- **Verification:** `pnpm test` passes 119 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass across the workspace. Hosted command execution was not performed.
- **Next smallest unit:** Obtain explicit approval for one paper market research run, or continue implementing read-only evidence/research persistence without hosted execution.

## Completed Build Unit — Phase 4.10

- **User story:** As the operator, I can see whether a future daily research schedule is disabled, blocked, or ready without accidentally starting research or trading behavior.
- **Implemented:** Added a disabled-by-default research schedule contract with UTC queue/cron identity, bounded retry configuration, deterministic manual job IDs, fail-closed paper-mode validation, explicit database/broker/credential/handler gates, and redacted readiness status in worker health.
- **Safety boundary:** This unit does not provision a queue, invoke a research handler, call Alpaca, approve risk, submit orders, or enable a recurring schedule. Research scheduling remains a separate reviewed activation step.
- **Verification:** `pnpm test` passes 123 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass across the workspace. The malformed paper-mode case is covered and no credential value is included in readiness output.
- **Next smallest unit:** Define the reviewed research-preparation job handler and queue wiring, keeping the schedule disabled until an explicit operator activation review.

## Completed Build Unit — Phase 4.11

- **User story:** As the research worker, I can provision and enqueue a versioned daily research-preparation job independently from reconciliation, then reject malformed queue payloads before an injected handler runs.
- **Implemented:** Added separate research work/dead-letter queue identities, bounded queue provisioning options, deterministic UTC manual enqueue IDs, payload validation, and an injected preparation runner. Queue helpers remain disabled-by-default library boundaries; no recurring worker was started.
- **Safety boundary:** The queue boundary cannot call Alpaca, approve risk, submit orders, mutate strategy state, or enable a scheduler on its own. Invalid payloads fail closed, and no credentials are included in queue data or errors.
- **Verification:** `pnpm test` passes 125 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass across the workspace. No hosted queue provisioning or research execution was performed.
- **Next smallest unit:** Define the deterministic research-preparation input planner and persistence handoff, still behind explicit handler and scheduler gates.

## Completed Build Unit — Phase 4.12

- **User story:** As the research handler, I can turn explicit bounded stock and crypto settings into deterministic input plans, read fresh paper market data through an injected source, and persist one versioned agent run through the existing lifecycle boundary.
- **Implemented:** Added strict symbol/timeframe/bar/candidate configuration parsing, separate stock and crypto plans, deterministic run IDs, source-to-handler dispatch, and persistence handoff tests. No default asset universe or implicit hosted execution was introduced.
- **Safety boundary:** The planner is research evidence only. It cannot approve risk, submit orders, alter strategy state, enable a scheduler, or access credentials directly; queue and handler gates remain required.
- **Verification:** `pnpm test` passes 128 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass across the workspace. No hosted market-data read or agent-run write was performed.
- **Next smallest unit:** Add the disabled-by-default queue handler composition that invokes the planner only after all research readiness gates pass.

## Completed Build Unit — Phase 4.13

- **User story:** As the research queue, I can refuse preparation until all paper/database/broker/credential/handler gates are ready, then process bounded stock and crypto plans through deterministic persistence.
- **Implemented:** Added a gated queue-handler factory that checks readiness before source access, composes the explicit planner, runs asset classes sequentially, and returns bounded run results. The handler is not registered or activated by the worker.
- **Safety boundary:** A blocked or malformed environment fails closed before market-data access. The handler has no risk approval, order submission, live endpoint, persistent flag mutation, or scheduler-start authority.
- **Verification:** `pnpm test` passes 130 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass across the workspace. No hosted market-data read or agent-run write was performed.
- **Next smallest unit:** Register the handler with the research queue only behind an explicit scheduler activation boundary, preserving disabled defaults and safe worker health.

## Completed Build Unit — Phase 4.14

- **User story:** As the research runtime, I can register the research queue, UTC schedule, retries, dead-letter route, and validated handler only when all explicit readiness gates pass.
- **Implemented:** Added a scheduler factory with readiness-before-client-creation, stable schedule key, queue provisioning, handler dispatch, UTC next-run health, and fail-closed startup/handler failure state.
- **Safety boundary:** The factory is disabled when configuration is off and is not instantiated by the deployed worker. It cannot bypass paper mode, database, broker, credentials, handler gates, risk controls, or order boundaries.
- **Verification:** `pnpm test` passes 132 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass across the workspace. Blocked and ready scheduler registration paths are covered; no hosted queue or research execution was performed.
- **Next smallest unit:** Expose the scheduler runtime health in the worker health contract, then review the explicit activation sequence without changing persistent Railway flags.

## Completed Build Unit — Phase 4.15

- **User story:** As the operator, I can distinguish a disabled, blocked, ready, scheduled, running, or degraded research scheduler from the worker health endpoint without seeing secrets or gaining control authority.
- **Implemented:** Extended the shared worker-health contract with optional research last/next run timestamps and runtime states, and combined readiness/runtime state in `getWorkerHealth` with strict fail-closed precedence.
- **Safety boundary:** Health reporting is read-only and does not instantiate the scheduler, access Alpaca, mutate PostgreSQL, alter Railway variables, approve risk, or submit orders.
- **Verification:** `pnpm test` passes 133 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass across the workspace. Disabled, blocked, and fully gated-ready health cases are covered.
- **Next smallest unit:** Add a guarded worker startup composition that can instantiate the scheduler only when explicitly enabled, without changing persistent Railway defaults.

## Completed Build Unit — Phase 4.16

- **User story:** As the worker process, I can compose the paper market-data source, agent-run persistence, deterministic handler, and research scheduler only after explicit readiness gates pass.
- **Implemented:** Added the guarded environment composition and wired it into worker startup. Disabled environments return before constructing external clients; enabled-but-incomplete environments fail closed before database/broker construction.
- **Safety boundary:** The composition is paper-only, server-side, and read-only with respect to Alpaca. It cannot submit orders or bypass risk, and it does not change persistent Railway variables or enable itself by default.
- **Verification:** `pnpm test` passes 135 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass across the workspace. Disabled and blocked startup paths are covered; no hosted scheduler or research execution was performed.
- **Next smallest unit:** Add a guarded local/CI startup readiness check for the composed worker, then review hosted activation without changing persistent defaults.

## Completed Build Unit — Phase 4.17

- **User story:** As a maintainer, I can verify research scheduler readiness locally and in CI without credentials, database access, queue startup, or market-data calls.
- **Implemented:** Added the guarded `research-readiness` worker command and CI step. Default execution reports `disabled`; explicitly enabled incomplete configuration reports safe blocked reasons and exits 1.
- **Safety boundary:** The command is read-only configuration inspection. It never prints secret values, constructs external clients, mutates Railway, starts a scheduler, or reaches an order path.
- **Verification:** Default readiness returned `status: "disabled"`; incomplete enabled readiness returned `status: "blocked"` with exit code 1; `pnpm test` passes 135 tests, and typecheck/lint/build pass.
- **Hosted check:** Railway SSH reached the deployed worker, but the current deployment predates this command and reported no `research-readiness` script. No deployment, variable, scheduler, broker, or research state was changed.
- **Next smallest unit:** Add operator-facing hosted readiness evidence for the composed research scheduler without enabling persistent Railway flags.

## Completed Operations Unit — Phase 4.18

- **User story:** As the operator, I can verify the deployed worker contains the guarded research readiness command and remains safely disabled before any hosted research activation.
- **Verified:** Railway deployment `5290f522-99da-4b71-b1bf-2e2b4d9f8c86` reached `SUCCESS`. SSH readiness returned `status: "disabled"`, with paper mode, database, and paper credentials configured; broker, research handler, and research scheduler gates remained off.
- **Safety boundary:** The verification did not call Alpaca, provision queues, start a scheduler, write agent runs, change variables, or submit orders. Secret values were never printed.
- **Next smallest unit:** Review a separately approved single hosted paper market-data research run, keeping recurring research scheduling and Paper Autopilot disabled.

## Completed Build Unit — Phase 4.19

- **User story:** As the operator, I can require a distinct, auditable command-scoped approval before a hosted paper research run can construct any broker or database client.
- **Implemented:** Added `RESEARCH_MARKET_OPERATOR_APPROVAL=true` and bounded `RESEARCH_MARKET_APPROVAL_REFERENCE` validation, focused guard tests, and [`docs/railway-research-runbook.md`](docs/railway-research-runbook.md).
- **Safety boundary:** Missing or unsafe approval fails before credential, database, or market-data access. The guard does not enable recurring research or grant order/risk authority.
- **Verification:** `pnpm test` passes 137 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass. Hosted research execution remains unperformed.
- **Next smallest unit:** Obtain explicit operator approval for one bounded hosted paper research run, then verify the persisted metadata and disabled persistent flags.

## Completed Build Unit — Phase 4.20

- **User story:** As the operator, I can validate every bounded input and activation prerequisite for a future hosted research run without contacting Alpaca, PostgreSQL, or the queue.
- **Implemented:** Added the guarded `research-market-preflight` command and pure validation contract for approval, paper mode, broker/database prerequisites, agent type, symbols, timeframe, bar limit, and candidate bound.
- **Safety boundary:** Preflight is read-only and prints only bounded metadata. It cannot fetch market data, persist artifacts, start recurring research, approve risk, or submit orders.
- **Verification:** A complete local preflight returned safe metadata; incomplete approval/database/symbol cases fail closed; `pnpm test` passes 139 tests, and typecheck/lint/build pass. No hosted research run was performed.
- **Next smallest unit:** Obtain explicit operator approval for one bounded hosted paper research run and execute the documented preflight first.

## Completed Build Unit — Phase 4.21

- **User story:** As an auditor, I can trace a future one-run research artifact to the operator approval reference without storing credentials or granting the artifact any authority.
- **Implemented:** Added deterministic `operator-approval:<reference>` provenance alongside the market-data input reference in `research-market-run-once` requests, with focused tests.
- **Safety boundary:** Provenance is metadata only. It cannot approve risk, submit orders, enable scheduling, or replace the separate command-scoped approval gate.
- **Verification:** `pnpm test` passes 140 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass. No hosted research command was executed.
- **Next smallest unit:** Obtain explicit operator approval for one bounded hosted paper research run, execute the documented preflight, and verify the persisted metadata.

## Completed Build Unit — Phase 4.22

- **User story:** As the operator, I can close out a future hosted research run by checking its persisted success, artifact presence, and approval provenance without exposing payloads or contacting the broker.
- **Implemented:** Added guarded `research-run-verify`, bounded verification metadata, repository read-only lookup, and focused failure tests for missing provenance, failed status, and missing artifacts.
- **Safety boundary:** Verification never writes PostgreSQL, calls Alpaca, starts queues, changes flags, approves risk, or submits orders.
- **Verification:** `pnpm test` passes 142 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass. No hosted research run or persisted artifact verification was performed.
- **Next smallest unit:** Obtain explicit operator approval, execute the documented preflight and one-run command, then use this verifier to confirm the persisted result.

## Completed Build Unit — Phase 4.23

- **User story:** As the operator, I can verify a future approved research run by explicit ID or by the latest run carrying the matching approval reference, without exposing payloads.
- **Implemented:** Added bounded latest-run selection over the most recent 100 records, preserving the explicit-ID path and metadata-only verification contract.
- **Safety boundary:** Selection is read-only and cannot start research, mutate state, expose artifacts, approve risk, or submit orders.
- **Verification:** `pnpm test` passes 143 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass. No hosted run was selected or verified.
- **Next smallest unit:** Obtain explicit operator approval, execute the documented preflight and one-run command, then verify the latest persisted result.

## Completed Operations Unit — Phase 4.24

- **User story:** As the operator, I can use the deployed research preflight and verification tooling while confirming the recurring scheduler remains disabled.
- **Verified:** Worker deployment `9467848b-f63a-4598-a783-2bc65c65715c` reached `SUCCESS`; hosted readiness returned `disabled`; hosted command-scoped preflight returned bounded paper metadata with broker/database prerequisites satisfied.
- **Safety boundary:** The preflight did not call Alpaca, open a database connection, write an agent run, start a queue, change persistent flags, or submit an order. The local preflight failure without credentials also confirmed the server-side credential boundary.
- **Next smallest unit:** Obtain explicit operator approval for one bounded hosted paper research run, execute the preflight and run once, then verify its persisted metadata.

## Completed Build Unit — Phase 4.25

- **User story:** As the research source, I can reject malformed or temporally unsafe paper bars before they become agent input or persisted research evidence.
- **Implemented:** Added deterministic validation for requested symbols, timestamp validity/future bounds, per-symbol ordering, positive OHLCV values, and OHLC consistency, with injected-clock tests.
- **Safety boundary:** Validation is read-only and fail-closed. It cannot call order APIs, approve risk, write PostgreSQL, start queues, or change operating mode.
- **Verification:** `pnpm test` passes 144 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass. No hosted market-data request was performed.
- **Next smallest unit:** Obtain explicit operator approval for one bounded hosted paper research run, execute the preflight and run once, then verify its persisted metadata.

## Completed Build Unit — Phase 4.26

- **User story:** As the research source, I can distinguish exact duplicate bars from older out-of-order bars while failing closed in both cases.
- **Implemented:** Added explicit duplicate timestamp rejection and focused coverage without weakening existing ordering, timestamp, or OHLCV checks.
- **Safety boundary:** The distinction is diagnostic metadata only; it cannot trigger retries, mutate state, or authorize a run.
- **Verification:** `pnpm test` passes 144 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass. No hosted market-data request was performed.
- **Next smallest unit:** Obtain explicit operator approval for one bounded hosted paper research run, execute the preflight and run once, then verify its persisted metadata.

## Completed Operations Unit — Phase 4.27

- **User story:** As the operator, I can confirm the deployed worker contains the latest fail-closed market-bar integrity checks before any approved research execution.
- **Verified:** Worker deployment `440f6de2-6d34-4661-9d90-547f4fd18ce9` reached `SUCCESS`; hosted readiness returned `disabled` with all research activation gates off.
- **Safety boundary:** Deployment and readiness verification did not call market data, write PostgreSQL, start queues, change persistent variables, or submit orders.
- **Next smallest unit:** Obtain explicit operator approval for one bounded hosted paper research run, execute the preflight and run once, then verify its persisted metadata.

## Decisions Made

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-08-21 | Version 1 is paper-only. | Validate behavior and safeguards without real-capital exposure. |
| 2026-08-21 | Runtime uses protected Alpaca APIs; MCP supports research/operator workflows. | Development-client MCP connections are not deployed-app runtime services. |
| 2026-08-21 | AI agents cannot directly approve risk or bypass execution gates. | Keep financial authority deterministic, bounded, and auditable. |
| 2026-08-21 | US stocks and crypto use separate parameters and exposure caps. | Their sessions, liquidity, volatility, and market structure differ. |
| 2026-08-21 | No browser-hosted continuous loop. | Browser sessions are not reliable always-on infrastructure. |
| 2026-08-21 | Server-side daily operation is required. | Preparation, health, reconciliation, and evaluation must continue without an open browser. |
| 2026-08-21 | Paper Autopilot needs no per-order operator confirmation. | Deterministic risk approval and all safety gates remain mandatory. |
| 2026-08-21 | Initial paper equity is USD 1,000; estimated planned-stop loss is capped at the lower of 0.25% equity and USD 100. | Preserve conservative proportional risk while adding an absolute loss ceiling. |
| 2026-08-21 | Vercel is the selected frontend host. | Next.js/Vercel provides a conventional maintainable application and deployment path for the operational dashboard. |
| 2026-08-21 | Railway PostgreSQL is the Version 1 system of record. | PostgreSQL supplies transactional constraints, reconciliation queries, backups, and direct integration with the Railway API/worker stack. |
| 2026-08-21 | Railway hosts the API, durable job processor, and always-on WebSocket worker. | Consolidating the backend reduces integrations while retaining persistent server processes. |
| 2026-08-21 | Use a pnpm strict TypeScript workspace with separate web, API, worker, and shared packages. | Enforce deployment and permission boundaries before adding integrations. |
| 2026-08-22 | Clerk is the single-operator authentication provider; the Railway API independently verifies tokens and the exact operator allowlist. | Its Next.js, backend verification, and re-verification support fit the split Vercel/Railway deployment while keeping authorization server-side. |
| 2026-08-22 | Use Drizzle ORM and Drizzle Kit over `node-postgres`. | Preserve strict TypeScript ergonomics while keeping SQL migrations, PostgreSQL constraints, locking, and transactions visible and reviewable. |
| 2026-08-22 | Use `pg-boss` for durable jobs on Railway PostgreSQL. | Avoid another stateful service while providing persistent scheduling, retries, backoff, heartbeats, and dead-letter handling. |
| 2026-08-22 | Use Zod for runtime trust-boundary validation. | Reject malformed configuration, HTTP commands, queue payloads, and provider responses before domain use. |
| 2026-08-22 | Use `decimal.js` for authoritative financial arithmetic and serialize decimal values as strings. | Make precision and rounding explicit and prevent binary floating-point values from entering persisted financial calculations. |

## Verification Status

| Check | Result | Notes |
| --- | --- | --- |
| Context consistency | Pass | Six controlling files re-read before Phase 0.1 and Phase 0.3 changes; no conflict found |
| Typecheck | Pass | Phase 0.4 re-run after shared-package build: `pnpm typecheck`; 7 workspace projects passed |
| Lint | Pass | Phase 0.4 re-run: `pnpm lint`; zero warnings |
| Tests | Pass | Phase 0.4 re-run: `pnpm test`; 3 files and 8 tests passed |
| Build | Pass | Phase 0.4 re-run: `pnpm build`; shared packages, API, worker, and Next.js production build passed |
| Runtime smoke | Pass | Web returned HTTP 200; API `/health` returned healthy; worker reported integrations not configured |
| Remote source | Pass | PR `#1` squash-merged as `9f692ff`; protected `main` is the deployment source |
| Vercel production | Pass | Post-merge `papertrader-web` production deployment Ready |
| Vercel preview | Pass | Preview deployment `dpl_CJ52EHx8fvznZGX6tDbreHhfN35F` Ready; access remains protected by Vercel |
| Railway services | Pass | Post-merge API `85180d9b`, worker `818a30ed`, and PostgreSQL deployments report `SUCCESS` in `us-west2` |
| Railway API health | Pass | `https://api-production-e0a6.up.railway.app/health` returned HTTP 200 and healthy JSON |
| Railway private boundary | Pass | PostgreSQL and worker have no public domain; only API public networking was created |
| Phase 0.3 selection review | Pass | Compared current primary documentation and recorded choices, alternatives, boundaries, and implementation constraints; no dependencies installed |
| Phase 0.4 runtime guard | Pass | Paper-only mode, explicit broker opt-in, paper endpoint, and credential presence are validated without returning or logging secret values |
| Operator paper setup | Reported complete | Operator confirmed USD 1,000 paper-account setup and Railway variable entry; secret values were not inspected |
| Source credential scan | Pass | No credential-shaped value found in workspace or source-controlled files |
| Railway API health after merge | Pass | `https://api-production-e0a6.up.railway.app/health` returned healthy JSON; this endpoint does not inspect broker credentials |
| Vercel response after merge | Pass | Production dashboard returned HTTP 200; no secret values were inspected |
| Alpaca paper connection | Not run | Broker connection remains disabled until the read-only adapter is implemented |
| Phase 1.1 auth shell | Pass | Local and hosted boundaries verified: Railway `/v1/session` returns `503 auth_not_configured` without Clerk variables, `/health` remains `200`, and Vercel `/dashboard`/`/sign-in` fail closed with `503`; authenticated behavior requires hosted Clerk variables |
| Phase 1.2 account boundary | Pass | `pnpm typecheck`, lint, tests, and build passed; mocked adapter test verifies normalized decimal strings and no order method; API route remains `503 broker_not_configured` with broker opt-in disabled |
| Phase 1.3 reconciliation bundle | Pass | Expanded adapter tests cover account/position/order/activity normalization; typecheck, lint, build, and 14 tests pass; no hosted migration or broker request performed |
| Phase 1.4 persisted read-model API | Pass | Repository/API compile; full lint, build, typecheck, and 14 tests pass; local API returns 503 `auth_not_configured` before any database access |
| Phase 1.5 dashboard read-only surfaces | Pass | Dashboard server component and unavailable states build successfully; full lint, build, typecheck, and 14 tests pass; no broker/database browser path added |
| Phase 1.6 controlled reconciliation command | Pass | Guarded command builds; full lint, build, typecheck, and 14 tests pass; `RECONCILE_ONCE=false` exits before database/broker access without secret output |
| Phase 2.1 asset discovery | Pass | Full lint, build, typecheck, and 15 tests pass; mocked adapter filters active tradable assets to US equities/crypto; no hosted broker request performed |
| Phase 2.2 historical market data | Pass | Full lint, build, typecheck, and 17 tests pass; mocked adapter normalizes stock bars/snapshots and rejects non-market-data endpoint; no hosted broker request performed |
| Phase 2.3 supervised market stream | Pass | Full lint, build, typecheck, and 20 tests pass; stream supervisor covers authentication/subscription, gap backfill, malformed payloads, and reconnect degradation; stream remains disabled and no hosted broker request performed |
| Phase 2.4 dashboard views | Pass | Full lint, build, typecheck, and 22 tests pass; dashboard build includes overview, positions, orders/activity, freshness states, and explicit unavailable performance/alerts; no broker request performed |
| Phase 2.5 reconciliation verification | Pass | Full lint, build, typecheck, and 24 tests pass; decimal-equivalent account values match and mismatch results expose only field names; endpoint is broker/DB gated and no hosted request performed |
| Phase 3.1 strategy contract | Pass | Full lint, build, typecheck, and 27 tests pass; lifecycle/registry/parameter-boundary tests pass; no strategy enabled, broker request, or order path added |
| Phase 3.2 decimal-safe metrics | Pass | Full lint, build, typecheck, and 31 tests pass; P/L, drawdown, exposure, risk-cap, precision, and invalid-input tests pass; no strategy enabled or broker request performed |
| Phase 3.3 historical replay | Pass | Full lint, build, typecheck, and 33 tests pass; point-in-time context, next-bar entry, fees/slippage, incomplete-signal skip, lifecycle gate, and no-side-effect tests pass |
| Phase 3.4 momentum research plug-ins | Pass | Full lint, build, typecheck, and 37 tests pass; registry/stage, ranking, breakout-volume, trend-alignment, insufficient-history, and parameter-boundary tests pass; all plug-ins remain disabled |
| Phase 3.5 regime replay evidence | Pass | Full lint, build, typecheck, and 40 tests pass; all three plug-ins run across named regimes with explicit research notional, and assessments remain non-promoting with sample/drawdown reasons |
| Phase 3.6 disabled-to-replay lifecycle gate | Pass | Full lint, build, typecheck, and 43 tests pass; approved transition records, immutable prior state, missing approval/check failures, version mismatch, and stage-jump rejection are covered |
| Phase 3.7 lifecycle-event PostgreSQL persistence | Pass | Full lint, build, typecheck, and 45 tests pass; migration/schema constraints and repository revision/stage checks are covered with no hosted migration |
| Phase 3.8 authenticated disabled-to-replay command | Pass | Full lint, build, typecheck, and 48 tests pass; structured validation, operator matching, server-side evidence checks, redacted response contract, and no-stage/order boundaries are covered |
| Phase 3.9 shadow observation records | Pass | Full lint, build, typecheck, and 51 tests pass; shadow-stage gating, decimal outcome closure, duplicate/timing failures, migrations, and one-time repository outcomes are covered |
| Phase 3.10 finalized-bar shadow evaluator | Pass | Full lint, build, typecheck, and 54 tests pass; stop/target precedence, ambiguity invalidation, time-stop/expiry, look-ahead prevention, and first-outcome termination are covered |
| Phase 3.11 restart-safe shadow runner | Pass | Full lint, build, typecheck, and 56 tests pass; stable ordering, already-closed idempotency, unresolved observations, and redacted source/persistence failures are covered |
| Phase 3.12 opt-in shadow worker boundary | Pass | Full lint, build, typecheck, and 59 tests pass; default-off config, interval bounds, source readiness, one-shot opt-in, and health reporting are covered |
| Phase 3.13 wired shadow worker and scheduler | Pass | Full lint, build, typecheck, and 60 tests pass; Alpaca-source mapping, repository wiring, bounded scheduling, and last/next health boundaries are covered |
| Phase 3.14 shadow evidence and replay-to-shadow gate | Pass | Full lint, build, typecheck, and 64 tests pass; closed-observation evidence, decimal assessment, stage/approval checks, and migration/repository transition boundaries are covered |
| Phase 3.15 authenticated replay-to-shadow command | Pass | Full lint, build, typecheck, and 66 tests pass; operator authentication, persisted-outcome loading, server-side assessment, replay-stage prerequisite, revision-two append, and redacted responses are covered |
| Phase 3.16 shadow-to-paper readiness gate | Pass | Full lint, build, typecheck, and 70 tests pass; paper-forward policy checks, exact-version evidence, approval enforcement, lifecycle transition, and migration/repository boundaries are covered |
| Phase 3.17 authenticated shadow-to-paper command | Pass | Full lint, build, typecheck, and 72 tests pass; persisted evidence loading, latest-shadow prerequisite, server-side reassessment, operator approval, revision append, and redacted response boundaries are covered |
| Phase 5.1 immutable paper signals and deterministic risk checks | Pass | Full lint, build, typecheck, and 75 tests pass; immutable signal timestamps, baseline/freshness/kill-switch checks, exposure and count caps, and decimal planned-loss enforcement are covered |
| Phase 5.2 immutable trade intents and execution-time risk approvals | Pass | Full lint, build, typecheck, and 78 tests pass; intent immutability, expiry validation, current-state reassessment, versioned approvals, and one-approval-per-intent behavior are covered |
| Phase 5.3 idempotent paper-order submission boundary | Pass | Full lint, build, typecheck, and 81 tests pass; paper endpoint pinning, approval/opt-in gates, client-ID lookup-before-post, retry normalization, and rejected-order boundaries are covered |
| Phase 5.4 transactional paper-order persistence and reconciliation records | Pass | Full lint, build, typecheck, and 82 tests pass; migration/schema constraints, one-time intent recording, client-ID reuse rejection, broker status/fill reconciliation, and missing-submission failures are covered |
| Phase 6.1 paper execution wiring and Paper Autopilot mode gate | Pass | Full lint, build, typecheck, and 86 tests pass; explicit off-by-default mode, startup prerequisites, pending/reconcile/failure flow, approved-intent enforcement, and no-submit-disabled behavior are covered |
| Phase 6.2 controlled paper recovery and partial-fill reconciliation | Pass | Full lint, build, typecheck, and 88 tests pass; partial-fill preservation, client-ID/quantity validation, unknown/terminal-regression rejection, and worker failure handling are covered |
| Phase 6.3 durable daily scheduling and recovery boundary | Pass | Full build, typecheck, lint, and 90 tests pass; UTC scheduling, bounded retry configuration, dead-letter queue setup, disabled-by-default startup, degraded handler health, and last/next-run state are covered |
| Phase 6.4 controlled durable queue provisioning | Pass | Full build, typecheck, lint, and 92 tests pass; guarded one-shot migration, queue/dead-letter provisioning, stop/start schedule re-registration, and no-scheduler migration boundaries are covered |
| Phase 6.5 hosted durable queue verification tooling | Pass | Full build, typecheck, lint, and 93 tests pass; guarded status command, queue presence/count inspection, missing-queue failure state, and no-broker/no-scheduler boundaries are covered |
| Phase 6.6 idempotent hosted run-once trigger | Pass | Full build, typecheck, lint, and 94 tests pass; deterministic UTC job IDs, duplicate suppression, explicit guard, and enqueue-only boundaries are covered |
| Phase 6.7 Railway queue migration and deployment verification | Partial | Railway worker deployment reached SUCCESS; `DATABASE_URL` reference is present; guarded migration completed; both queues are present with zero counts; broker opt-in and first paper reconciliation remain intentionally unperformed |
| Phase 6.8 guarded application schema migration | Pass | Full build, typecheck, lint, and 94 tests pass; Railway deployment succeeded, migrations 0001–0007 were applied, and required read-model/order tables are present |
| Phase 6.9 controlled paper reconciliation | Pass | Railway one-shot reconciliation completed; 1 account snapshot, 1 position, and 1 order persisted; work/dead-letter queues remain present with zero queued, active, and failed jobs; no persistent broker or autopilot enablement |
| Phase 6.10 operator health surface | Pass | Authenticated `/v1/operations-health` added with deterministic freshness classification and non-secret activation-gate reporting; local checks pass and Railway deployment `ad38f77b-4c12-45c8-83db-e2bbde091399` is `SUCCESS`; protected route returns 401 without a session; no persistent scheduler or autopilot enablement |
| Phase 6.11 scheduler readiness command | Pass | Guarded read-only `durable-readiness` reports disabled/blocked/ready states with safe reason codes; 100 tests, typecheck, lint, and build pass; Railway worker deployment `9bb31a13-e3d4-4a15-a6a0-63997e07b11d` is `SUCCESS` and hosted readiness reports disabled; no broker, scheduler, or order action performed |
| Phase 6.12 one-run scheduler reconciliation boundary | Pass | Guarded `durable-one-run` provisions existing queues and consumes one read-only job only with explicit command-scoped gates; 101 tests, typecheck, lint, and build pass; worker deployment `9faf1392-c6ed-4735-a8ee-5ed59708feb4` is `SUCCESS`; hosted execution awaits explicit temporary broker/handler opt-in |
| Phase 6.13 dashboard operations health surface | Pass | Authenticated dashboard displays strict operations-health state with unavailable/degraded handling; 102 tests, typecheck, lint, and production build pass; Vercel preview reports `Ready` and is deployment-protected; no browser authority or persistent gate change added |
| Phase 6.14 hosted reconciliation runbook | Pass | Added and linked the guarded Railway runbook with command-scoped gates, expected evidence, persistent-variable checks, and failure handling; no hosted state changed |
| Phase 6.15 paper-only CI verification | Pass | GitHub Actions workflow added for locked install, lint, tests, typecheck, and build with read-only repository permissions and no runtime secrets; local equivalent checks pass |
| Phase 6.16 Railway database connectivity | Pass | CLI confirmed non-empty `DATABASE_URL` on API and Worker; Worker private host reachability and PostgreSQL `SELECT 1` passed; deployed Worker `durable-status` also confirmed both queues present with zero queued/active/failed jobs; no secrets printed |
| Phase 6.17 guarded database status command | Pass | Added command-scoped `DATABASE_STATUS=true` probe with generic failure output and pool cleanup; 147 tests, typecheck, lint, and production build pass; Worker deployment `d28e267c-42cd-4cfa-b364-9f30c8468bca` succeeded and hosted probe returned `databaseReachable=true` with persistent activation flags unchanged |
| Phase 6.18 secret-surface CI audit | Pass | Added source/browser credential-value scan and CI step after build; fresh build, audit, 147 tests, typecheck, lint, and diff checks pass; no secret values printed |
| Phase 6.19 explicit paper operating-mode contract | Pass | Added observe/recommend/paper_autopilot resolution, contradiction fail-closed checks, API/dashboard mode visibility, and tests; 149 tests, typecheck, lint, build, audit, and diff checks pass; API deployment `5bae4605-c1e8-4115-bbdc-90982aab61ad` succeeded with hosted mode safely resolving to observe |
| Phase 6.20 dashboard mode visibility | Pass | Dashboard status bar now renders the server-resolved mode or `Mode unavailable`; production build, 149 tests, typecheck, lint, audit, and diff checks pass; Vercel preview `dpl_CQua9HGsqECuzwatPiKrU8CgWsaj` is Ready and protected |
| Phase 6.21 truthful public foundation status | Pass | Public page now reflects deployed paper infrastructure and gated Observe mode without claiming missing services; 149 tests, typecheck, lint, build, audit, and diff checks pass; Vercel preview `dpl_BgZVSWj78ASLQtrBBTedh98DQK5c` is Ready and protected |
| Phase 6.22 worker operating-mode health | Pass | Worker health now reports the resolved mode and startup validates contradictions; 149 tests, typecheck, lint, build, audit, and diff checks pass; deployment `06735237-cbfa-4bc0-8004-cd4e899b53ba` returned healthy `operatingMode=observe` with optional gates disabled |
| Phase 6.23 worker integration configuration health | Pass | Worker health distinguishes configured Alpaca/database prerequisites from `brokerConnectionEnabled=false`; deployment `af3ef28a-174d-4a63-bd5c-b5d5ac046201` returned HTTP 200 with `operatingMode=observe`, configured statuses, and durable/research/shadow gates disabled; no broker or order action occurred |
| Phase 6.24 one-run approval provenance guard | Pass | Guarded durable one-run now requires a bounded non-secret command-scoped approval reference; 151 tests, typecheck, lint, build, audit, and diff checks pass; no hosted command or broker/database side effect occurred |
| Phase 6.25 paper baseline and single-trade risk invariants | Pass | Domain names the USD 1,000 baseline and USD 100 absolute risk ceiling; high-equity regression coverage proves the lower-of-0.25%-or-USD-100 rule including costs; 153 tests and full static verification pass |
| Phase 6.26 operator-visible paper risk policy | Pass | Authenticated operations-health and dashboard now expose the non-secret USD 1,000 baseline, USD 100 ceiling, and 0.25% limit; 153 tests and full static verification pass; API deployment `c4c0901c-f9ea-4638-95af-add7ca2227fd` and protected Vercel preview `dpl_E378eJz2ZU3AauLptSPJeogFqhCW` verified; no execution authority added |
| Phase 6.27 Paper Autopilot readiness report | Pass | Added guarded configuration-only readiness output with bounded reasons, fixed risk-policy checks, and explicit runtime-freshness requirement; 156 tests and full static verification pass; worker deployment `7f225657-eedb-4c42-b803-a7a8b4e6a7fe` verified hosted `status=disabled`; no external client or execution action added |
| Phase 4.1 structured agent runs | Pass | Added immutable run lifecycle/orchestrator and versioned artifact contracts with provenance; 106 tests, typecheck, lint, and production build pass; no external calls or financial authority added |
| Phase 4.2 read-only research agents | Pass | Added deterministic stock/crypto watchlist handlers with bounded, validated artifacts; 109 tests, typecheck, lint, and production build pass; no external calls or financial authority added |
| Phase 4.3 agent-run persistence/read view | Pass | Added migration 0008, Drizzle/repository lifecycle enforcement, and authenticated metadata-only `/v1/agent-runs`; 110 tests, typecheck, lint, and production build pass; hosted migration not yet applied |
| Phase 4.4 macro advisory/economic events | Pass | Added validated event contract and advisory-only deterministic flags; 112 tests and typecheck pass; no external provider, broker, risk, or order authority added |
| Phase 4.5 guarded research run-once | Pass | Added disabled-by-default worker runner/command with bounded JSON input and redacted failure persistence; 114 tests, typecheck, lint, and production build pass; no fixture run performed |
| Phase 4.6 hosted agent-run schema readiness | Pass | Worker deployment `c8db3f78-e562-451d-bbf6-6ad93c092f6f` reached SUCCESS; guarded Railway migration applied through 0008 with no broker/research execution or flag changes |
| Phase 4.7 agent health dashboard | Pass | Added authenticated metadata-only run-health card and strict browser parser; 115 tests, typecheck, lint, and production build pass; no execution or financial authority added |
| Phase 4.8 agent-run detail boundary | Pass | Added authenticated bounded detail endpoint with recursive secret-key redaction and 117 tests, typecheck, lint, and production build pass; no execution or financial authority added |
| Phase 4.9 guarded paper market research source | Pass | Added bounded Alpaca paper-bars adapter and command-scoped run-once boundary; 119 tests, typecheck, lint, and production build pass; hosted execution not performed |
| Phase 4.10 research schedule readiness boundary | Pass | Added disabled-by-default research queue/cron contract, bounded readiness gates, deterministic job identity, and worker health status; 123 tests, typecheck, lint, and production build pass; no hosted schedule or research execution performed |
| Phase 4.11 research-preparation queue boundary | Pass | Added separately named validated research queues, bounded provisioning, idempotent enqueue, and fail-closed handler dispatch; 125 tests, typecheck, lint, and production build pass; no hosted queue or research execution performed |
| Phase 4.12 deterministic research-preparation planner | Pass | Added bounded stock/crypto plan parsing, deterministic run IDs, injected market-input read, deterministic handler dispatch, and persistence handoff; 128 tests, typecheck, lint, and production build pass; no hosted research execution performed |
| Phase 4.13 gated research-preparation queue handler | Pass | Added readiness-gated queue composition for sequential stock/crypto preparation and persistence; 130 tests, typecheck, lint, and production build pass; no hosted research execution performed |
| Phase 4.14 gated research scheduler registration | Pass | Added readiness-before-client-creation, queue/cron registration, bounded failure health, and validated handler dispatch; 132 tests, typecheck, lint, and production build pass; no hosted queue or research execution performed |
| Phase 4.15 research scheduler runtime health | Pass | Extended worker health with safe research scheduler readiness/runtime states and optional run timestamps; 133 tests, typecheck, lint, and production build pass; no scheduler or hosted research execution performed |
| Phase 4.16 guarded worker startup composition | Pass | Added disabled-by-default worker composition for paper market source, PostgreSQL agent persistence, deterministic handler, and gated scheduler; 135 tests, typecheck, lint, and production build pass; no hosted scheduler or research execution performed |
| Phase 4.17 guarded research readiness verification | Pass | Added guarded `research-readiness` command and CI default-disabled check; verified disabled and blocked exit behavior with safe reason codes; 135 tests, typecheck, lint, and production build pass |
| Phase 4.18 hosted research readiness evidence | Pass | Worker deployment `5290f522-99da-4b71-b1bf-2e2b4d9f8c86` reached `SUCCESS`; Railway SSH readiness returned disabled with database/paper credentials configured and all research/durable/autopilot gates off; no broker or research execution performed |
| Phase 4.19 separate research run approval guard | Pass | Added separate command-scoped approval/reference validation and hosted runbook; 137 tests, typecheck, lint, and production build pass; no hosted research execution performed |
| Phase 4.20 hosted research preflight | Pass | Added bounded no-client preflight command and runbook step for approval, paper, database, broker, symbol, timeframe, and limit checks; 139 tests, typecheck, lint, and production build pass; no hosted research execution performed |
| Phase 4.21 research approval provenance | Pass | Added non-secret operator-approval provenance to one-run agent input references with focused tests; 140 tests, typecheck, lint, and production build pass; no hosted research execution performed |
| Phase 4.22 read-only research run verification | Pass | Added guarded persisted-run verifier for status/artifact/approval provenance; 142 tests, typecheck, lint, and production build pass; no hosted research execution performed |
| Phase 4.23 latest-run research verification | Pass | Added bounded latest-100 selection by approval provenance while retaining explicit IDs; 143 tests, typecheck, lint, and production build pass; no hosted research execution performed |
| Phase 4.24 hosted research tooling deployment | Pass | Worker deployment `9467848b-f63a-4598-a783-2bc65c65715c` reached `SUCCESS`; hosted readiness remained disabled and command-scoped preflight passed without client construction; no hosted research execution performed |
| Phase 4.25 deterministic market-bar integrity | Pass | Added fail-closed source validation for symbols, timestamps, ordering, positive OHLCV, and OHLC consistency; 144 tests, typecheck, lint, and production build pass; no hosted research execution performed |
| Phase 4.26 duplicate market-bar rejection | Pass | Distinguished exact duplicate timestamps from out-of-order bars with fail-closed tests; 144 tests, typecheck, lint, and production build pass; no hosted research execution performed |
| Phase 4.27 market-bar integrity deployment | Pass | Worker deployment `440f6de2-6d34-4661-9d90-547f4fd18ce9` reached `SUCCESS`; hosted readiness remained disabled; no hosted research execution performed |
| Browser/preview | Partial | Production page HTTP check passed; visual/responsive review deferred beyond source scaffold |
| Security review | Partial | No credential files, Alpaca client, database connection, or order code added; full review remains required |

## Known Risks

| Severity | Risk | Mitigation |
| --- | --- | --- |
| P0 | Duplicate or unintended live orders | Paper default, environment isolation, idempotency, live gates |
| P0 | Agent bypasses risk controls | No direct order permission; deterministic risk/execution boundaries |
| P0 | Stale or incomplete market/account state drives entry | Freshness checks, stream-gap detection, backfill, fail closed |
| P1 | Paper results overstate live performance | Model fees/slippage/fills; limited live rollout only after validation |
| P1 | Background process stops silently | Durable jobs, worker health, heartbeats, alerts, reconciliation |
| P1 | Broker/internal state diverges | Alpaca treated as truth with scheduled/event-driven reconciliation |
| P1 | Strategy overfits historical data | Holdout periods, multiple regimes, paper-forward validation, versioning |

## Session Handoff

- **What exists:** Verified hosted foundation, Phase 0.3 selections, Phase 0.4 fail-closed guardrails, operator-confirmed paper setup, Phase 1 read-only account/dashboard foundation, guarded reconciliation command, Phase 2.1–2.2 authenticated asset/market-data reads, Phase 2.3 stream/backfill boundary, Phase 2.4 dashboard views, Phase 2.5 protected reconciliation verification, Phase 3.1 disabled strategy contract, Phase 3.2 decimal-safe metrics, Phase 3.3 point-in-time replay, Phase 3.4 disabled momentum plug-ins, Phase 3.5 regime evidence, Phase 3.6 in-process lifecycle gate, Phase 3.7 reviewed lifecycle-event persistence, Phase 3.8 authenticated replay approval command, Phase 3.9 shadow observation persistence, Phase 3.10 finalized-bar evaluation, Phase 3.11 restart-safe shadow runner, Phase 3.12 opt-in worker boundary, Phase 3.13 wired shadow worker/scheduler, Phase 3.14 controlled shadow evidence/replay-to-shadow gate, Phase 3.15 authenticated replay-to-shadow command, Phase 3.16 shadow-to-paper readiness gate, Phase 3.17 authenticated shadow-to-paper command, Phase 5.1 immutable paper signals/deterministic risk checks, Phase 5.2 immutable trade intents/execution-time risk approvals, Phase 5.3 idempotent paper-order submission boundary, Phase 5.4 transactional paper-order persistence/reconciliation records, Phase 6.1 paper execution wiring/Autopilot gate, Phase 6.2 controlled paper recovery/partial-fill reconciliation, and Phase 6.3 durable daily scheduling/recovery boundary. No hosted migration has been applied and no broker request has been run.
- **Where to resume:** Build the deterministic paper risk/execution boundary, then apply the reviewed migrations through Railway's controlled process, run one guarded paper reconciliation, and verify `/v1/read-model`, `/v1/reconciliation-status`, and dashboard data against Alpaca.
- **Important context:** Keep Alpaca paper mode and read-only behavior during Phase 2.
- **Recommended next prompt:** Approve and run Phase 6.12 once in Railway using the Phase 6.14 runbook, then inspect the dashboard; keep continuous scheduler, Paper Autopilot, and live capability disabled.

## Change Log

### 2026-08-21 — Initial specification

- Defined product scope, multi-agent responsibilities, strategy contract, dashboard, architecture, risk defaults, safe build sequence, and paper-to-live gates.
- Implementation has not started.

### 2026-08-21 — Runtime and paper-risk clarification

- Required daily server-side operation independent of the dashboard.
- Clarified that Paper Autopilot requires no human approval per order, while deterministic approval remains mandatory.
- Recorded the USD 1,000 initial paper baseline and USD 100 absolute estimated planned-loss ceiling, with the existing 0.25% equity rule remaining the tighter limit.
- Initially recommended Railway for managed runtime hosting.

### 2026-08-21 — Vercel and Railway consolidation

- Selected a conventional Next.js application hosted on Vercel.
- Consolidated the target backend around Railway services and PostgreSQL.
- Selected Railway PostgreSQL as the system of record, with required constraints, migrations, backups, point-in-time recovery, and logical export drills.
- Assigned the authenticated API, PostgreSQL-backed durable jobs, reconciliation, and supervised Alpaca WebSockets to separate Railway services.

### 2026-08-21 — Phase 0 execution order

- Split setup into source, hosted, technical-selection, security, operational-decision, and verification gates.
- Made the recoverable local Git/workspace scaffold the first action.
- Deferred all credentials and broker connectivity until application boundaries compile locally.
- Added an explicit Phase 0 exit gate before the read-only Phase 1 build.

### 2026-08-21 — Phase 0.1 source foundation complete

- Initialized Git on `main` and added the compiling pnpm workspace.
- Added separate Next.js web, Node API, inactive worker, domain, database, Alpaca, and configuration packages.
- Added a truthful Paper/Read-only/No broker connection foundation page and minimal API/worker health contracts.
- Verified typecheck, lint, 3 unit tests, all production builds, and web/API/worker runtime smoke checks.
- Added no secrets, hosted resources, database connection, Alpaca request, or order capability.

### 2026-08-22 — Phase 0.2 hosted foundation ready for review

- Connected and pushed `altafr/papertrader`, protected `main`, and opened draft PR `#1`.
- Created the Vercel `papertrader-web` project with dependency-aware monorepo builds and verified production and preview deployments.
- Created the Railway `papertrader` project with separate healthy API, worker, and PostgreSQL services.
- Exposed only the API, kept worker/PostgreSQL private, and configured paper-only non-secret environment gates.
- Added Railway config-as-code and a persistent worker health endpoint while leaving database and Alpaca adapters unconfigured.

### 2026-08-22 — Phase 0.2 merged and verified

- Reviewed and squash-merged PR `#1` to protected `main` after local and hosted checks passed.
- Repointed Railway API and worker Git sources to `main` and verified both post-merge deployments.
- Verified the post-merge Vercel production deployment, Railway private networking, and the public API health response.

### 2026-08-22 — Phase 0.3 technical selections complete

- Selected Clerk for single-operator identity with Railway-side token verification, operator allowlisting, and re-authentication requirements.
- Selected Drizzle ORM/Drizzle Kit with `node-postgres` for reviewed PostgreSQL migrations, typed access, constraints, and transactions.
- Selected `pg-boss` for PostgreSQL-backed durable jobs while retaining idempotent handlers and deterministic trading gates.
- Selected Zod for runtime boundary validation and `decimal.js` for explicitly rounded, string-serialized financial arithmetic.
- Recorded tradeoffs and implementation constraints without installing dependencies or adding authentication, schema, queue, Alpaca, credential, or trading behavior.

### 2026-08-22 — Phase 0.4 safety envelope started

- Added `.env.example` with safe paper-only defaults and variable names without credential values.
- Added a server-side configuration guard that defaults to paper mode, rejects live mode, fixes the paper API endpoint, requires explicit broker opt-in, and requires both credentials before opt-in.
- Applied the guard at API and worker startup and added tests covering defaults, live-mode rejection, missing credentials, and secret non-return.
- Added operator instructions for creating/resetting the USD 1,000 paper account and sealing Railway variables; account reset and secret entry remain pending operator action.

### 2026-08-22 — Phase 0.4 operator setup confirmed

- Operator confirmed the Alpaca paper-account setup and Railway variable entry; no credential values were requested or inspected.
- Re-ran source credential scans, Railway API health, and Vercel production HTTP checks successfully.
- Kept broker connection disabled because the read-only Alpaca adapter is not implemented yet; Railway logs and PostgreSQL contents remain outside the independently verifiable surface in this session.

### 2026-08-22 — Phase 1.1 authenticated shell complete

- Added Clerk Next.js middleware, provider, sign-in route, and authenticated dashboard shell.
- Added Railway API `/v1/session` with Clerk backend token verification, authorized-party validation, exact operator allowlisting, and fail-closed responses when Clerk is not provisioned.
- Added Clerk variable names and deployment-boundary instructions without recording values.
- Verified 11 tests, lint, typecheck, and production builds; no Alpaca request, database schema, order behavior, or broker authority was added.
- Verified the merged Railway deployment exposes the new `/v1/session` fail-closed response and that Vercel protected routes return `503 auth_not_configured` until Clerk variables are configured.

### 2026-08-22 — Phase 2.1 asset discovery complete

- Added a validated server-only Alpaca paper asset reader for active, tradable US equities and crypto.
- Added authenticated API route `GET /v1/assets`, with explicit broker opt-in and paper-only guards.
- Verified full lint, build, typecheck, and 15 tests; no hosted migration, broker request, strategy, risk, or order behavior was added.

### 2026-08-22 — Phase 2.2 protected historical market data complete

- Added a validated, server-only Alpaca market-data adapter for bounded historical stock/crypto bars and snapshots.
- Added authenticated `GET /v1/market-data/bars` and `GET /v1/market-data/snapshots` routes with paper-only and explicit broker opt-in guards.
- Verified full lint, build, typecheck, and 17 tests; no hosted broker request, raw market-data persistence, WebSocket, strategy, risk, or order behavior was added.

### 2026-08-22 — Phase 2.3 supervised market stream boundary complete

- Added validated Alpaca bar-stream message handling, subscription/authentication state, timestamp-gap detection, reconnect degradation, and REST backfill requests.
- Added an opt-in Railway worker WebSocket runner with bounded symbol/timeframe configuration and paper-only guards; stream execution remains disabled by default.
- Verified full lint, build, typecheck, and 20 tests; no hosted stream was enabled and no broker request was performed.

### 2026-08-22 — Phase 2.4 read-only dashboard views complete

- Expanded the authenticated dashboard with account overview, positions, orders/fills, activity, performance, and alerts sections.
- Added explicit fresh/delayed/stale classification, UTC provenance, responsive position tables, and unavailable/degraded states without fabricated financial values.
- Verified full lint, build, typecheck, and 22 tests; no hosted migration, broker request, control action, or order capability was added.

### 2026-08-22 — Phase 2.5 protected reconciliation verification complete

- Added authenticated `GET /v1/reconciliation-status` for an explicit persisted-account versus fresh paper-broker comparison.
- Added decimal-aware comparison tests that return only status and mismatched field names, never account payload values or secrets.
- Verified full lint, build, typecheck, and 24 tests; no hosted migration or broker request was performed.

### 2026-08-22 — Phase 3.1 versioned strategy contract complete

- Added the disabled-by-default, semantic-versioned strategy plug-in contract with bounded parameter validation, fresh market-input requirements, and structured proposal output.
- Added sequential lifecycle transition guards and duplicate/invalid registration checks.
- Verified full lint, build, typecheck, and 27 tests; no concrete strategy was enabled and no broker request or order behavior was added.

### 2026-08-22 — Phase 3.2 decimal-safe metrics complete

- Added `decimal.js` to the domain package and implemented pure P/L, return, drawdown, exposure, and planned-risk functions.
- Enforced the lower of `0.25%` current equity and `USD 100` planned-stop risk limit, including fees and slippage, with fixed decimal-string output.
- Verified full lint, build, typecheck, and 31 tests; no strategy was enabled and no broker request or order behavior was added.

### 2026-08-22 — Phase 3.3 historical replay complete

- Added deterministic point-in-time replay with next-bar-open entries, explicit exits, per-trade fees, and two-sided slippage.
- Added tests for look-ahead prevention, incomplete-signal skipping, replay-stage gating, and side-effect-free output.
- Verified full lint, build, typecheck, and 33 tests; no strategy was enabled and no broker request or order behavior was added.

### 2026-08-22 — Phase 3.4 initial momentum research plug-ins complete

- Added disabled `cross-sectional-momentum`, `volume-confirmed-breakout`, and `intraday-trend-continuation` plug-ins under `packages/domain`.
- Added bounded parameter validation, deterministic point-in-time evaluation, explicit proposal stop/target/time-stop fields, and failure-regime tests.
- Verified full lint, build, typecheck, and 37 tests; no strategy stage promotion, broker request, persistence, credential access, or order behavior was added.

### 2026-08-22 — Phase 3.5 regime-based replay evidence complete

- Added research-only default notional support to replay so strategies without sizing authority can still be evaluated reproducibly.
- Added named bull/bear/choppy regime orchestration and non-promoting sample, coverage, and drawdown assessments for all three disabled momentum candidates.
- Verified full lint, build, typecheck, and 40 tests; no strategy promotion, broker request, persistence, credential access, or order behavior was added.

### 2026-08-22 — Phase 3.6 disabled-to-replay lifecycle gate complete

- Added an append-only, revisioned in-process lifecycle record with actor, reason, approval, evidence reference, and exact strategy version.
- Enforced the disabled → replay gate with matching three-regime evidence and passing automated checks; stage jumps and future lifecycle stages remain blocked.
- Verified full lint, build, typecheck, and 43 tests; no hosted persistence, broker request, credential access, or paper order behavior was added.

### 2026-08-22 — Phase 3.7 lifecycle-event PostgreSQL persistence complete

- Added the reviewed `0002_strategy_lifecycle_events.sql` migration, Drizzle schema, and transactional repository checks for append-only disabled-to-replay events.
- Verified full lint, build, typecheck, and 45 tests; no hosted migration, authenticated command, broker request, credential access, or paper order behavior was added.

### 2026-08-22 — Phase 3.8 authenticated disabled-to-replay approval command complete

- Added protected `POST /v1/strategies/lifecycle/replay` with Zod validation, server-side evidence assessment, authenticated operator matching, and persistence through the lifecycle repository.
- Verified full lint, build, typecheck, and 48 tests; no hosted migration, broker request, credential access, paper order, or later-stage transition was added.

### 2026-08-22 — Phase 3.9 shadow observation records complete

- Added shadow-only proposal/outcome contracts, immutable in-process storage, migration `0003_shadow_observations.sql`, Drizzle schema, and one-time outcome repository.
- Verified full lint, build, typecheck, and 51 tests; no hosted migration, shadow evaluator, broker request, credential access, paper order, or lifecycle promotion was added.

### 2026-08-22 — Phase 3.10 finalized-bar shadow evaluator complete

- Added deterministic finalized-bar evaluation with explicit ambiguity invalidation, stop/target/time-stop/expiry precedence, look-ahead prevention, and first-outcome termination.
- Verified full lint, build, typecheck, and 54 tests; no hosted migration, durable runner, broker request, credential access, paper order, or lifecycle promotion was added.

### 2026-08-22 — Phase 3.11 restart-safe shadow evaluation runner complete

- Added stable-order, retry-safe shadow evaluation orchestration with idempotent closed checks and redacted failure codes.
- Verified full lint, build, typecheck, and 56 tests; no hosted migration, worker schedule, broker request, credential access, paper order, or lifecycle promotion was added.

### 2026-08-22 — Phase 3.12 opt-in shadow worker boundary complete

- Added default-off shadow worker configuration, interval/source validation, worker health readiness, and the explicit `shadow-evaluate` command boundary.
- Verified full lint, build, typecheck, and 59 tests; no finalized-bar adapter, hosted migration, broker request, credential access, paper order, or lifecycle promotion was added.

### 2026-08-22 — Phase 3.13 wired shadow worker and scheduler complete

- Wired read-only Alpaca historical bars, PostgreSQL open observations/outcomes, deterministic evaluation, and bounded recurring scheduling with last/next run health.
- Verified full lint, build, typecheck, and 60 tests; no hosted migration, broker request, credential access, paper order, or lifecycle promotion was added.

### 2026-08-22 — Phase 3.14 shadow evidence and replay-to-shadow gate complete

- Added controlled closed-observation evidence construction, decimal-safe shadow assessment, migration `0004_allow_replay_shadow_lifecycle.sql`, and repository enforcement for replay-to-shadow revisions.
- Extended the in-process lifecycle gate to require matching shadow evidence, passing automated checks, and explicit operator approval while keeping the transition non-promoting and paper-only.
- Verified full lint, build, typecheck, and 64 tests; no hosted migration, broker request, credential access, paper order, or live-stage transition was added.

### 2026-08-22 — Phase 3.15 authenticated replay-to-shadow command complete

- Added the authenticated `POST /v1/strategies/lifecycle/shadow` command, which loads persisted closed outcomes, recomputes the server-controlled assessment, verifies the latest replay stage, and appends the next lifecycle revision.
- Verified full lint, build, typecheck, and 66 tests; no hosted migration, broker request, credential access, paper order, or shadow-to-paper transition was added.

### 2026-08-22 — Phase 3.16 shadow-to-paper readiness gate complete

- Added paper-forward evidence assessment with default 30-day/20-trade policy and deterministic drawdown, risk-violation, stale-data, and duplicate-order checks.
- Extended lifecycle and PostgreSQL constraints for reviewed shadow → paper transitions with migration `0005_allow_shadow_paper_lifecycle.sql`.
- Verified typecheck and 70 tests during implementation; full lint/build verification remains part of the final phase handoff. No hosted migration, broker request, credential access, or paper order behavior was added.

### 2026-08-22 — Phase 3.17 authenticated shadow-to-paper command complete

- Added persisted paper-forward evidence storage, migration `0006_strategy_paper_evidence.sql`, and the authenticated `POST /v1/strategies/lifecycle/paper` command.
- The command verifies the latest shadow stage, loads exact-version evidence, recomputes readiness, requires operator approval, and appends the next lifecycle revision without submitting orders.
- Verified full lint, build, typecheck, and 72 tests; no hosted migration, broker request, credential access, or paper order behavior was added.

### 2026-08-22 — Phase 5.1 immutable paper signals and deterministic risk checks complete

- Added immutable paper signal snapshots and decimal-safe risk checks for baseline verification, freshness, kill switch, entry/open-position counts, asset-class caps, gross exposure, and planned-stop loss limits.
- Verified full lint, build, typecheck, and 75 tests; no broker request, credential access, paper order, or live capability was added.

### 2026-08-22 — Phase 5.2 immutable trade intents and execution-time approvals complete

- Added immutable paper trade intents with validated expiry/costs and execution-time deterministic risk reassessment.
- Added versioned approval records and one-approval-per-intent storage; expired, stale, risky, or kill-switched intents remain rejected.
- Verified full lint, build, typecheck, and 78 tests; no broker request, credential access, paper order, or live capability was added.

### 2026-08-22 — Phase 5.3 idempotent paper-order submission boundary complete

- Added a server-only Alpaca paper-order adapter with client-order-ID lookup-before-post, approved-intent and broker-opt-in gates, paper endpoint pinning, and normalized responses.
- Verified full lint, build, typecheck, and 81 tests; the adapter remains unwired until order persistence and reconciliation are complete.

### 2026-08-22 — Phase 5.4 transactional paper-order persistence and reconciliation records complete

- Added migration `0007_paper_order_submissions.sql`, schema constraints, and transactional repository operations for one-time intent recording and broker status/fill updates.
- Verified full lint, build, typecheck, and 82 tests; no hosted migration, broker request, credential access, or Paper Autopilot mode was enabled.

### 2026-08-22 — Phase 6.1 paper execution wiring and Paper Autopilot mode gate complete

- Added the off-by-default `PAPER_AUTOPILOT_ENABLED` gate and worker prerequisites, then wired approved submission → pending persistence → paper broker call → reconciliation/failure handling.
- Verified full lint, build, typecheck, and 86 tests; no live endpoint, hosted migration, credential logging, or default Paper Autopilot enablement was added.

### 2026-08-22 — Phase 6.2 controlled paper recovery and partial-fill reconciliation complete

- Added broker-status recovery validation for partial fills, terminal states, client-order identity, approved quantity, and status regressions; integrated it before persistence updates.
- Verified full lint, build, typecheck, and 88 tests; no hosted migration, broker request, live endpoint, or automatic retry loop was enabled.

### 2026-08-23 — Phase 6.3 durable daily scheduling and recovery boundary complete

- Added the PostgreSQL-backed `pg-boss` daily queue with UTC scheduling, bounded exponential retries, retention, dead-letter routing, and worker health state.
- Wired the durable job to the existing read-only paper-account reconciliation flow; no order, live endpoint, or browser dependency was added.
- Verified full build, typecheck, lint, and 90 tests; the queue remains disabled by default pending Railway migration/configuration review and controlled paper verification.

### 2026-08-23 — Phase 6.4 controlled durable queue provisioning complete

- Added the guarded `durable-migrate` worker command, idempotent work/dead-letter queue provisioning, and restart-safe schedule registration tests.
- Verified full build, typecheck, lint, and 92 tests; no hosted queue migration, broker request, order submission, or live capability was enabled.

### 2026-08-23 — Phase 6.5 hosted durable queue verification tooling complete

- Added the guarded `durable-status` command and queue inspection contract for work/dead-letter presence and bounded backlog/failure counts.
- Verified full build, typecheck, lint, and 93 tests; no hosted queue command, broker request, order submission, or live capability was enabled.

### 2026-08-23 — Phase 6.6 idempotent hosted run-once trigger complete

- Added the guarded `durable-run-once` command with deterministic UTC job IDs and duplicate suppression for immediate reconciliation verification.
- Verified full build, typecheck, lint, and 94 tests; no hosted command, broker request, order submission, or live capability was enabled.
