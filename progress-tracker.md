# Progress Tracker

## Snapshot

- **Phase:** Phase 1 — trusted read-only foundation.
- **Status:** Phase 1.6 controlled reconciliation command implemented; Railway migration and first operator-run reconciliation remain next.
- **Current operating mode:** Paper only; order submission not yet enabled.
- **Current goal:** Apply the reviewed migration and run the guarded one-shot paper reconciliation in Railway.
- **Last updated:** 2026-08-22.

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

- [ ] Add stock/crypto asset discovery and eligibility filters.
- [ ] Add historical bars/snapshots through protected server calls.
- [ ] Add supervised market/trading WebSocket worker with backfill.
- [ ] Build Overview, Positions, Orders & fills, Performance, and Alerts views.
- [ ] Reconcile dashboard/account data against Alpaca.

### Phase 3 — Strategy and Replay Foundation

- [ ] Implement versioned strategy plug-in interface.
- [ ] Implement decimal-safe performance and risk metrics.
- [ ] Build historical replay with point-in-time inputs, fees, and slippage.
- [ ] Implement three initial momentum research strategies.
- [ ] Add strategy lifecycle: disabled → replay → shadow → paper → eligible live.

### Phase 4 — Research Agents and Daily Preparation

- [ ] Implement orchestrator and structured agent-run records.
- [ ] Add stock and crypto research agents with read-only tools.
- [ ] Add macro advisory and economic-event context.
- [ ] Produce persisted daily stock and continuous crypto plans.
- [ ] Add agent health, evidence, and audit views.

### Phase 5 — Risk and Paper Execution

- [ ] Implement immutable signals and trade intents.
- [ ] Implement versioned deterministic risk engine and paper defaults.
- [ ] Add idempotent paper execution service.
- [ ] Add order/trade stream handling and full reconciliation.
- [ ] Test rejected orders, partial fills, timeouts, duplicates, and restarts.

### Phase 6 — Durable Autopilot

- [ ] Add durable schedules, retries, dead-letter handling, and recovery.
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

- **What exists:** Verified hosted foundation, Phase 0.3 selections, Phase 0.4 fail-closed guardrails, operator-confirmed paper setup, Phase 1.1 auth shell, Phase 1.3 reconciliation bundle, Phase 1.4 persisted read-model API, Phase 1.5 dashboard surfaces, and Phase 1.6 guarded reconciliation command. No hosted migration has been applied and no broker request has been run.
- **Where to resume:** Apply the reviewed migration through Railway's controlled process, run one guarded paper reconciliation, verify `/v1/read-model` and dashboard data, then add reconciliation health and scheduled refresh.
- **Important context:** Keep Alpaca paper mode and read-only behavior during Phase 1.
- **Recommended next prompt:** Continue Phase 1 with the PostgreSQL schema and read-only account adapter.

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
