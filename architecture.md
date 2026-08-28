# Architecture Context

## Status

- **Stage:** Phase 6.432 Hosted recovery/PITR readiness verification; continuous Paper Autopilot and multi-day evidence collection continue.

### Always-on multi-agent runtime requirement

The target architecture is a continuously running server-side system. Railway's persistent Worker owns the durable orchestration loop while specialist research, macro, strategy, risk-explanation, execution, reconciliation, position-management, and monitoring agents communicate through persisted, versioned artifacts. The dashboard is an observer/control surface and must not be required for operation. Portfolio-profit optimization is measured as risk-adjusted performance improvement inside the deterministic paper-risk policy; it never overrides freshness checks, exposure limits, exit plans, kill switches, or paper/live mode gates.

The research cadence is asset-aware: crypto preparation may run every 15 minutes for 24/7 markets, while stock preparation is admitted only during 09:30–11:30 ET and 14:00–16:00 ET on regular weekdays. A scheduler tick outside those stock windows skips stock work but never skips crypto monitoring or deterministic safety checks.

### Scheduled candidate-to-risk boundary (Phase 6.210)

The research preparation worker now passes validated watchlist candidates to a paper-risk cycle whenever Paper Autopilot is the resolved operating mode. The cycle uses the latest persisted account read model, applies freshness, baseline, exposure, loss, and kill-switch checks, and persists each decision with point-in-time market evidence. This phase intentionally stops before broker submission; the order executor remains a separately gated boundary so a recommendation cannot place an order by itself.

### Telegram event contract

The Worker emits redacted operational events for approved recommendation outputs, entry submission/reconciliation, managed-position detection, deterministic exit decisions, failed-closed runs, and end-of-session portfolio summaries. Important lifecycle and failure events are immediate. Routine research selections and portfolio summaries use durable once-per-UTC-day dedupe keys, so retries and restarts cannot create notification floods; rejected candidates and zero-result research remain persisted for audit/dashboard use without individual Telegram alerts. Formatting and delivery are centralized in the notification package; provider failures are swallowed after recording degraded delivery state so alerting cannot affect broker calls, risk outcomes, or scheduler control flow.

The continuous crypto scheduler also checks the New York 16:00 weekday close hour (with daylight-saving-aware timezone conversion) and emits the summary from the freshly reconciled account model. When continuous research is enabled, this close-hour path is authoritative and the durable UTC daily summary is suppressed; deployments without continuous research retain the daily fallback. The paths use separate durable dedupe scopes, preventing an earlier fallback delivery from suppressing the close-hour delivery while still limiting each path to one notification per day.

### Authoritative unmanaged-position read model (Phase 6.404)

The authenticated API derives `unmanagedPositions` from the latest persisted account snapshot and paper-order exit-plan metadata (`entry_price`, `planned_stop_price`, `strategy_key`, and `strategy_version`). This calculation is independent of paginated audit history, so a position cannot appear managed merely because its plan fell outside the current history window. The dashboard uses this bounded asset-class/symbol list to label positions `Review required`; the Worker independently enforces the same fail-closed boundary and does not submit automatic exits for positions without a stored plan.

### Separately gated order handoff (Phase 6.213)

The scheduled risk cycle accepts an optional executor only when `PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED=true` is explicitly configured server-side. That executor reuses `executePaperAutopilotOrder`, including deterministic approval, idempotent client order IDs, persistence, broker reconciliation, and lifecycle alerts. When the flag is absent or `false`, approved candidates remain persisted dry-run decisions and no broker write is reachable from the scheduled path. Worker health reports this gate as a redacted boolean so risk-cycle readiness cannot be confused with order-submission authority.

The guarded one-shot paper-order and end-to-end order commands enforce the same submission flag, preventing command paths from bypassing the scheduled execution gate.

When submission is enabled, `PAPER_AUTOPILOT_ORDER_SUBMISSION_APPROVAL_REFERENCE` must also be present and bounded. Readiness reports a blocked execution state when the reference is missing; the reference is provenance only and never contains credentials.

The authenticated API and dashboard expose only the presence of that reference, allowing operators to diagnose a blocked gate without revealing its value.

The protected read-model response carries the bounded `unmanagedPositions` projection both inside the dashboard `model` object and at the response top level used by CSV/export logic; both locations are derived from the same latest-snapshot query.

It also carries a bounded `activeExitPositions` projection derived from all non-terminal deterministic exit submissions, rather than paginated audit history. This keeps the operator's exit-state label truthful after long-running operation and audit filtering.

Worker health applies the same liveness principle to position management: if no successful pass is recorded for more than two configured intervals, the redacted health state becomes `degraded`, prompting safe operational review without changing broker or risk behavior.

Telegram portfolio summaries use the same decimal-safe financial helpers as risk/performance calculations; invalid persisted values fail closed to `not reported` rather than being coerced through binary floating-point arithmetic.

The once-daily market-close summary also includes a bounded (maximum ten) `symbol P/L` digest from the reconciled position model, so the operator can identify position-level contribution without receiving per-tick notification noise.

Position management also maintains an active-exit set from a full-ledger persisted submission query (not the bounded recent-history view). If a deterministic stop, target, or time-stop exit is already in a non-terminal broker state, subsequent 60-second passes continue to evaluate and observe the position but do not invoke a second broker submission path. Terminal states remain eligible for a later, newly evaluated lifecycle only when the reconciled position still exists.

Before each scheduled risk cycle, the Worker refreshes the persisted account read model from Alpaca paper state. This keeps the candidate decision and any optionally enabled submission behind a current account/positions/orders reconciliation rather than relying on an older daily snapshot.

### Duplicate-safe paper retries (Phase 6.383)

The paper execution boundary performs a durable lookup by `clientOrderId` before calling Alpaca. A record that already has a broker order ID is treated as the existing submission and returned without another broker call. A record that exists without broker confirmation is treated as ambiguous in-flight state and fails closed, requiring reconciliation before any retry. This closes the restart/retry path against duplicate paper orders while preserving the immutable submission ledger.

### Guarded paper end-to-end evidence run (2026-08-26)

- Added `paper-e2e-run-once`, which composes one paper-account reconciliation and one bounded market-research agent run so the operator can verify the complete read → persist → dashboard path quickly.
- It requires a command-scoped, non-secret reference and explicit paper broker/database gates, refuses to run with Paper Autopilot enabled, persists reconciliation provenance and research evidence, and has no order-submission or scheduler mutation authority.
- Worker deployment `caf894b9-fa02-4d46-908e-3544e8c68ef9` ran `paper-e2e-20260826-001` successfully. Read-only verification confirmed fresh reconciliation, persisted run provenance, drained queues, and a succeeded stock research artifact. This is end-to-end evidence, not an order or return claim.

### Candidate-to-risk dry run (2026-08-26)

- The guarded paper evidence command now feeds the top research candidate into `createImmutablePaperSignal`, `createImmutablePaperTradeIntent`, and `approvePaperTradeIntent`. Its result is persisted as a clearly labelled dry-run decision with deterministic loss, policy, reasons, and point-in-time market snapshot fields; no broker order API is reachable from this path.

### One-shot paper order path (2026-08-26)

- Added a separately gated, command-scoped order path for the first end-to-end paper validation. It can submit only after the same deterministic risk approval used by Autopilot, defaults to one share, uses Alpaca client-order idempotency, and reconciles broker state immediately; persistent Autopilot/scheduler flags remain unchanged.

### Post-trade paper baseline confirmation (2026-08-27)

- Added an append-only `paper_baseline_confirmations` record and guarded Worker command for an authenticated operator to confirm that an existing Alpaca paper account began at the USD 100,000 policy baseline after prior paper activity.
- Baseline verification now accepts either a broker snapshot at the configured starting baseline or a confirmation tied to the reconciled broker account and snapshot. Current equity may therefore reflect prior paper P/L without weakening the 5% per-trade loss, freshness, exposure, kill-switch, or reconciliation gates.
- The confirmation command is paper-only, requires a bounded non-secret reference and note, and never writes a synthetic account snapshot or changes broker state.

### Credential-free hosted auth-boundary verification (2026-08-26)

- Added a credential-free verifier for the protected JSON and CSV operator-overview endpoints and included it in CI.
- The live Railway check confirmed both endpoints return `401` without credentials. The verifier never sends or prints a token; authenticated contract verification remains a separate protected check.

### CI monitoring link and status badge (2026-08-26)

- The repository README now links directly to the paper-only GitHub Actions workflow and displays its main-branch status badge.
- This is monitoring/documentation only; it does not grant deployment, broker, scheduler, or order authority.

### Manual paper-only verification trigger (2026-08-26)

- The paper-only CI workflow can now be started manually with `workflow_dispatch`, using the same mandatory local quality gates and credential-optional hosted contract verifier.
- Manual triggering adds no runtime trading authority and does not change deployment, scheduler, risk, or authentication behavior.

### Preserved performance-range audit context (2026-08-26)

- Performance-window links now retain the active audit date bounds and reset only the audit page number, keeping the operator’s selected context consistent across the dashboard.
- The change is URL navigation state only and does not alter persisted performance calculations or trading behavior.
- Vercel preview `https://papertrader-4r854j862-altafrs-projects.vercel.app` is ready; protected authenticated navigation still requires the operator session.

### Credential-optional hosted contract CI (2026-08-26)

- GitHub Actions now runs the authenticated operator-overview verifier only when the protected `OPERATOR_AUTH_TOKEN` secret is present; otherwise it logs an explicit skip while retaining all local contract, quality, and secret-surface checks.
- The token and optional API base URL are injected only as workflow environment values and are never committed, printed, or sent to browser code.

### Audit page-count visibility (2026-08-26)

- The dashboard derives the total number of audit pages from the largest filtered category and the server-reported page size, then renders `Page X of Y`.
- The calculation is descriptive navigation metadata only; server-side bounds and authenticated reads remain authoritative.
- Vercel preview `https://papertrader-qm4n6lkn5-altafrs-projects.vercel.app` is ready; protected authenticated page-count rendering still requires the operator session.

### Latest persisted audit-event provenance (2026-08-26)

- The operator overview history metadata now includes the newest captured timestamp from the current bounded page, and the dashboard labels it as persisted-event provenance in UTC.
- An empty page remains explicitly unavailable rather than being assigned a browser-generated timestamp.
- API deployment `9ae089a8-804b-4617-8c85-145550424820` is healthy and Vercel preview `https://papertrader-b91d9tutm-altafrs-projects.vercel.app` is ready; authenticated rendering still requires the operator session.

### Truthful unavailable-audit state (2026-08-26)

- When the protected operator overview cannot be read, the dashboard displays a degraded notice rather than implying that empty tables mean no history exists.
- Reconciled account data remains separately read-only; the notice does not fabricate audit records or change any operational authority.
- Vercel preview `https://papertrader-2qvbswrzu-altafrs-projects.vercel.app` is ready; protected authenticated rendering still requires the operator session.

### Clearable audit filters and disabled navigation (2026-08-26)

- The dashboard offers a read-only Clear action for audit date bounds and preserves the selected performance range when clearing.
- Previous/Next controls are rendered as non-interactive text when the current page has no corresponding page, preventing misleading navigation affordances.
- Vercel preview `https://papertrader-i7mw93n6r-altafrs-projects.vercel.app` is ready; protected authenticated navigation still requires the operator session.

### Explicit active audit-window label (2026-08-26)

- The dashboard now labels the currently displayed audit records with their inclusive UTC date window, including explicit Beginning/Now defaults.
- The label is derived from URL filter state and is informational only; it does not alter persisted records or authorize actions.
- Vercel preview `https://papertrader-4oz2gi7r1-altafrs-projects.vercel.app` is ready; protected authenticated rendering still requires the operator session.

### Preserved dashboard performance-window state (2026-08-26)

- Audit pagination, date presets, and manual date filters now retain the selected performance range in the dashboard URL, preventing navigation from resetting the equity/performance view.
- This is client navigation state only and does not alter the server-side paper-performance contract or any trading behavior.
- Vercel preview `https://papertrader-7i1tyeyw7-altafrs-projects.vercel.app` is ready; protected authenticated navigation still requires the operator session.

### Explicit audit-query validation errors (2026-08-26)

- The JSON and CSV operator-overview routes now distinguish malformed history parameters with a `400 invalid_operator_history_query` response.
- Authentication remains fail-closed at `401`; unexpected database or runtime failures remain `503`. Error classification does not reveal query values or internal SQL details.
- API deployment `587f5d15-2300-4be5-9155-64699302a39f` is healthy. Unauthenticated requests—including malformed queries—remain `401` because authentication precedes query validation; authenticated invalid queries receive the explicit `400` contract.

### Complete audit coverage summary (2026-08-26)

- The dashboard history toolbar now displays all authenticated filtered totals—agent runs, filtered/shadow trades, execution decisions, lifecycle events, and scheduler runs—beside pagination and date controls.
- This is an orientation summary only; it does not imply that shadow records are profitable evidence and cannot alter trading, risk, or scheduler state.
- Vercel preview `https://papertrader-3hjfgqi2x-altafrs-projects.vercel.app` is ready; authenticated rendering still requires the protected operator session.

### Testable authenticated deployment verifier (2026-08-26)

- The operator-overview verifier now exposes a testable function that checks both authenticated JSON and CSV contracts, while the command-line wrapper remains environment-only.
- Mocked tests cover the successful authenticated path and a rejected `401` response. No real token is placed in tests, source control, logs, or browser code.

### Authenticated operator-overview deployment verifier (2026-08-26)

- Added a local/CI verifier that sends an operator-supplied bearer token to the hosted overview and CSV endpoints, then checks arrays, pagination/totals metadata, and strategy catalog export columns.
- The verifier never prints or persists the token and fails closed when `OPERATOR_AUTH_TOKEN` is absent. It is diagnostic only and grants no trading authority or bypass of authentication/risk gates.

### Inclusive calendar-day audit filters (2026-08-26)

- Date-only dashboard inputs are normalized server-side to UTC calendar boundaries: `from` begins at midnight and `to` ends at the final millisecond of the selected day.
- Explicit timestamps remain unchanged. This prevents a date preset from silently excluding records later on its selected end date while preserving the authenticated, parameterized, read-only audit contract.
- API deployment `de82b44b-103d-4663-8b2f-544598849b56` and Vercel preview `https://papertrader-nu9t11oau-altafrs-projects.vercel.app` are ready. Unauthenticated date-filtered requests remain `401`; authenticated hosted boundary inspection still requires the operator session.

### Audit history totals and date presets (2026-08-26)

- The operator overview now returns filtered counts for each persisted audit category in addition to the current bounded page. Counts use the same parameterized date predicates as the page queries.
- The dashboard provides All, Today, 7-day, and 30-day links plus manual date inputs. These are navigation-only conveniences; they do not modify records, strategy state, risk policy, or order behavior.
- API deployment `17a2293d-7cdd-4123-9412-60d89e17281e` and Vercel preview `https://papertrader-jgx315go9-altafrs-projects.vercel.app` are ready. Hosted unauthenticated filtered requests remain `401`; authenticated totals and preset rendering still require the operator session.

### Paginated and date-filtered audit history (2026-08-26)

- The authenticated operator overview and CSV export accept validated `page`, `limit`, `from`, and `to` parameters. PostgreSQL queries use parameterized timestamps and a maximum page size of 100.
- The dashboard exposes read-only page navigation and date filters and preserves the active query in the audit export link. Pagination expands historical coverage without pretending that a bounded response is the complete database history.
- The contract returns `hasNext` metadata and does not change strategy configuration, paper mode, deterministic risk gates, kill-switch behavior, or order authority.
- API deployment `e14114cb-b54e-4ad3-9416-b05a5550c2f3` and Vercel preview `https://papertrader-ree59e7ew-altafrs-projects.vercel.app` are ready. Health is healthy and unauthenticated query-string requests remain `401`; authenticated hosted content still requires the operator session.

### Strategy catalog metadata included in audit export (2026-08-26)

- The authenticated operator CSV now includes a `strategy_catalog` record for each registered strategy, carrying the same safe metadata rendered by the dashboard: key, version, asset class, owner, description, stage, required lookback, and default parameters.
- Catalog rows are read-only evidence and do not alter strategy configuration, approvals, risk policy, or order behavior. CSV cells remain quoted and formula-safe.
- API deployment `df02e5b1-6940-4b39-bc42-234a02bb0c6e` is healthy; unauthenticated export access returns `401`. Authenticated hosted CSV inspection remains pending behind deployment protection.

### Versioned strategy catalog metadata rendered (2026-08-26)

- The authenticated operator overview now includes safe metadata from the registered momentum strategy plugins: key, semantic version, asset class, owner, description, stage, required lookback, and default parameters.
- The dashboard renders this catalog read-only beside lifecycle and outcome evidence; it does not alter strategy configuration or bypass approvals.

### Authenticated reconciled account CSV export (2026-08-26)

- Added protected `/v1/read-model.csv` and dashboard `/dashboard/account-export` routes covering the reconciled account snapshot, all positions, orders/fills, and activities with IDs, quantities, P/L, prices, and timestamps.
- The export is server-side authenticated and formula-safe; no broker credentials or raw API tokens reach the browser.

### Performance snapshot history table (2026-08-26)

- The selected paper-performance window now includes a collapsible table of every returned equity snapshot with capture time, equity, return, and drawdown.
- The table is read-only and derives from the same reconciled snapshot series as the performance curve and metrics.

### Full order/fill reconciliation table rendered (2026-08-26)

- The dashboard renders every persisted order with symbol, side/type, status, requested and filled quantities, client order ID, broker order ID, submitted timestamp, and updated timestamp.
- The table remains read-only and is sourced from the reconciled server read model.

### Position notional and return metrics (2026-08-26)

- Position rows now show invested notional (`quantity × average entry price`) and derived return percentage (`unrealized P/L ÷ invested notional`) from persisted reconciliation fields.
- Missing or zero-denominator values remain explicitly unavailable; no broker call or client-side price inference was added.

### Authenticated agent detail view (2026-08-26)

- Each agent row links to a protected detail page backed by `/v1/agent-runs/:runId`, showing stored rationale, evidence references, confidence/schema metadata, and the API-redacted artifact payload.
- The detail page is a read-only audit surface; secret-key fields are redacted server-side and hidden chain-of-thought is neither collected nor exposed.

### Audit CSV expanded to unified event coverage (2026-08-26)

- The authenticated operator CSV now includes strategy lifecycle events and unified timeline records alongside agent runs, filtered decisions, and execution decisions.
- The export remains protected and formula-safe; unauthenticated requests fail closed.

### Unified immutable audit timeline (2026-08-26)

- `/v1/operator-overview` now returns a bounded chronological timeline combining persisted agent runs, strategy lifecycle events, durable scheduler runs, and paper execution decisions.
- The dashboard renders the timeline as orientation only and retains the source-specific audit tables; it does not synthesize mutable state or authorize actions.

### Complete point-in-time indicator snapshots rendered (2026-08-26)

- Filtered-trade and approval-decision rows now display all persisted market-snapshot fields: RSI14, EMA20, EMA50, ATR14, relative volume20, close, volume, and signal/approval timestamp.
- Missing snapshots remain explicitly marked as not captured; the dashboard does not calculate or invent historical values client-side.

### Structured risk evidence rendered in decision log (2026-08-26)

- Execution decision rows now display the stored estimated loss, invested-notional loss percentage, policy version, and deterministic reason when supplied by the approval engine.
- Rows without structured evidence remain clearly marked as lacking it; the UI does not infer or fabricate risk values.

### Strategy lifecycle/version history rendered (2026-08-26)

- `/v1/operator-overview` now includes up to 100 persisted strategy lifecycle events, and the dashboard renders strategy key/version, stage transition, revision, reason, evidence key, and approval time.
- The lifecycle view is read-only and records reviewed transitions; it does not enable trading or bypass deterministic lifecycle gates.

### Complete persisted decision history rendered (2026-08-26)

- Filtered/shadow trades and paper execution decisions are no longer truncated to 25 rows in the dashboard; all rows returned by the authenticated overview contract are rendered.
- The server remains bounded at its reviewed read-model limits, and the CSV export remains available for the complete exported audit set.

### Agent evidence references rendered (2026-08-26)

- Each displayed agent rationale now includes its persisted evidence-reference identifiers when present, alongside confidence and artifact type.
- The dashboard still displays structured stored output only; it does not collect or reveal hidden chain-of-thought, and evidence references do not grant order authority.

### Reconciled portfolio P/L and exposure metrics (2026-08-26)

- The account card now derives day P/L from persisted `equity` and `lastEquity` when both are present, sums persisted position unrealized P/L, and calculates gross exposure as position market value divided by equity.
- Missing source fields remain explicitly unavailable; no values are inferred from live broker calls or fabricated in the browser.

### Read-only dashboard auto-refresh (2026-08-26)

- The authenticated dashboard now offers a manual Refresh control and automatically requests a server refresh every 60 seconds.
- Refresh only re-reads protected persisted read models; it does not create commands, alter risk state, or add broker authority to the browser.

### Strategy-level shadow performance summary (2026-08-26)

- The dashboard aggregates persisted filtered/shadow observations by strategy, showing total, open, closed, wins, losses, and average observed return where outcomes exist.
- The summary is explicitly descriptive shadow/research evidence; it is not a live-trade performance claim and does not authorize or change orders.

### Complete persisted order/activity history (2026-08-26)

- The dashboard no longer slices the reconciled order or account-activity arrays to an arbitrary recent subset; it renders every row returned by the server-side read model.
- Order rows include requested and filled quantities plus the latest update timestamp, while activity rows include transaction timestamps. The view remains read-only and bounded by the server read-model contract.

### Selectable paper-performance windows (2026-08-26)

- The authenticated paper-performance endpoint accepts validated `range=7d`, `range=30d`, or `range=all` parameters and recalculates metrics, equity curve, drawdown, and stability coverage from the selected reconciled snapshots.
- The dashboard exposes compact 7d/30d/All links and labels the active window. Invalid ranges are rejected, and unauthenticated requests remain protected.

### Read-only current-state alert summary (2026-08-26)

- The dashboard now derives compact critical, warning, and informational notices from the authenticated health, freshness, recovery, migration, Telegram-readiness, kill-switch, and paper-stability contracts.
- Notices are explicitly labeled as current-state health notices, not an immutable alert history and not an action authority. They do not change risk, scheduler, or order behavior.

### Authenticated audit CSV export (2026-08-26)

- Added an authenticated `/v1/operator-overview.csv` API export containing agent runs, filtered/shadow decisions, and paper execution decisions with reasons, risk evidence, and market snapshots.
- Added a server-side Next.js dashboard proxy at `/dashboard/export`, so the browser never needs direct broker credentials or an exposed API token.
- CSV cells are quoted and formula-prefixed values are neutralized to reduce spreadsheet-injection risk. Unauthenticated API access remains fail-closed with `401`.

### Agent rationale and evidence visibility (2026-08-26)

- The operator-overview agent contract now returns the nested artifact shape consumed by the dashboard parser, preserving stored rationale, confidence, type, and evidence references.
- The dashboard shows each recent agent's task, status, stored rationale, confidence, artifact type, and evidence-reference count in the compact dark audit panel.
- This remains structured, persisted agent output only; hidden chain-of-thought is not collected or exposed, and deterministic risk/execution gates remain authoritative.

### Deterministic risk decision evidence (2026-08-26)

- Paper order submissions can persist structured risk evidence: estimated loss, estimated loss percentage, policy version, and deterministic reasons.
- Migration `0012_risk_decision_evidence.sql` was applied with bounded reference `RISK-DECISION-0012`; the API exposes the evidence in the operator decision log.
- The dashboard labels these fields as risk decision evidence and continues to distinguish stored deterministic facts from agent rationale or hidden chain-of-thought.
- Older submissions without evidence remain visible with a clear fallback reason; no synthetic trade or order was created.

### Paper performance equity curve (2026-08-26)

- The authenticated paper-performance endpoint now returns the reconciled equity curve with per-capture return and peak-to-trough drawdown values.
- The dashboard renders the curve as a compact SVG sparkline alongside total return, P/L, drawdown, snapshot count, and stability coverage.
- The curve remains read-only and is derived from persisted account snapshots; it does not change trading behavior or risk policy.

### Research candidate audit evidence (2026-08-25)

- Scheduled research artifacts now retain indicator snapshots alongside each ranked candidate. The operator overview presents these as `research_candidate` records, not as approved or submitted trades.
- Bounded paper run `research-market-1787673210266` produced two candidates, each with an indicator snapshot. This proves the persistence path without placing an order or bypassing strategy/risk gates.

### Point-in-time decision indicators (2026-08-25)

- Finalized-bar strategy candidates now carry RSI14, EMA20, EMA50, ATR14, relative volume20, close, volume, and the signal timestamp.
- Migration `0011_decision_market_snapshots.sql` adds JSONB snapshots to shadow observations and paper order submissions. It was applied with bounded reference `MARKET-SNAPSHOT-0011`; hosted migration planning reports no pending migrations.
- The operator overview exposes these snapshots for filtered signals and paper execution decisions. Legacy rows without snapshots remain visible as incomplete rather than being backfilled with invented values.

### Unified operator audit dashboard (2026-08-25)

- The authenticated API now exposes a read-only operator overview combining persisted agent rationale/evidence, shadow or filtered trade decisions, and paper submission provenance.
- The dashboard presents compact dark-mode views for agent activity, filtered opportunities, portfolio positions, order/fill history, decision audit, and paper performance.
- Shadow decisions include the persisted point-in-time signal snapshot (score, entry, stop, expiry, strategy, rationale, and outcome when available). Paper submission rows explicitly show when no market snapshot is attached; the UI does not fabricate indicators.
- Agent reasoning shown to the operator is stored artifact rationale and structured evidence, not hidden chain-of-thought. Deterministic risk and execution gates remain authoritative.

### Paper performance evidence (2026-08-25)

- Worker deployment `d7b4d8d9-36ac-4481-a8da-46ea1c8464b8` added a read-only report over reconciled equity snapshots.
- Hosted output covers 12 snapshots and reports final equity `99292.09000000`, total P/L `-98.12000000`, total return `-0.09872200%`, and max drawdown `0.20037185%`.
- The negative result is recorded as simulated evidence, not hidden or reframed as a profit claim. No order authority was added.

### Multi-day coverage evidence (2026-08-25)

- Hosted performance reporting now covers 13 snapshots across three calendar days, from `2026-08-22T16:30:21.444Z` through `2026-08-25T15:16:13.679Z`.
- Return remains `-0.09872200%` with maximum drawdown `0.20037185%`; this is monitoring evidence only, not a profitability claim.

### Consecutive coverage evidence (2026-08-25)

- Hosted reporting now distinguishes total calendar days from consecutive coverage: 14 snapshots across 3 calendar days, with 2 consecutive days.
- Current simulated return is `-0.18984767%` and P/L is `-188.69`; the short negative sample does not justify changing strategy or risk policy.

### Stability-readiness gate (2026-08-25)

- The read-only performance report now returns a machine-readable stability gate: at least 30 consecutive calendar days and maximum drawdown no greater than 5%.
- Hosted status remains `blocked` only because the current evidence has two consecutive days; no strategy or risk control is bypassed.

### Bounded paper research evidence (2026-08-25)

- A one-shot stock research command read paper Alpaca market data for `AAPL,MSFT` and persisted run `research-market-1787670407363` with status `succeeded` and a present artifact.
- Verification confirmed approval provenance `RESEARCH-PAPER-PHASE-152-20260825`; the command has no order submission, approval, cancellation, or recurring scheduling authority.

### Crypto research evidence (2026-08-25)

- The paper Alpaca crypto bars endpoint returned `BTC/USD` data. A bounded `1Hour` crypto research run persisted and verified artifact `research-market-1787670529523` with approval provenance `RESEARCH-PAPER-PHASE-153-20260825-BROKER`.
- A `1Day` attempt was correctly rejected because the provider returned fewer than two bars; the source-integrity gate remained fail-closed.
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
| Notifications | Telegram Bot API (server-side Railway worker) | Critical operational and risk alerts; enabled with durable delivery tracking, while channel delivery verification remains unverified |
| External health monitor | GitHub Actions scheduled workflow | Read-only 15-minute verification of Railway API/Worker health and the public Vercel shell; no credentials or trading authority |

Do not run the continuous trading loop in the browser or Vercel functions. Vercel hosts the dashboard; Railway hosts broker access, durable jobs, and the supervised continuous worker.

### Fast-path Paper Autopilot activation evidence (2026-08-25)

- Explicit operator authorization `USER-REQUEST-SKIP-NATURAL-CYCLE-20260825` allowed the natural scheduler-cycle wait to be skipped to accelerate paper-only validation.
- Railway Worker and API have `PAPER_AUTOPILOT_ENABLED=true` and `OPERATING_MODE=paper_autopilot`; live trading remains impossible because `TRADING_MODE=paper` and `ALPACA_PAPER_TRADE=true` remain in force.
- The initial variable-triggered deployment pulled stale `main`; it was corrected by deploying the verified branch directly: Worker `5680300e-4549-4e60-a253-9be539acae79`, API `0aa7163d-cf95-4f9a-8d30-91f7-a97802c3`.
- Worker health is `healthy`, scheduler status is `scheduled`, global kill switch is inactive, and the daily cron remains `0 0 * * *` UTC.
- Runtime readiness was `ready` with a fresh reconciliation (117 seconds old at verification), paper mode, USD 100,000 baseline, 5% invested-notional risk cap, and all deterministic gates passing. No order was submitted.
- API health is `healthy`. Telegram delivery remains unverified; this does not block paper runtime readiness but keeps alert delivery separately gated.

### Updated paper capital and loss policy (2026-08-25)

- Alpaca's official Paper Trading documentation states that a new paper account is created with a USD 100,000 default balance and may be reset with an arbitrary amount: [Alpaca Paper Trading](https://docs.alpaca.markets/us/docs/paper-trading).
- The project baseline is therefore USD 100,000. This is a simulated account baseline, not a claim of real capital or expected returns.
- Profit optimization is an objective evaluated through measured, risk-adjusted performance; it never overrides deterministic safety gates or implies guaranteed returns.
- Each long position must have a stop at or above 95% of entry (maximum 5% adverse price distance). Planned loss, fees, and slippage must fit 5% of invested notional.
- Persisted and displayed `estimatedLossPercent` is calculated against the trade's invested notional, keeping the audit percentage consistent with the deterministic approval limit.
- The updated policy is deployed and hosted readiness reports baseline `100000`, maximum stop loss `5%`, invested-notional risk `5%`, and status `ready`; no order submission was performed.

### Isolated post-restore reconciliation evidence (2026-08-25)

- Temporary recovery Worker `868981c7-f753-46a7-852d-1d8a750852d4` was deployed from the verified branch with paper credentials referenced server-side and `PAPER_AUTOPILOT_ENABLED=false`, `DURABLE_SCHEDULER_ENABLED=false`.
- It reconciled successfully against retained restored PostgreSQL sibling `aa11412e-345e-4a43-aab4-a7e6c7c2b67f`; read-only verification found four account snapshots and latest capture `2026-08-25T15:02:51.939Z`.
- Production recovery evidence is now persisted with bounded reference `RECOVERY-PITR-20260825-POSTRECON` and verified status. Hosted recovery-readiness reports all three evidence checks true.
- The isolated recovery resources are retained; deleting them is a separate reviewed destructive action.

### Current hosted activation evidence (2026-08-24)

- Railway PostgreSQL PITR is enabled with the backup bucket wired. The live probe reports one backup, a healthy WAL archiver, and current `latestBackupAt`, `archiverLastArchivedAt`, and `maxRestoreTime` timestamps.
- The Worker persistent flags are enabled for the daily paper scheduler with bounded reference `USER-REQUEST-20260824`: `DURABLE_SCHEDULER_ENABLED=true`, `DAILY_PREPARATION_HANDLER_ENABLED=true`, and `BROKER_CONNECTION_ENABLED=true`; `PAPER_AUTOPILOT_ENABLED=false` remains explicit.
- The command-scoped activation rehearsal and hosted `daily-reconciliation-readiness` both returned `status:"ready"` with migration and scheduler blocked-reason lists empty. Worker deployment `8be0f606-d5f0-423d-bd15-802dee009ec7` is `SUCCESS`.
- Private Worker Health now reports `status:"healthy"`, durable scheduler `status:"scheduled"`, cron `0 0 * * *` in UTC, next run `2026-08-25T00:00:00.000Z`, and `globalKillSwitchActive:false`. Both durable queues are present and drained (`queuedCount:0`, `activeCount:0`, `failedCount:0`).
- The existing guarded paper reconciliation provenance remains verified: run `paper-reconciliation-retry-20260824-01` with reference `PAPER-RECONCILIATION-RETRY-124` has persisted provenance, fresh reconciliation, and drained queues. This is pre-cycle evidence, not evidence that the recurring schedule has fired.
- Added the guarded `DAILY_CYCLE_VERIFY=true` Worker command. Given an operator-supplied RFC3339 `DAILY_CYCLE_STARTED_AT`, it reads only the latest persisted reconciliation and queue counts, then verifies the capture is after the cycle start and both queues are drained. It never contacts Alpaca, writes PostgreSQL, starts a scheduler, or changes any gate.
- Worker deployment `110d2323-36ec-4700-a2bc-655488b8728a` is `SUCCESS`. A hosted pre-cycle verification correctly returned `status:"incomplete"` with only `reconciliation_before_cycle`; queue presence and drain checks passed.
- Added migration `0010_durable_schedule_runs.sql` and a typed repository contract for running, completed, and failed recurring-cycle records. The migration is applied under bounded approval reference `SCHEDULER-AUDIT-0010-123`; the current hosted Worker does not use the contract until the separate audit activation gate is approved, so scheduler behavior remains unchanged.
- Added optional scheduler start/complete/fail callbacks behind `DURABLE_SCHEDULER_AUDIT_ENABLED`. When enabled, Worker startup requires migration `0010`; while the gate is unset (the current hosted state), no audit database is opened and scheduler behavior is unchanged. Audit failures use the generic `reconciliation_failed` code and cannot expose provider data.
- Worker deployment `a7047f5d-1f2c-4b4b-8319-113a8b2c1698` reached `SUCCESS`; private Worker Health remains healthy with the durable scheduler scheduled. The audit flag remains unset; migration `0010` is now applied but not yet used by the runtime.
- The read-only migration planner classifies `0010_durable_schedule_runs.sql` as requiring an explicit bounded migration approval reference. The dedicated migration writer applies it only when the exact target, gate, and bounded approval reference are supplied.
- Worker deployment `673d1964-9ed0-429a-ab7f-b3e32b37346a` is `SUCCESS`. Hosted migration planning previously reported `0010_durable_schedule_runs.sql` with `approvalRequired:true`; it was then applied using bounded approval reference `SCHEDULER-AUDIT-0010-123`.
- Added `DURABLE_SCHEDULE_AUDIT_READINESS=true pnpm --filter @momentum/worker durable-schedule-audit-readiness`, a read-only fail-closed check for migration `0010`, its table, and required columns.
- Worker deployment `3131b4a4-31d8-4d69-81a7-eb39b3188296` is `SUCCESS`. Hosted readiness correctly returns `migration_not_recorded`, `schedule_runs_table_missing`, and `schedule_runs_columns_missing`; no SQL mutation occurred.
- Added `DURABLE_SCHEDULE_AUDIT_MIGRATE=true` migration execution tooling requiring `DATABASE_MIGRATION_TARGET=0010` and a bounded `DATABASE_MIGRATION_APPROVAL_REFERENCE`, and refusing any unexpected pending migration. It was run with approval reference `SCHEDULER-AUDIT-0010-123`.
- Worker deployment `d4f8adcb-9caa-45a9-bf00-9fab909b854e` is `SUCCESS`; the migration command was invoked with the bounded approval reference and completed successfully.
- A hosted invocation with `DURABLE_SCHEDULE_AUDIT_MIGRATE=false` exited before database access with the expected gate error, confirming the migration command fails closed by default. The authorized invocation then completed successfully; readiness now returns `ready:true` with no blocked reasons and migration planning returns `pending:[]`.
- Post-migration hosted verification returned `DURABLE_SCHEDULE_AUDIT_READINESS=true` with `ready:true`, migration planning with `pending:[]`, and Worker Health `healthy` with the daily scheduler still `scheduled` for `0 0 * * *` UTC. `DURABLE_SCHEDULER_AUDIT_ENABLED` remains unset, so no scheduled-run audit rows are being written yet.
- Worker deployment `ac1e43c3-586b-4f32-ac47-069abb763efd` reached `SUCCESS` with the read-only `durable-schedule-audit-activation-readiness` command. A command-scoped rehearsal returned `status:"ready"` with migration, paper-mode, scheduler, kill-switch, and Paper Autopilot checks satisfied; omitting the audit activation reference failed closed. No persistent variable was changed and no scheduler cycle was triggered.
- Runtime audit activation now requires the bounded non-secret `DURABLE_SCHEDULER_AUDIT_ACTIVATION_APPROVAL_REFERENCE` whenever `DURABLE_SCHEDULER_AUDIT_ENABLED=true`; the reference is validated but never emitted.
- Added an authenticated Operations Health scheduler-audit read model. It returns only the latest run's bounded status, run ID, UTC timestamps, and generic failure code, or `unavailable` when no audit row/schema is available; the dashboard renders this as Scheduler audit status.
- API deployment `2efb3330-8ee5-4b59-a169-834cf11432cd` reached `SUCCESS`; public API health is healthy and unauthenticated Operations Health correctly returns `401`. Vercel production deployment `https://papertrader-j3idgz4ns-altafrs-projects.vercel.app` is `Ready` after a retry, so the dashboard observability change is now deployed.
- The first natural UTC daily cycle was verified read-only with `DAILY_CYCLE_STARTED_AT=2026-08-25T00:00:00Z`: persisted reconciliation captured at `2026-08-25T00:00:32.065Z` and returned `status:"verified"`; work and dead-letter queues were present and fully drained. The scheduler audit gate remains unset, so no `durable_schedule_runs` row was expected or written.
- `pnpm audit:secret-surfaces` passed with no credential-like values in source or browser output. A bounded 200-line JSON log scan for the Worker and API found no Alpaca key, private-key, or credentialed-PostgreSQL patterns. This does not claim a full PostgreSQL data audit; that remains a separately scoped verification if required.
- A read-only hosted PostgreSQL scan examined 63 public text/varchar columns and found zero credential-like matches. The deployed Vercel root returned HTTP 200 with no credential-like pattern. Together with the source/browser and bounded log checks, this completes the current credential-surface audit without exposing values.
- Worker deployment `39aa5a9f-4e0a-4cd1-9d69-578b85bdfbe1` reached `SUCCESS` with the guarded `database-credential-surface-audit` command. Hosted execution returned `status:"passed"`, `columnsScanned:63`, and zero matching columns/rows; `DATABASE_CREDENTIAL_SURFACE_AUDIT=false` failed closed before database access. No persistent runtime variable changed.
- API deployment `a62ace4e-caff-40a7-ab2e-c5654ded16e9` reached `SUCCESS`; authenticated Operations Health now reports scheduler-audit write-gate status (`disabled`, `blocked`, or `enabled`) separately from the latest persisted run. The production gate remains disabled, migration `0010` is ready, and no audit rows are being written.
- Vercel production deployment `https://papertrader-7xv59tusl-altafrs-projects.vercel.app` is `Ready`; API `/health` returned healthy and unauthenticated Operations Health returned `401` after the paired deployment. No scheduler, broker, order, or Paper Autopilot state changed.
- Scheduler-audit activation reference `SCHEDULER-AUDIT-ACTIVATE-001` was supplied by the operator. Worker deployment `90444c76-e1e0-4a04-ba59-5de61f30777b` reached `SUCCESS`; guarded activation readiness returned `status:"ready"` with migration, paper-mode, scheduler, kill-switch, and Paper Autopilot checks satisfied. The first persisted scheduler-run row will be verified after the next natural daily cycle; no manual trigger was issued.
- API deployment `55f63d2f-7b04-4e01-8b11-6f1ee0173fec` reached `SUCCESS` with the same non-secret gate variables, so the dashboard can report the enabled gate truthfully. Queue status remains present and drained; API health is healthy and unauthenticated Operations Health remains `401`.
- The guarded Telegram test was explicitly requested and sent from the Railway Worker using command-scoped reference `USER-REQUEST-TELEGRAM-20260825`; no token, chat ID, or provider response body was logged.
- Added the guarded read-only `durable-schedule-audit-verify` Worker command. Worker deployment `1cc4bee8-ee98-48e4-9e37-22196cfee7c8` reached `SUCCESS`; the pre-cycle check for `2026-08-26T00:00:00Z` correctly returned `status:"incomplete"` with no audit run yet, reconciliation before cycle, and both queues present/drained. It does not trigger work or write state.
- Worker deployment `b27c8db6-1134-47c6-8f33-a991ef38e39a` reached `SUCCESS` with private Worker Health exposing only scheduler-audit enabled/reference-presence booleans. Hosted health is `healthy`, scheduler `scheduled`, next run `2026-08-26T00:00:00Z`, global kill switch inactive, and Paper Autopilot disabled; no scheduler trigger or broker/order action was issued.
- PITR presence is not a restore drill. `RECOVERY_DRILL_VERIFIED` remains unset, so recovery status stays `unverified` until an isolated restore is completed and its reference/timestamp are recorded.

### 2026-08-25 — Phase 6.134 isolated PITR restore drill

- Railway PITR restored production PostgreSQL to an isolated sibling service `Postgres-restored-20260825-1130` (service `aa11412e-345e-4a43-aab4-a7e6c7c2b67f`) at target `2026-08-25T11:30:00Z`; production Postgres, API, Worker, scheduler, broker, and Paper Autopilot state were not changed.
- Restore deployment `485a3d57-9a08-4a7f-ad90-34f02ca23d11` reached `SUCCESS`. It was created at `2026-08-25T11:40:39.400Z` and logged `database system is ready to accept connections` at `2026-08-25T11:44:15.650Z` (observed deployment-to-ready interval: approximately 3m36s). The recovered database reported schema migration `0010`, `durable_schedule_runs`, and `pgboss.job` present. The restored scheduler-audit table contained zero rows, consistent with the target being before the first natural audit cycle.
- The check was read-only; no migration was applied, no queue job was started, and no broker reconciliation was run against the restored sibling. The isolated service is retained pending a separately reviewed cleanup decision.
- This verifies restore mechanics and schema/queue presence only. `RECOVERY_DRILL_VERIFIED` remains unset because the runbook's complete evidence package still requires the bounded recovery approval/timestamp record, checksum/timing record, and separately approved post-restore paper reconciliation.

### 2026-08-25 — Phase 6.135 pre-cycle Paper Autopilot readiness

- Read-only hosted Paper Autopilot readiness confirmed paper mode, configured paper credentials, broker/database/scheduler/handler gates, inactive global kill switch, and the fixed risk policy (`USD 1,000` baseline, `0.25%` planned-risk cap, `USD 100` absolute cap).
- Runtime readiness also reported a fresh persisted reconciliation (`2026-08-25T00:00:32.065Z`, age `42,808` seconds at check time). The overall status remains `disabled` because Paper Autopilot and operating mode are intentionally not activated before the first audited natural scheduler cycle and explicit activation gate.
- No broker request, order submission, queue trigger, database write, or persistent variable change occurred.

### 2026-08-25 — Phase 6.136 Paper Autopilot activation rehearsal

- A command-scoped rehearsal set `PAPER_AUTOPILOT_ENABLED=true` and `OPERATING_MODE=paper_autopilot` only for the read-only runtime-readiness process. It returned `status:"ready"` with all paper, broker, database, scheduler, handler, kill-switch, credential, and risk-policy checks passing, plus fresh reconciliation.
- The rehearsal did not change Railway variables, restart the Worker, enqueue work, contact Alpaca, or submit an order. Persistent activation remains gated until the first natural scheduler-audit record is verified and the operator explicitly activates Paper Autopilot.

### 2026-08-25 — Phase 6.137 Telegram provider-level delivery validation

- Hardened the server-only Telegram notifier to validate the provider's JSON-level `ok:true` response, not just HTTP status. Invalid/malformed/provider-rejected responses now fail with the same generic, non-sensitive delivery error.
- Added regression coverage for successful JSON delivery and an HTTP-200/provider-failure response. Notification credentials and provider response bodies remain excluded from logs and API surfaces.
- Verification: notifications tests (8) and package typecheck pass. No hosted variable, scheduler, broker, queue, or trading state changed.

### 2026-08-25 — Phase 6.138 Telegram validation deployed

- Worker deployment `bc805397-2995-4f7d-bf01-5ae609c5980e` reached `SUCCESS` after deploying the provider-response validation. Private Worker Health returned `healthy`, scheduler `scheduled` for `2026-08-26T00:00:00Z`, global kill switch inactive, observe mode, and Paper Autopilot disabled.
- Deployment was a code-only rollout; no Railway variables, secrets, queue state, scheduler trigger, broker request, or order behavior changed.

### 2026-08-25 — Phase 6.139 isolated PITR schema checksum

- A read-only `pg_dump --schema-only --no-owner --no-privileges | sha256sum` on the restored sibling produced schema checksum `72ceb28d6cfb15199263962f483689b778c2c52e3a15f40c8712d498f7496c8f`.
- This checksum covers schema DDL only; it does not expose account data or credentials and does not substitute for broker reconciliation. The restored service remains isolated and production remains untouched.

### 2026-08-25 — Phase 6.140 startup reconciliation recovery gate

- Worker startup now performs one paper-account reconciliation before registering the durable daily schedule. If that reconciliation fails, scheduling remains paused, Worker scheduler health is degraded, and a generic critical alert is attempted.
- This closes the restart boundary required by the architecture: the scheduler cannot resume from stale internal state. The reconciliation remains read-only at Alpaca and persists only the canonical internal snapshot; no order path or live endpoint is involved.
- Verification: 230 tests, typecheck, lint, and production build pass locally. Deployment is still pending; no hosted state changed in this code unit.

### 2026-08-25 — Phase 6.141 startup reconciliation recovery gate deployed

- Worker deployment `43119259-7ec4-4d90-97ac-4b276228cada` reached `SUCCESS`. Private Worker Health returned `healthy`, scheduler `scheduled` for `2026-08-26T00:00:00Z`, observe mode, inactive global kill switch, and Paper Autopilot disabled.
- Hosted runtime readiness reported a fresh persisted reconciliation captured at `2026-08-25T12:07:59.337Z` (age 38 seconds at verification), confirming the startup recovery reconciliation completed before the scheduler became scheduled.
- No manual scheduler trigger or order action was issued; the startup reconciliation used the existing paper read/reconcile path only.

### 2026-08-25 — Phase 6.142 recovery gate source published

- The completed recovery-gate implementation and evidence commits were pushed to the operator's GitHub repository branch `phase-6-10-operator-health` at commit `47b0632`.
- This is source-control publication only; no runtime variable, scheduler, queue, broker, or trading state changed.

### 2026-08-25 — Phase 6.143 startup recovery invariant tests

- Extracted the startup recovery sequencing boundary and added focused tests proving the scheduler starts only after successful reconciliation and remains paused on reconciliation failure.
- Verification: 232 tests, typecheck, lint, and production build pass. This is a behavior-preserving testability change; the already deployed Phase 6.141 runtime behavior remains unchanged.

### 2026-08-25 — Phase 6.144 startup recovery tests deployed

- Worker deployment `75287072-b5d4-473c-997d-1b9e3f7974e3` reached `SUCCESS`; private Worker Health returned `healthy` with scheduler `scheduled` for `2026-08-26T00:00:00Z`, observe mode, inactive kill switch, and Paper Autopilot disabled.
- The deployment preserves the startup reconciliation gate and its fail-closed test coverage; no manual scheduler trigger or order action occurred.

### 2026-08-25 — Phase 6.145 post-deployment secret-surface audit

- `pnpm audit:secret-surfaces` passed after the recovery-gate changes, finding no credential-like values in source or browser output.
- No hosted configuration, scheduler, queue, broker, or trading state changed during this read-only audit.

### 2026-08-25 — Phase 6.146 Paper Autopilot activation runbook

- Added [`docs/paper-autopilot-activation-runbook.md`](docs/paper-autopilot-activation-runbook.md) covering preconditions, command-scoped rehearsal, persistent paper-only activation, rollback, and evidence capture.
- The runbook explicitly preserves the USD 1,000 baseline, 0.25%/USD 100 risk limits, startup reconciliation, kill switch, freshness, deterministic approval, and paper-mode gates. No activation or order action occurred.

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

### Phase 3.12 Opt-In Shadow Worker Boundary

- Added worker configuration for `SHADOW_EVALUATION_ENABLED`, bounded `SHADOW_EVALUATION_INTERVAL_SECONDS`, source readiness, and explicit `SHADOW_EVALUATION_ONCE` one-shot invocation.
- Worker health now reports shadow evaluation readiness without exposing secrets. Shadow evaluation remains disabled by default; enabling it without a finalized-bar source fails closed at startup.
- Added the `shadow-evaluate` command boundary. It is intentionally not wired to a production bar adapter or repository yet and exits safely rather than claiming a run occurred.

### Phase 3.13 Wired Shadow Worker and Scheduler

- Wired the opt-in worker command to the read-only Alpaca historical-bar adapter, open-observation repository, deterministic shadow runner, and one-time outcome persistence.
- Added a bounded interval scheduler with stable status transitions and last/next run timestamps in worker health. The scheduler starts only when shadow evaluation, paper broker access, database access, and source readiness are explicitly configured.
- A source/API/database failure is reported as a failed run and never creates an order or advances a strategy stage. The default remains disabled.

### Phase 3.14 Shadow Evidence and Replay-to-Shadow Gate

- Added a controlled evidence builder that accepts only closed observations from one exact strategy version, plus a decimal-safe assessment for sample size, positive outcomes, and worst loss.
- Added the explicit replay → shadow lifecycle gate. It requires matching shadow evidence, passing automated checks, and a named operator approval with a note; the transition remains auditable and append-only.
- Automated assessment is deliberately non-promoting: manual review remains required, and no paper order, risk approval, or live-stage transition is reachable from this gate.

### Phase 3.15 Authenticated Replay-to-Shadow Command

- Added `POST /v1/strategies/lifecycle/shadow`, protected by the existing Clerk operator boundary and paper-only runtime guard.
- The command loads closed outcomes from PostgreSQL, recomputes the server-controlled shadow assessment, requires the latest persisted stage to be replay, and appends the next revision with a redacted response.
- Client-supplied evidence and automated-check flags are not trusted; no broker request, order behavior, or automatic promotion beyond the explicitly approved shadow stage is reachable.

### Phase 3.16 Shadow-to-Paper Readiness Gate

- Added paper-forward evidence contracts and decimal-safe readiness assessment for consecutive calendar days, closed trades, drawdown, risk violations, stale-data breaches, and duplicate-order events.
- Extended the append-only lifecycle gate and PostgreSQL constraint to support shadow → paper only when evidence matches the exact strategy version, deterministic checks pass, and an operator approval note is present.
- The assessment remains non-promoting and does not submit orders; paper execution still requires the later risk, mode, freshness, kill-switch, and reconciliation gates.

### Phase 3.17 Authenticated Shadow-to-Paper Command

- Added the `strategy_paper_evidence` PostgreSQL read model and migration `0006_strategy_paper_evidence.sql`; the command reads the latest evidence for the exact strategy version rather than accepting evidence from the client.
- Added protected `POST /v1/strategies/lifecycle/paper`, which verifies the latest shadow stage, recomputes the default paper-forward policy, requires operator approval, and appends the next lifecycle revision.
- Responses are redacted to identifiers and counts. The command does not submit paper orders or bypass deterministic risk, freshness, kill-switch, or reconciliation controls.

### Phase 5.1 Immutable Paper Signals and Deterministic Risk Checks

- Added immutable paper signal snapshots and a deterministic paper-risk assessment covering the USD 1,000 baseline verification, stale account/market data, kill switch, rolling entry count, open-position count, asset-class position caps, gross exposure, and the lower-of-0.25%-equity/USD-100 planned-loss rule.
- Risk output contains explicit rule-level reasons and decimal-string loss values. It has no broker, order, or approval side effects and cannot be overridden by an agent.
- Paper order submission remains disabled until the intent, idempotent execution, reconciliation, and mode gates are implemented and verified.

### Phase 5.2 Immutable Trade Intents and Execution-Time Approvals

- Added immutable paper trade intents with validated positive quantity, non-negative cost estimates, signal expiry, and stable intent identifiers.
- Added execution-time risk approval that re-evaluates current account/market state, kill-switch state, exposure, limits, and expiry; each intent receives at most one stored approval record.
- Approval is a deterministic authorization record only. It cannot submit, retry, cancel, or modify a broker order, and it remains paper-only.

### Phase 5.3 Idempotent Paper-Order Submission Boundary

- Added a server-only Alpaca paper-order adapter that rejects disabled broker access, rejected approvals, invalid intent-derived client IDs, and malformed limit orders.
- Submission first looks up the client order ID and returns the existing normalized order on retry; it posts only after a `404`, preserving idempotency across restarts and network retries.
- The adapter is hard-pinned to `https://paper-api.alpaca.markets`, never exposes credentials, and supports only buy orders. It does not cancel, replace, liquidate, or access live endpoints.

### Phase 5.4 Transactional Order Persistence and Reconciliation Records

- Added `paper_order_submissions` with unique intent and client-order identifiers, approval linkage, submission status, broker ID, fill quantity, and timestamps; migration `0007_paper_order_submissions.sql` adds the reviewed constraints and index.
- Added transactional repository operations that record an intent once, reject client-ID reuse across intents, and update broker truth only for an existing submission.
- This persistence boundary does not enable Paper Autopilot; broker truth must still be reconciled and execution-time gates must remain satisfied.

### Phase 6.1 Paper Execution Wiring and Mode Gate

- Added the explicit `PAPER_AUTOPILOT_ENABLED` configuration gate. It defaults off, requires paper runtime, paper credentials/broker opt-in, and database availability at worker startup; live mode remains unavailable.
- Wired the approved-intent flow in the worker: persist `pending`, submit through the paper-only idempotent adapter, reconcile the broker response, or mark the submission failed without retrying through a second client order ID.
- The worker path still has no live endpoint, agent override, or per-order approval bypass. Paper Autopilot is not enabled by default and requires the operator's explicit deployment configuration.

### Phase 6.2 Controlled Paper Recovery and Partial-Fill Reconciliation

- Added broker-status recovery rules that validate client-order identity, reject overfills/unknown statuses/terminal regressions, and preserve partial fills as non-terminal truth.
- Integrated those rules before persistence updates so a malformed or contradictory broker response marks the submission failed rather than silently changing intent state.
- Existing client-ID lookup and transactional persistence provide restart-safe retry behavior; live capability and automatic retry loops remain disabled.

### Phase 6.3 Durable Daily Scheduling and Recovery Boundary

- Added the selected `pg-boss` PostgreSQL queue with a UTC daily-preparation schedule, bounded exponential retries, queue retention, and a dead-letter queue.
- Added worker health fields for durable scheduler enablement, last run, next run, and degraded state; failed handlers remain visible and are retried by the durable queue rather than by an in-memory timer.
- The queue is explicitly disabled by default. Enabling it requires `DATABASE_URL` and an explicit handler flag; the current handler performs read-only paper-account reconciliation and never submits orders.

### Phase 6.4 Controlled Durable Queue Provisioning

- Added a one-shot `durable-migrate` command that starts `pg-boss`, provisions the work and dead-letter queues, and shuts down without starting scheduled workers.
- The command requires an explicit `DURABLE_QUEUE_MIGRATE=true` invocation, paper-only runtime validation, and `DATABASE_URL`; it never reads Alpaca or creates an order path.
- Restart tests verify the worker re-registers the durable schedule after stop/start, while queue provisioning remains idempotent through `pg-boss`.

### Phase 6.5 Hosted Queue Verification Boundary

- Added a guarded queue-status command that checks the work and dead-letter queue presence and reports bounded queue counts without exposing database configuration.
- The status command is separate from worker startup and broker reconciliation; it cannot place orders or enable a scheduler.

### Phase 6.6 Idempotent Hosted Run-once Trigger

- Added a guarded enqueue command for immediate daily reconciliation verification after a worker restart.
- The trigger uses a deterministic UTC job ID; repeated invocation for the same day reports `queued: false` rather than creating duplicate work.
- It only enqueues the existing read-only reconciliation job and has no direct broker or order authority.

### Phase 6.11 Scheduler Readiness Boundary

- Added a guarded `durable-readiness` command that evaluates paper mode, database, broker opt-in, paper credentials, and verified handler gates without opening a database or broker connection.
- The command reports only `disabled`, `blocked`, or `ready` plus non-secret reason codes; an explicitly enabled but incomplete scheduler exits non-zero.
- Readiness does not activate the scheduler or Paper Autopilot. Persistent Railway flags remain disabled until a separate operator-approved activation step.

### Phase 6.12 One-Run Scheduler Reconciliation Boundary

- Added `durable-one-run`, which provisions the existing `pg-boss` queues, registers a temporary worker, enqueues one immediate daily-preparation payload, waits for one read-only paper reconciliation, and shuts down.
- The command requires command-scoped broker and handler gates and refuses persistent scheduler or Paper Autopilot enablement. It never creates a recurring schedule or an order path.
- Hosted execution remains a separately approved operator action because it performs one Alpaca paper read and one PostgreSQL reconciliation write.

### Phase 6.15 Paper-only CI Verification

- GitHub Actions runs the locked lint, test, typecheck, and production-build loop for pull requests and pushes to `main`.
- CI has read-only repository permissions and no access to Railway, PostgreSQL, Alpaca, Clerk, Vercel, or deployment secrets.

### Phase 6.16 Railway Database Connectivity Verification

- Railway's `Postgres` service exposes `DATABASE_URL`, and the API and Worker services have non-empty service-side database values.
- The deployed Worker parsed its `DATABASE_URL` without exposing credentials, resolved the private `postgres.railway.internal:5432` host, and established a TCP connection.
- The PostgreSQL service completed a read-only `SELECT 1` through its service-side `DATABASE_URL`; the Worker also completed the guarded read-only `durable-status` query, confirming both `pg-boss` work and dead-letter queues are present with zero queued, active, and failed jobs.
- The verification did not print the connection string, change variables, enable broker access, start the scheduler, submit orders, or enable Paper Autopilot.

### Phase 6.17 Guarded Database Status Command

- The Worker now exposes `database-status`, guarded by the command-scoped `DATABASE_STATUS=true` flag, to run a single read-only `SELECT 1` through the configured PostgreSQL pool.
- The command requires the existing paper-only runtime and `DATABASE_URL`, returns only `{"databaseReachable":true}` on success, and replaces all database/provider failures with a generic message.
- It closes the pool before exit and has no Alpaca, queue, scheduler, strategy, risk, or order authority. The flag is never a persistent Railway setting.
- Worker deployment `d28e267c-42cd-4cfa-b364-9f30c8468bca` reached `SUCCESS`; Railway SSH returned `{"databaseReachable":true}` with `env DATABASE_STATUS=true pnpm --filter @momentum/worker database-status`.
- Post-deployment checks confirmed `BROKER_CONNECTION_ENABLED=false`; research, durable-scheduler, daily-handler, and Paper Autopilot flags remain unset. No broker request or order action occurred.

### Phase 6.18 Secret-Surface CI Audit

- Added `pnpm audit:secret-surfaces`, which scans source/tracked files for assigned credential-like values and scans the Next.js browser output for database URLs or Clerk secret-key formats.
- The audit reports filenames only on failure and never prints matching values. Public variable-name references from dependencies are not treated as leaked credentials.
- GitHub CI runs the audit after the production build. The current source and browser output pass with no credential-like values found.

### Phase 6.19 Explicit Paper Operating-Mode Contract

- `packages/config` now resolves `OPERATING_MODE` as `observe`, `recommend`, or `paper_autopilot`, defaulting safely to `observe` when Paper Autopilot is disabled.
- Contradictory settings fail closed: `paper_autopilot` requires `PAPER_AUTOPILOT_ENABLED=true`, while `observe`/`recommend` reject an enabled Paper Autopilot flag. Live mode remains unavailable.
- Authenticated operations health exposes the resolved mode, and the dashboard renders it alongside broker, scheduler, and Paper Autopilot gates. No mode-changing control or persistent configuration mutation was added.
- API deployment `5bae4605-c1e8-4115-bbdc-90982aab61ad` reached `SUCCESS`; public health returned HTTP 200 and unauthenticated operations health returned HTTP 401. Hosted `OPERATING_MODE` is unset, so the safe resolved mode is `observe`; broker, scheduler, handler, and Paper Autopilot flags remain disabled or unset.

### Phase 6.20 Dashboard Mode Visibility

- The authenticated dashboard's persistent status bar now renders the server-resolved operating mode (`Observe`, `Recommend`, or `Paper Autopilot`) instead of a generic read-only label.
- If the authenticated operations-health response is unavailable, the bar displays `Mode unavailable`; it never infers or fabricates a mode. The detailed health card continues to show all activation gates.
- Vercel preview deployment `dpl_CQua9HGsqECuzwatPiKrU8CgWsaj` reached `Ready` at `https://papertrader-ecg4e2ftb-altafrs-projects.vercel.app`; the deployment remains protected and unauthenticated HTTP returned the expected redirect.

### Phase 6.21 Truthful Public Foundation Status

- Updated the public foundation page to describe the current deployed paper infrastructure: Vercel dashboard, protected Railway API, private connected PostgreSQL, and an online but execution-gated worker.
- The page now shows `Observe` and `Broker access gated`, states that order authority is disabled, and avoids claiming that credentials, database connectivity, or server-side paper adapters do not exist.
- It remains informational only; no browser credential, broker call, mode-changing control, scheduler, or order authority was added. Vercel preview `dpl_BgZVSWj78ASLQtrBBTedh98DQK5c` reached `Ready` and remains deployment-protected.

### Phase 6.22 Worker Operating-Mode Health

- Extended the shared Worker health contract with the resolved paper operating mode and made Worker startup validate the same contradiction rules as the API.
- Worker deployment `06735237-cbfa-4bc0-8004-cd4e899b53ba` reached `SUCCESS`; its private health endpoint returned HTTP 200 with `operatingMode:"observe"`, healthy status, and durable/research/shadow gates disabled.
- The health field is observational only; it does not enable a mode, contact Alpaca, write PostgreSQL, or submit orders.

### Phase 6.23 Worker Integration Configuration Health

- Worker health now distinguishes configured paper integration prerequisites (`alpaca:"configured"` and `database:"configured"`) from execution authority (`brokerConnectionEnabled:false`). Configuration status is derived from server-side variables and never includes their values.
- Deployment `af3ef28a-174d-4a63-bd5c-b5d5ac046201` reached `SUCCESS`; the private health endpoint returned HTTP 200 with `status:"healthy"`, `operatingMode:"observe"`, configured Alpaca/database status, broker access disabled, and durable/research/shadow gates disabled.
- This is an observational verification only. It does not call Alpaca, write application state, start a scheduler, enable Paper Autopilot, or submit orders.

### Phase 6.24 One-Run Approval Provenance Guard

- The guarded durable one-run command now requires `DURABLE_SCHEDULER_APPROVAL_REFERENCE`, a bounded non-secret operator or change-ticket reference, in addition to its existing command-scoped paper, broker, handler, database, and scheduler gates.
- The reference is passed only to the immediate queue payload for auditable provenance and is not persisted as a Railway variable, used as an authorization token, or accepted as a credential/account value.
- Added focused validation tests and updated the Railway runbook. Local tests, typecheck, lint, production build, secret-surface audit, and diff checks pass; no hosted command was run and no broker/database side effect occurred.

### Phase 6.25 Paper Baseline and Single-Trade Risk Invariants

- The domain contract now names the initial paper-equity baseline as `USD 1,000` and exports the absolute single-trade risk ceiling as `USD 100`; the deterministic risk calculation continues to apply the lower of `0.25%` of current equity and that absolute ceiling.
- Added regression coverage at both the `USD 1,000` baseline and a high-equity case proving the absolute ceiling cannot be exceeded, including estimated fees and slippage.
- These are server/domain invariants only. They do not enable a strategy, approve an intent, contact Alpaca, write PostgreSQL, or alter hosted configuration.

### Phase 6.26 Operator-Visible Paper Risk Policy

- Authenticated `GET /v1/operations-health` now returns the non-secret active paper risk policy: the USD 1,000 initial baseline, the USD 100 absolute single-trade ceiling, and the 0.25% equity limit.
- The dashboard validates the expanded redacted contract and displays the baseline and maximum single-trade risk beside the existing mode, scheduler, broker, and Paper Autopilot gates.
- This is read-only metadata. The browser cannot change the policy, approve a trade, contact Alpaca, write PostgreSQL, or enable any execution gate. Local tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. API deployment `c4c0901c-f9ea-4638-95af-add7ca2227fd` reached `SUCCESS`; `/health` returned HTTP 200 and unauthenticated operations health returned HTTP 401. Vercel preview `dpl_E378eJz2ZU3AauLptSPJeogFqhCW` reached `Ready` and remains deployment-protected with unauthenticated HTTP 302.

### Phase 6.27 Paper Autopilot Readiness Report

- Added the guarded `paper-autopilot-readiness` command and pure readiness contract. It reports disabled, blocked, or configuration-ready state from paper mode, server-side credentials, broker/database gates, durable scheduler/handler gates, operating mode, and the fixed risk-policy invariants.
- Readiness output contains only booleans, bounded reason codes, and non-secret policy constants. It never constructs Alpaca/PostgreSQL clients, reads account state, starts queues, changes variables, or submits orders.
- A `ready` result is explicitly configuration readiness only; `runtimeFreshnessGateRequired:true` remains present, so reconciliation freshness, kill switch, deterministic risk approval, and other runtime checks must still pass before any order path can run. Local tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `7f225657-eedb-4c42-b803-a7a8b4e6a7fe` reached `SUCCESS`; the hosted guarded report returned `status:"disabled"`, paper mode and credentials configured, database configured, broker/scheduler/handler/autopilot gates disabled, and the fixed risk policy values. No client or external data call was made.

### Phase 6.28 Paper Autopilot Runtime Freshness Readiness

- Added the guarded `paper-autopilot-runtime-readiness` command. It reads the latest persisted reconciliation timestamp from PostgreSQL, classifies it as fresh/delayed/stale/unavailable using the shared operational thresholds, and combines that result with the configuration readiness contract.
- The command never calls Alpaca, starts a queue, changes a variable, approves an intent, or submits an order. It closes its database pool and emits only bounded statuses, reason codes, timestamps, and non-secret policy metadata.
- A runtime `ready` result requires both configuration readiness and fresh persisted broker truth; disabled configuration remains disabled even if a fresh snapshot exists. Local tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `3ac368fd-c5b3-4443-989b-354d2b16195f` reached `SUCCESS`; the hosted read-only check returned `status:"disabled"` with reconciliation `status:"fresh"` and age `56932` seconds, while broker, scheduler, handler, and Paper Autopilot gates remained disabled.

### Phase 6.29 Global Kill-Switch Runtime Guard

- Added the server-side `GLOBAL_KILL_SWITCH_ACTIVE` boolean guard, defaulting to inactive and rejecting invalid values. When active, Paper Autopilot readiness reports `global_kill_switch_active`, Worker startup refuses enabled Autopilot, and paper-order execution stops before persistence or broker submission.
- The guard is independent of browser state and cannot be bypassed by an approved intent, agent output, or a command payload. It remains off in the current deployment and does not change any persistent Railway variable.
- Added configuration, readiness, startup-boundary, and execution tests. Local tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `726c5b3b-8dfb-4b3f-9f4f-9511935f7f43` reached `SUCCESS`; hosted readiness returned `globalKillSwitchActive:false`, `status:"disabled"`, and broker/scheduler/handler/Autopilot gates disabled. No persistent variable was changed.

### Phase 6.30 Operator-Visible Kill-Switch Status

- Authenticated `GET /v1/operations-health` now includes the redacted `globalKillSwitchActive` state, and the dashboard renders it next to broker, scheduler, Autopilot, mode, and risk-policy metadata.
- The browser remains display-only: it cannot toggle, clear, or override the kill switch. Invalid server-side values fail closed through the configuration guard.
- Local tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. API deployment `ceb8f9fb-1723-43d0-8d8d-3e9344c72c1d` reached `SUCCESS`; `/health` returned HTTP 200 and unauthenticated operations health returned HTTP 401. Vercel preview `dpl_GGphneUFTQm7wviXF7w8HRsGphrz` reached `Ready` and remains deployment-protected with HTTP 302. No order, scheduler, or configuration mutation was added.

### Phase 6.31 Worker Kill-Switch Health Consistency

- Extended the private Worker health contract with `globalKillSwitchActive`, resolved through the same server-side configuration guard used by API operations health and Paper Autopilot execution.
- Worker health is observational and contains no secret values or controls. A mismatch cannot enable execution; startup and order-path guards remain authoritative.
- Local tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `8823b09e-16c8-4773-874e-903321c23474` reached `SUCCESS`; private `/health` returned HTTP 200 with `operatingMode:"observe"`, `globalKillSwitchActive:false`, configured integrations, broker disabled, and durable/research/shadow gates disabled. No hosted flag or order behavior changed in this unit.

### Phase 6.32 Hosted Kill-Switch Exercise

- Exercised `GLOBAL_KILL_SWITCH_ACTIVE=true` only as a command-scoped value in the guarded Railway readiness command, with all other Autopilot gates supplied only to that client-free process. The command exited non-zero with `status:"blocked"` and the sole reason `global_kill_switch_active`.
- The exercise did not construct Alpaca/PostgreSQL clients, start the scheduler, submit orders, or persist any setting. A secret-safe persistent-variable audit afterward confirmed broker access is explicitly `false`; handler, scheduler, kill-switch, and Autopilot variables remain absent or disabled.

### Phase 6.33 Durable One-Run Readiness Preflight

- Added the guarded `durable-one-run-readiness` command. It validates the command-scoped run-once flag, bounded approval reference, paper mode/credentials, database, temporary broker/handler gates, disabled persistent scheduler/Autopilot flags, and global kill switch without constructing any client.
- Output contains only booleans and bounded reason codes. A `ready` result means the one-run command's temporary preconditions are satisfied; it does not enqueue a job, read Alpaca, write PostgreSQL, or authorize an order.
- Added tests for missing gates, fully gated readiness, and kill-switch blocking. Local tests, typecheck, lint, production build, secret-surface audit, and diff checks pass.
- Worker deployment `5e0f535b-0506-41c2-ae7e-90b1eee0851d` reached `SUCCESS`. Hosted preflight with persistent flags returned `status:"blocked"` for the expected temporary run-once, approval-reference, broker, and handler gates; a second command-scoped preflight with `ticket-123` and temporary gates returned `status:"ready"`. Neither invocation constructed a client or enqueued work.

### Phase 6.34 Durable One-Run Post-Run Verification

- Added the guarded `durable-one-run-verify` command. It reads bounded `pg-boss` queue state and the latest persisted reconciliation timestamp, then reports `verified` only when both queues are present and drained, the dead-letter queue is empty, and reconciliation is fresh.
- It emits no account, position, order, credential, or raw queue payload values. It cannot enqueue, start a recurring schedule, call Alpaca, or write application state; database/queue clients are closed on every path. Worker deployment `66634d2f-9498-4e24-b7ef-38508d66c1fb` reached `SUCCESS`; the hosted verifier returned `status:"verified"` with both queues present/drained and reconciliation `status:"fresh"` at age `58259` seconds. This verifies current state only and does not claim that a new one-run caused the existing snapshot.
- Added deterministic tests for verified, incomplete, and stale outcomes. Local tests, typecheck, lint, production build, secret-surface audit, and diff checks pass.

### Phase 6.35 Durable One-Run Provenance

- Added bounded, non-secret `DURABLE_ONE_RUN_ID` and retained the bounded approval reference on the guarded one-run command. The command emits only `{runId, approvalReference, status}` on completion.
- The post-run verifier requires the same command-scoped run identifier and approval reference and includes them in its JSON contract, so an operator can attach evidence to a specific invocation without exposing credentials or account data.
- This is provenance supplied by the operator, not a persisted causal audit event: the verifier still confirms current queue/database state only and does not claim that the referenced run caused the snapshot until durable audit persistence is added.
- Added readiness, validation, verification, and secret-surface tests. No hosted command, broker request, scheduler enablement, or one-run reconciliation was executed.

### Phase 6.36 Durable One-Run Audit Persistence

- Added reviewed migration `0009_durable_one_run_audits.sql` and a PostgreSQL audit table keyed by the bounded run ID, linked to the resulting account snapshot and carrying the approval reference, capture time, and completed status.
- The guarded one-run queue payload now carries its run ID and approval reference; reconciliation writes the audit row in the same transaction as the account snapshot. The verifier requires and checks the persisted audit row before reporting `verified`.
- Recurring daily jobs remain unchanged and do not create one-run audit rows. No live capability, browser authority, or automatic approval was added.

### Phase 6.37 Migration Readiness Check

- Added the guarded, read-only `database-migration-readiness` command. It checks the reviewed `0009` migration file, the `schema_migrations` record, the audit table, and all required columns without creating or changing database state.
- A `ready` result means the hosted database is structurally prepared for the persisted one-run audit contract; a `blocked` result reports only bounded reason codes. The command does not apply migrations or enable any worker gate.
- Worker deployment `586ab6cb-9a45-4013-8825-1b603e33b6cc` reached `SUCCESS`. The private Railway check returned `blocked` with `migration_not_recorded`, `audit_table_missing`, and `audit_columns_missing`; the reviewed migration file was present. No SQL mutation was performed.

### Phase 6.38 Migration Approval Guard

- Hardened the guarded application migration command so pending migration `0009` requires `DATABASE_MIGRATION_APPROVAL_REFERENCE`, a bounded non-secret operator reference. Earlier migrations retain their existing guarded behavior.
- Added deterministic validation tests. The guard does not expose or persist the reference, apply SQL by itself, or alter hosted configuration.
- Worker deployment `332fe1c9-1e55-4c53-8336-d20b08835d94` reached `SUCCESS`; private `/health` remained healthy with observe mode, broker/scheduler/research/shadow gates disabled, and the global kill switch inactive. The hosted readiness check remained blocked only by the unapplied `0009` schema state.

### Phase 6.39 Migration Dry-Run Plan

- Added the read-only `database-migration-plan` command. It lists unapplied migration files and marks which pending versions require an approval reference, without creating `schema_migrations`, applying SQL, or changing hosted state.
- If the tracking table is absent, the plan reports that fact explicitly and does not infer that any migration is safe to apply. The command emits only bounded filenames, versions, booleans, and status.
- Worker deployment `7b78fe6a-f6f9-4d51-9984-d7bb7cc70647` reached `SUCCESS`. The private Railway plan reported exactly one pending migration, `0009_durable_one_run_audits.sql`, with `approvalRequired:true`; `schema_migrations` is present. No SQL mutation occurred.

### Phase 6.40 Daily Reconciliation Readiness

- Added the combined read-only `daily-reconciliation-readiness` command. It composes paper credentials/database/broker/handler/scheduler gates with migration `0009` structural readiness, so daily server activation has one bounded status contract.
- The command reports `disabled` when prerequisites are structurally ready but the recurring scheduler flag is off, and `blocked` when migration or runtime prerequisites are missing. It never enables the scheduler, contacts Alpaca, or writes PostgreSQL.
- Worker deployment `b1440657-b6aa-4497-97ab-6c6004723569` reached `SUCCESS`. The private Railway check returned `blocked` with the clean reasons `migration_not_recorded`, `migration_audit_table_missing`, and `migration_audit_columns_missing`; scheduler status remained `disabled`. No SQL mutation occurred.

### Phase 6.41 Scheduler Startup Migration Gate

- Added a fail-closed startup guard before the recurring durable scheduler starts. If `DURABLE_SCHEDULER_ENABLED=true` is ever supplied while migration `0009` is absent or incomplete, the worker refuses to start the daily scheduler and reports bounded migration reasons.
- The guard closes its temporary database pool and does not enable the scheduler, call Alpaca, or write PostgreSQL. The current default-disabled worker path is unchanged.
- Worker deployment `34e9c4f9-a76c-4590-9e9e-d41c68067a36` reached `SUCCESS`; private health remained healthy with `durableScheduler.enabled:false`, broker access disabled, observe mode, and the global kill switch inactive. Combined readiness continued to report the three bounded migration reasons. No SQL mutation occurred.

### Phase 6.42 Explicit Migration Target Guard

- Hardened the guarded migration command so a pending `0009` requires both `DATABASE_MIGRATION_TARGET=0009` and the bounded approval reference. This prevents a generic “apply all” invocation from being treated as authorization for the reviewed audit migration.
- The target is command-scoped metadata only; it does not alter the database, scheduler, broker, or approval records.
- Worker deployment `cd79e69e-1a31-438c-ba47-c4480ae1b82a` reached `SUCCESS`; private health remained healthy with observe mode, broker access disabled, durable scheduler disabled, and the global kill switch inactive. No migration command or SQL mutation was run.

### Phase 6.43 Scheduler Migration Probe Tests

- Added direct tests for the scheduler migration probe: complete schema readiness, missing `schema_migrations` fail-closed behavior, and assertion rejection of incomplete state.
- This verifies the actual query-contract path used at startup, not just the pure error assertion. No hosted state or runtime behavior was changed.

### Phase 6.44 Migration Preflight Ordering

- Reordered the guarded migration command so it reads the tracking-table state and validates the exact pending set before creating `schema_migrations` or applying any migration SQL.
- The command now refuses any pending version other than `0009`, then requires the exact target and bounded approval reference. This keeps a partially initialized or unexpectedly migrated database fail-closed.
- Worker deployment `3cf7e599-61c8-47e3-9ab0-270468b357f5` reached `SUCCESS`. The private no-write plan reports exactly one pending migration (`0009_durable_one_run_audits.sql`) and no unrelated pending versions. No SQL mutation occurred.

### Phase 6.45 Dashboard Migration Readiness Visibility

- Added read-only audit-migration metadata to authenticated operations health and the dashboard. The UI shows `Ready` or `Blocked` alongside scheduler state and does not expose database details or controls.
- The API checks only bounded schema booleans/reason codes and closes its temporary metadata pool. No endpoint can apply migration SQL, enable scheduling, or alter broker state.
- API deployment `ecc32524-c11f-49b0-bac0-c191f75f88a9` reached `SUCCESS`; private `/health` returned healthy. The authenticated operations-health response now carries migration status/reasons for the dashboard; no migration or scheduler control was added.
- Vercel preview deployment `dpl_Coim3aCAv7mRqduqRCaBXD1ZAtHn` reached `Ready` for the current branch, confirming the dashboard build containing the read-only migration status. No browser control or persistent configuration was added.

### Phase 6.46 Dashboard Migration Block Reasons

- The dashboard now renders the bounded migration block reasons beneath the status, making `migration_not_recorded`, `audit_table_missing`, and `audit_columns_missing` visible to the operator without exposing SQL, credentials, or account data.
- This remains display-only; no button, form, or browser path can apply migration SQL or enable scheduling.

### Phase 6.47 API Migration Probe Contract

- Extracted the API migration metadata query into a tested contract, covering complete schema and missing `schema_migrations` behavior. Operations health now uses this shared reader rather than inline query logic.
- The reader returns only bounded status/reason data and propagates unexpected database failures to the existing unavailable response; it has no write authority.
- API deployment `388817b7-dced-4e13-8869-dca26122bb59` reached `SUCCESS`; a private Railway health probe returned HTTP 200 with the API healthy response. No migration SQL, scheduler, broker, or order operation was performed.

### Phase 6.48 Bounded Migration Reason Contract

- The dashboard parser now accepts only the server-defined migration reason codes `migration_not_recorded`, `audit_table_missing`, and `audit_columns_missing`; unknown codes fail closed instead of being rendered as trusted operational state.
- The API migration-readiness type uses the same bounded reason union, preserving the read-only status contract without changing database queries or runtime gates.
- API deployment `c4882939-bce4-47b9-8e05-38337a170691` reached `SUCCESS`; private `/health` returned HTTP 200. Vercel preview `dpl_4NrANzRza3rdLjSc86NxuxQnv9gG` reached `Ready`; unauthenticated dashboard access returned the expected HTTP 302 deployment-protection redirect. No migration SQL, scheduler, broker, or order operation was performed.

### Phase 6.49 Hosted Daily-Reconciliation Readiness Recheck

- The deployed Worker read-only `daily-reconciliation-readiness` command was rerun over Railway's private network. It returned `blocked` with `migration_not_recorded`, `migration_audit_table_missing`, and `migration_audit_columns_missing`; the reviewed migration file is present.
- The scheduler sub-check remained `disabled`, with paper mode, database, and paper credentials configured but broker, handler, and scheduler flags false. The command exited non-zero because the migration prerequisite is blocked, as designed.
- No migration SQL, queue start, Alpaca request, broker mutation, or order action occurred.

### Phase 6.50 Research-Schedule Readiness Visibility

- Authenticated API operations health now reports read-only research-schedule status (`disabled`, `blocked`, or `ready`) from explicit paper credentials, database, broker, handler, and scheduler gates. The dashboard displays this beside the durable scheduler state.
- The contract is configuration/readiness metadata only; it does not start research, contact Alpaca, create a queue, write PostgreSQL, or alter any Railway variable.
- API deployment `d5764f90-7ba4-424c-a8a2-cc979e684c98` reached `SUCCESS`; private `/health` returned HTTP 200. A Vercel deployment attempt was rejected by the free-tier limit (`more than 100` deployments in 24 hours), so the prior preview remains the latest hosted dashboard build until quota resets.

### Phase 6.51 Explicit Paper-Mode Research Gate

- Research-schedule readiness now requires an explicit paper-mode check (`TRADING_MODE=paper` and `ALPACA_PAPER_TRADE=true`) in addition to its existing credentials, database, broker, handler, and scheduler gates.
- The check is deterministic metadata only and fails closed; it does not change operating mode or enable research. API deployment `0be9a305-3ce5-4031-8fee-4c922fb46899` reached `SUCCESS`, and private `/health` returned HTTP 200. No Vercel deployment was attempted because the dashboard code was unchanged and the free-tier quota remains exhausted.

### Phase 6.52 Durable One-Run Audit Migration Applied

- With the explicit non-secret operator reference `MIGRATION-0009-123`, Railway's guarded worker migration command applied only the reviewed target `0009`; the command reported `appliedThrough:"0009"` and `migrationCount:9`.
- Read-only migration readiness now returns `ready` with the migration ledger, audit table, and required audit columns present. Combined daily-reconciliation readiness returns `disabled` with no blocked reasons because the recurring scheduler remains off.
- The durable work and dead-letter queues are present with zero queued, active, and failed jobs. No one-run reconciliation, Alpaca request, persistent flag change, scheduler activation, or Paper Autopilot activation was performed; the one-run remains a separately approved action.

### Phase 6.53 Hosted Safety-Surface Verification

- The repository secret-surface audit passed against source and the generated browser bundle; the full quality gate also passed with 186 tests, workspace typecheck, lint, and production build.
- Railway variable-name inspection confirmed Alpaca credentials and `DATABASE_URL` are present on the API/worker backend boundary, while the worker retains paper mode and disabled broker access. Values were not printed or inspected.
- The local checkout is not linked to the Vercel project, so Vercel environment names and hosted logs were not independently rechecked in this unit. No claim is made that the Vercel-side credential audit is complete; the dashboard remains display-only and no code/deployment change was made.

### Phase 6.54 Vercel Environment-Boundary Verification

- The authenticated Vercel CLI linked the local dashboard checkout to `altafrs-projects/papertrader-web` for read-only inspection; no deployment or environment mutation was performed.
- Vercel environment names are limited to Clerk/authentication values and `NEXT_PUBLIC_API_BASE_URL` across Preview and Production. No `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`, or `DATABASE_URL` variable is present on the frontend project.
- Runtime log inspection remains intentionally deferred unless a bounded observation window is needed; no log content was printed. Railway remains the only broker/database secret boundary, and the dashboard has no broker authority.

### Phase 6.55 Hosted Paper One-Run Preflight

- The deployed worker's client-free `durable-one-run-readiness` command was run with command-scoped gates, a bounded preflight reference, and a bounded run ID. It returned `status:"ready"` with no blocked reasons.
- The readiness result confirmed paper mode, paper credentials, database configuration, broker/handler command gates, disabled persistent scheduler, disabled Paper Autopilot, and an inactive global kill switch. The command did not contact Alpaca, write PostgreSQL, start queues, or persist any runtime flag.
- This preflight does not authorize or perform the one-run. A separate operator approval reference for the actual paper reconciliation remains required before the command that reads Alpaca and writes the reconciled read model.

### Phase 6.56 Hosted PostgreSQL Connectivity Verification

- The deployed worker's guarded `database-status` command returned `databaseReachable:true` using the server-side Railway connection; the connection string and database values were not printed.
- This was a read-only `SELECT 1` probe. It did not contact Alpaca, start queues, apply migrations, alter persistent variables, or enable any execution path.

### Phase 6.57 Hosted Dashboard Deployment Refresh

- Vercel preview deployment `dpl_3jRuQ8ph9653U1MJ7DhzyqEm4zLi` for the current branch reached `Ready`; the deployment is protected by the configured authentication gate.
- Unauthenticated HTTP checks for `/` and `/dashboard` returned `302`, confirming deployment protection rather than an unprotected or fabricated dashboard response. No frontend credentials, broker authority, scheduler, or execution gate changed.
- The authenticated dashboard still requires a valid Clerk operator session to inspect persisted account/reconciliation data; the paper one-run remains separately approved and not yet executed.

### Phase 6.58 Deployed Worker Health Verification

- A server-side Node health probe against the private worker returned `status:"healthy"`, `operatingMode:"observe"`, paper credentials/database configured, and `globalKillSwitchActive:false`.
- The same health response confirmed `brokerConnectionEnabled:false`, durable scheduler `disabled`, research schedule `disabled`, and shadow evaluation `disabled`. No credential values were emitted.
- This confirms the worker is running safely in its default observation state; it does not authorize the paper reconciliation one-run or recurring scheduling.

### Phase 6.59 One-Run Audit State Verification

- The read-only durable one-run verifier was run with the bounded preflight run ID and reference. It found both durable queues present and fully drained, an existing fresh read model, and no persisted provenance for that preflight ID.
- The verifier returned `status:"incomplete"` with `provenance_audit_missing` and matching-reference/ID reasons, confirming that the preflight did not execute a reconciliation or write an audit row.
- This is the expected safe state before a separately approved run; no runtime flag, scheduler, broker, or order behavior changed.

### Phase 6.60 Guarded Paper Reconciliation Failure Contained

- With explicit approval reference `PAPER-RECONCILIATION-123` and unique run ID `paper-reconciliation-20260823-01`, the guarded one-run command executed once and exited through its generic failure path. No provider, account, SQL, or credential details were emitted.
- The post-run verifier found both queues present and drained, no persisted audit provenance for the run ID, and no completed one-run record. A bounded Railway log query returned zero worker log lines for the observation window, so the failure cause is intentionally not inferred from the redacted command output; the run must not be retried blindly.
- Persistent Railway flags remained safe (`BROKER_CONNECTION_ENABLED=false`; command-scoped handler/scheduler/autopilot flags were not persisted). A follow-up private health probe remained healthy in observe mode with durable/research/shadow schedulers disabled and the global kill switch inactive.
- This is a contained failed attempt, not evidence of successful reconciliation. Any retry requires operator review of the failure and a new explicit approval/reference plus a new unique run ID.

### Phase 6.61 Redacted One-Run Failure Diagnostics

- Added a bounded failure classifier for the one-run command, covering broker HTTP/network errors, timeout, queue-provenance, database constraint/schema, and generic failure categories without logging the original error.
- Added focused tests and verified 189 total tests, typecheck, lint, production build, and secret-surface audit. Railway worker deployment `7e940734-ba4e-4f16-8f72-74672a25ae34` reached `SUCCESS`.
- The diagnostic deployment changes output only; it does not retry the failed run, enable persistent gates, expose credentials, or alter reconciliation semantics.

### Phase 6.62 Stage-Aware One-Run Failure Diagnostics

- Extended the bounded failure output with a lifecycle stage (`queue_start`, `queue_provision`, `database_connect`, `worker_registration`, `job_enqueue`, or `reconciliation`) while preserving error redaction.
- The worker quality gate remained green at 189 tests, typecheck, lint, production build, and secret audit; Railway deployment `195298d5-789d-4fb2-acbe-7e4309400507` reached `SUCCESS`.
- No reconciliation retry or runtime-gate change was performed. The stage output is available for a future separately authorized attempt only.

### Phase 6.63 Approved Retry Queue-Enqueue Diagnosis

- With new approval reference `PAPER-RECONCILIATION-RETRY-123` and unique run ID `paper-reconciliation-retry-20260823-01`, the guarded command executed exactly once and returned only `failure_code=one_run_failed failure_stage=job_enqueue`.
- The read-only verifier found both queues present and drained, no persisted audit provenance for the retry ID, and a pre-existing fresh reconciliation read model; the retry did not complete a reconciliation audit.
- Private worker health remained healthy in observe mode with broker access, durable/research/shadow schedulers, and Paper Autopilot disabled. The command-scoped broker/handler opt-ins were not persisted.
- Added a bounded `queue_enqueue_error` fallback category for future opaque failures at the enqueue boundary; no retry is authorized by this diagnostic change.
- Worker deployment `458e21a5-f6c5-4d28-8e26-1b085de888bd` reached `SUCCESS`; a private health probe remained healthy in observe mode with all recurring and execution gates disabled.

### Phase 6.64 pg-Boss UUID Enqueue Boundary Correction

- Root cause isolated from the `job_enqueue` stage and pg-boss contract: pg-boss job IDs are PostgreSQL UUIDs, but the command had supplied the operator-facing run ID directly.
- Added a deterministic UUID mapping derived from the bounded run ID, preserving idempotency while keeping the original run ID and approval reference in the job payload and audit provenance.
- Added focused UUID format, determinism, and differentiation tests. The change does not enable recurring scheduling, broker access, Paper Autopilot, or any automatic retry.
- Worker deployment `fcc3c0ac-7bbd-4261-8e39-3e6f6f2f9b71` reached `SUCCESS`; private health remained healthy in observe mode and both durable queues remained present and drained.

### Phase 6.65 Durable Queue Payload Validation

- Added runtime validation for pg-boss daily-preparation payloads before they reach reconciliation, checking the exact job kind/version and bounded optional provenance fields.
- Both the recurring daily scheduler and guarded one-run handler now fail closed on malformed or unexpected queue data; valid operator run IDs and approval references remain separate from the UUID job identifier.
- Added focused malformed-payload coverage. No queue, broker, scheduler, or Paper Autopilot activation occurred during this unit.
- Worker deployment `cd9dab8d-cc3a-41c8-8517-c2c8d25dcefd` reached `SUCCESS`; private health remained healthy in observe mode and durable queues remained present and drained.

### Phase 6.66 Hosted Daily-Reconciliation Readiness Recheck

- Railway SSH ran the guarded read-only `daily-reconciliation-readiness` command after the queue payload deployment. Migration `0009` and its audit table/columns remain `ready`; combined daily reconciliation remains safely `disabled` because persistent scheduler, handler, and broker gates are off.
- The private worker health response remains `healthy`/`observe`, with the global kill switch inactive and research, durable, and shadow schedulers disabled. Durable work and dead-letter queues are present and fully drained.
- No queue enqueue, Alpaca read, PostgreSQL reconciliation write, scheduler activation, Paper Autopilot activation, or persistent variable mutation occurred.

### Phase 6.67 Persistent Scheduler Activation Guard

- Persistent `DURABLE_SCHEDULER_ENABLED=true` now requires a bounded non-secret `DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE`; missing or malformed references fail closed in both readiness and startup configuration.
- This reference authorizes the operational scheduler activation only. It does not create per-order approval requirements: paper orders remain governed by deterministic risk/execution checks and the existing paper-only mode gates.
- The hosted scheduler remains disabled; no Railway variable was added or changed in this unit.
- Worker deployment `f0fd4349-c156-4548-ad3d-4660882c432a` reached `SUCCESS`; hosted readiness remains `disabled`, private health is healthy observe mode, and no activation-reference variable is present.

### Phase 6.68 Command-Scoped Scheduler Activation Rehearsal

- Added `daily-reconciliation-activation-preflight`, a read-only rehearsal that overlays the scheduler, handler, and broker gates only in memory and requires a non-secret activation reference.
- The rehearsal combines the simulated scheduler readiness with live migration structure checks but never creates a pg-boss client, enqueues a job, reads Alpaca, writes reconciliation state, or changes Railway variables.
- Paper order approval behavior is unchanged: the activation reference is for persistent scheduler operations, not individual paper orders.
- Worker deployment `c586472f-32f6-4297-89e5-3196c678d688` reached `SUCCESS`; the hosted rehearsal returned `status:"ready"`, while a normal readiness check immediately afterward remained `disabled` and persistent gates were unchanged.

### Phase 6.69 Explicit Activation-Reference Readiness Check

- Durable scheduler readiness now exposes `activationApprovalReferencePresent` as a boolean check alongside the existing broker, handler, database, paper-mode, and scheduler checks.
- Missing or malformed activation references still produce the bounded `scheduler_activation_approval_reference_missing` reason; no reference value is emitted.
- This improves operator/audit visibility without changing activation semantics or requiring approval for individual paper orders.
- Worker deployment `25318526-4866-45ad-969e-55ef885aecdf` reached `SUCCESS`; hosted default readiness reported `activationApprovalReferencePresent:true` with scheduler `disabled`, while the command-scoped rehearsal reported `ready` with the same check true.

### Phase 6.70 Operator Health Activation Visibility

- The authenticated API operations-health contract now carries only the boolean `activationApprovalReferencePresent`; it never returns the reference value.
- The protected dashboard displays a scheduler activation-review state (`Recorded`/`Missing`) alongside scheduler status, allowing operators to distinguish disabled-by-choice from incomplete activation configuration.
- Parsing remains fail-closed for malformed or older responses; no browser authority, scheduler mutation, broker access, or order behavior was added.
- API deployment `e96f4386-5570-4eaf-a490-42f182dc70bf` reached `SUCCESS` and private API health is healthy. Vercel preview deployment was attempted but rejected by the free-tier daily deployment limit; the prior protected preview remains unchanged until quota resets.
- The latest Ready Vercel preview `https://papertrader-l6s6eyyvu-altafrs-projects.vercel.app` returned the expected unauthenticated `302` deployment-protection response for `/dashboard`; no unauthenticated dashboard content was exposed.

### Phase 6.71 Worker Health Activation Visibility

- The private Worker health contract now includes the same boolean `activationApprovalReferencePresent` as the API and dashboard contract; the reference value is never emitted.
- Default-disabled worker health reports the gate as satisfied-by-not-applicable while scheduler `enabled:false`; an enabled scheduler cannot start without the validated reference.
- No scheduler, broker, or Paper Autopilot behavior changed; this is contract alignment and observability only.
- Worker deployment `72f7fc06-3d19-4b3d-833c-3cfc30f3c67d` reached `SUCCESS`; private health reports `activationApprovalReferencePresent:true`, scheduler disabled, and healthy observe mode, while queues remain present and drained.

### Phase 6.72 Paper Autopilot Activation-Reference Alignment

- Paper Autopilot readiness now requires the same bounded scheduler activation reference whenever durable scheduling is enabled, preventing a false `ready` result that would fail at worker startup.
- The check is configuration-only and does not add human approval to individual paper orders; deterministic risk approval, freshness, kill-switch, and paper-mode checks remain mandatory.
- Missing references produce the bounded `scheduler_activation_approval_reference_missing` reason without exposing values.
- Worker deployment `e940dae6-7cf3-4559-98c0-b472bfc3b33e` reached `SUCCESS`; hosted Paper Autopilot readiness is safely `disabled` with paper risk policy valid, and worker health remains healthy observe mode with all activation gates off.

### Phase 6.73 Approval-Free Paper Autopilot Semantics

- Renamed the primary worker execution entry point to `executePaperAutopilotOrder`; the compatibility alias remains internal-safe for existing callers.
- Documented in the order contract that `approval` is a server-generated deterministic risk approval, not a per-order human confirmation or scheduler activation reference.
- Existing execution-time mode, freshness/risk approval, kill-switch, idempotency, broker, and reconciliation checks remain unchanged; Paper Autopilot stays disabled by default.
- The latest successful Worker deployment `1c0b43a2-fbe0-4d86-9fd0-3a22720a0945` is healthy in observe mode; hosted Paper Autopilot readiness remains `disabled` and both queues remain present and drained.

### Phase 6.74 Guarded Telegram Alert Channel Boundary

- Added a server-only Telegram Bot API adapter with disabled-by-default configuration, numeric chat-ID validation, bounded/redacted message formatting, and injected transport tests.
- Added a guarded worker `telegram-alert-test` command requiring a command-scoped non-secret test reference; it emits only generic success/failure output and never logs Telegram credentials or provider responses.
- Raw bot-token-shaped text, credential-like key/value text, URLs, invalid severities, and oversized messages are rejected or redacted at the notification boundary. No Telegram message was sent from this workspace.
- Worker deployment `c83e71c6-4885-4d8b-8858-b3f592a35391` reached `SUCCESS`; private health remains healthy observe mode, queues remain present and drained, and no Telegram variables are configured in Railway.

### Phase 6.75 Durable-Scheduler Alert Wiring

- Wired the disabled-by-default Telegram adapter to durable-scheduler startup and runtime failure callbacks using bounded generic codes/messages (`durable_scheduler_start_failed` and `durable_scheduler_runtime_failed`).
- Notification delivery failures are swallowed at the alert boundary and cannot change scheduler failure semantics; raw exceptions, provider responses, credentials, and account values are never included.
- No Telegram configuration is present in Railway, so no alert was sent and no scheduler/trading behavior changed.
- Worker deployment `19d282d4-cf94-4d93-9f48-e5a6ecdc7340` reached `SUCCESS`; private health remains healthy observe mode, queues are present and drained, and Telegram variables remain absent.

### Phase 6.76 Telegram Alert Readiness

- Added a no-send readiness contract that reports only enablement, configuration presence/format checks, and bounded block reasons; bot tokens and chat IDs are never returned.
- Added a command-scoped worker check requiring `TELEGRAM_ALERT_READINESS=true`; it performs no network request and exits non-zero only when configuration is blocked.
- Railway readiness returned `status:"ready"` without returning secret values; the command made no network request, sent no message, and changed no trading, scheduler, or reconciliation behavior.

### Phase 6.77 Worker Health Alert Readiness

- Extended the private `WorkerHealth` contract with `telegramAlerts.enabled` and a bounded `disabled`/`blocked`/`ready` status.
- The health projection derives readiness from server-side configuration and never returns bot tokens, chat IDs, provider responses, or message content.
- This is observational only: it does not enable delivery, contact Telegram, change scheduler/trading gates, or alter Paper Autopilot behavior.
- Worker deployment `92a03701-6ae4-43f3-8e3b-114ecbe71d63` reached `SUCCESS`; private `/health` returned healthy observe mode with `telegramAlerts:{enabled:true,status:"ready"}`, broker/schedulers/Paper Autopilot disabled, and both durable queues present and drained.

### Phase 6.78 Authenticated Dashboard Alert Readiness

- Added the same bounded Telegram readiness metadata to the authenticated API operations-health response and dashboard health card.
- The browser receives only `enabled` plus `disabled`/`blocked`/`ready`; no bot token, chat ID, provider response, message content, or control action is exposed.
- The dashboard remains observational and cannot enable alerts, send a test, change trading mode, activate schedulers, or modify risk policy.
- API deployment `43f841c9-b29a-4f00-bbea-8f54925575af` reached `SUCCESS` and private API health returned healthy. Vercel preview `https://papertrader-iti0ribm2-altafrs-projects.vercel.app` completed successfully; unauthenticated dashboard access returned the expected deployment-protection HTTP 302.

### Phase 6.79 Telegram Delivery Verification State

- Added an explicit non-secret `deliveryVerification:"unverified"` field to notification readiness, worker health, API operations health, and dashboard parsing.
- Configuration readiness remains separate from proof of message delivery; the dashboard labels delivery unverified until a separately approved channel test succeeds and is recorded.
- No Telegram request, database write, trading action, scheduler activation, or Paper Autopilot change was added in this phase.
- Worker deployment `16f62475-ce15-41af-95da-dcff198aded3` and API deployment `04e7081d-08d7-4b7d-bb8e-b5ff739652d7` reached `SUCCESS`; private health is healthy, worker queues are present and drained, and Vercel preview `https://papertrader-huj93av8q-altafrs-projects.vercel.app` remains deployment-protected.

### Phase 6.80 Telegram Channel-Test Preflight

- Added a guarded `telegram-alert-test-readiness` command requiring `TELEGRAM_ALERT_TEST_READINESS=true`; it validates the bounded non-secret approval reference and Telegram configuration without contacting Telegram.
- The preflight reports only boolean/configuration readiness and bounded reason codes; it never returns credentials, sends a message, writes PostgreSQL, or changes any activation gate.
- A real channel test remains separately guarded by `TELEGRAM_ALERT_TEST=true` and requires explicit operator authorization.
- Worker deployment `4e06994a-ca98-428a-ade9-8ea32a9e9cab` reached `SUCCESS`; hosted preflight correctly blocked without a reference and returned `ready` with a synthetic bounded reference, while queues remained present and drained. No Telegram request occurred.

### Phase 6.81 Daily UTC Schedule Observability

- Extended private `WorkerHealth.durableScheduler` with the configured cron expression and explicit `UTC` timezone.
- The health response reports the daily schedule even when the durable scheduler is disabled, allowing operators to verify the intended server-side cadence without activating a queue or handler.
- This is observational only; no Railway flag, queue, broker read, reconciliation write, or Paper Autopilot behavior changed.
- Worker deployment `23908ee8-7107-4fd1-96a2-7098cd458f56` reached `SUCCESS`; private health reports `cron:"0 0 * * *"` and `timezone:"UTC"` with the scheduler disabled, and both queues remain present and drained.

### Phase 6.82 Authenticated Daily Schedule Visibility

- Added the daily preparation cron expression and explicit `UTC` timezone to the authenticated API operations-health scheduler contract and dashboard card.
- Browser parsing rejects missing, empty, oversized, or non-UTC schedule metadata; the dashboard displays the cadence as informational text beside scheduler status.
- No scheduler, queue, broker, database, or trading authority was added; persistent activation gates remain unchanged.
- API deployment `e80538d6-637e-4df4-82da-700dddab04db` reached `SUCCESS` and private API health returned healthy. Vercel preview `https://papertrader-jqdkttgif-altafrs-projects.vercel.app` completed; unauthenticated dashboard access remains deployment-protected with HTTP 302.

### Phase 6.83 Centralized Daily Schedule Contract

- Moved the default daily cron and UTC timezone into the shared server configuration package; worker and API now consume the same validated cron helper and timezone constant.
- Invalid empty or oversized cron values fail at the configuration boundary; the dashboard parser remains fail-closed for malformed schedule metadata.
- This is configuration alignment only. No scheduler activation, queue operation, broker request, database write, or trading authority was added.

### Phase 6.84 Daily Handler Gate Visibility

- Added the daily preparation handler gate to the dashboard operations-health card alongside scheduler status, schedule cadence, and broker read gate.
- This prevents a disabled handler from being mistaken for a fully activated daily workflow; the card remains observational and has no controls.
- No scheduler, queue, broker, database, or trading behavior changed.
- Vercel preview `https://papertrader-93lkx2zng-altafrs-projects.vercel.app` completed successfully; unauthenticated dashboard access remains deployment-protected with HTTP 302.

### Phase 6.85 Telegram Test-Preflight Visibility

- Added non-secret Telegram channel-test preflight metadata to authenticated API operations health and the dashboard.
- The dashboard shows only `Ready`/`Blocked`, a boolean approval-reference-presence flag remains server-side, and no reference value or send control is exposed.
- This is observational only; the real Telegram test remains separately guarded and delivery remains unverified.
- API deployment `c148935e-7ac7-4b73-811b-9eb3ffa334ff` reached `SUCCESS` and private API health returned healthy. Vercel preview `https://papertrader-2h7vwewgb-altafrs-projects.vercel.app` completed; unauthenticated dashboard access remains deployment-protected with HTTP 302.

### Phase 6.86 Worker/API Telegram Preflight Consistency

- Extended private `WorkerHealth` with the same bounded Telegram test-preflight status used by API operations health: approval-reference presence plus `blocked`/`ready`.
- Neither surface returns the reference value, credentials, provider response, or send authority; delivery remains explicitly unverified.
- This is observational contract alignment only and does not contact Telegram or change any scheduler/trading gate.
- Worker deployment `54a1858e-0c36-409a-a7a1-806bbd0532d6` reached `SUCCESS`; private health reports Telegram test preflight `blocked` with no approval reference, while observe mode, disabled scheduler gates, and drained queues remain safe.
- Worker deployment `d30ac49d-9846-42c2-b146-5f8cf9dd0fec` and API deployment `640a2429-d1c0-4b78-9687-5be739ab798e` reached `SUCCESS`; worker/API health is healthy, queues are present and drained, and Vercel preview `https://papertrader-3th8iyjvs-altafrs-projects.vercel.app` remains deployment-protected.

### Phase 6.87 Unique Retry-Provenance Preflight

- Added a read-only retry-readiness contract and guarded worker command that checks the proposed approval reference and run ID are bounded, distinct, and absent from persisted one-run audit provenance before a future retry is attempted.
- Added a repository lookup by approval reference so a previously consumed approval cannot be reused with a different run ID; output contains only booleans and bounded reason codes.
- This command does not enqueue work, start a queue, contact Alpaca or Telegram, write PostgreSQL, alter Railway variables, or enable scheduling/Paper Autopilot. It specifically blocks reuse of the previously consumed retry reference.

### Phase 6.88 Idempotent Queue Reuse for Guarded Reconciliation

- Updated the one-run command to require the reviewed work and dead-letter queues to be present and reuse them without attempting queue creation; queue provisioning remains exclusively in the separately guarded migration command.
- This removes a redundant queue-creation failure from the one-run path while preserving the durable queue boundary and all command-scoped broker/handler gates. Missing queues fail closed with a bounded migration message.
- Added focused coverage for the no-reprovision path. No scheduler activation, Telegram send, order submission, or live capability was added.

### Phase 6.89 First Verified Paper End-to-End Slice

- After the queue-boundary correction, the guarded Worker command completed exactly one paper reconciliation using approval reference `PAPER-RECONCILIATION-RETRY-124` and run ID `paper-reconciliation-retry-20260824-01`.
- The read-only verifier confirmed persisted audit provenance, a fresh reconciliation captured at `2026-08-24T00:41:10.115Z`, both durable queues present and drained, and no dead-letter jobs. The public API health endpoint returned healthy; persistent broker, scheduler, handler, and Paper Autopilot flags remain disabled.
- This proves the Railway Worker → PostgreSQL reconciliation path. The authenticated Vercel dashboard remains the next operator-observed verification surface; no dashboard credentials or broker secrets were exposed.

### Phase 6.90 Daily-Run Result Visibility

- Added a read-only latest durable-run audit query and exposed bounded `dailyReconciliation` status/capture metadata through authenticated Operations Health.
- The dashboard now shows whether a completed daily run exists and when its persisted snapshot was captured, alongside reconciliation freshness; no approval reference, run ID, account value, or credential is exposed in this new card.
- Added strict browser contract validation and tests. This remains observational and cannot start a queue, contact Alpaca, change flags, or submit orders.
- API deployment `6037be24-09de-489a-a3e7-2edf05dec855` reached `SUCCESS`; Vercel production deployment `dpl_Ch1McJGMxPc8NzCBdQjRwFYrfmbJ` is `Ready` at `https://papertrader-j16kyb2o1-altafrs-projects.vercel.app`. The API health endpoint is healthy and unauthenticated Operations Health correctly returns `401`.

### Phase 6.91 Daily Activation Rehearsal

- Ran the guarded `daily-reconciliation-activation-preflight` in Railway with command-scoped scheduler, handler, broker, and activation-reference values.
- The rehearsal returned `status:"ready"`: migration `0009`, audit table/columns, database, paper credentials, paper mode, broker gate, handler gate, scheduler gate, and activation reference all passed.
- No persistent Railway variable changed, no queue started, no Alpaca request or reconciliation ran, and Paper Autopilot/live trading remain disabled. Recurring activation still requires separate explicit operator approval.

### Phase 6.92 Activation and Rollback Runbook Hardening

- Updated the Railway reconciliation runbook to match the current one-run behavior: it verifies existing queues rather than reprovisioning them.
- Added a separate recurring-scheduler activation checklist and fail-closed rollback procedure covering the activation reference, broker/handler/scheduler flags, Paper Autopilot prohibition, Worker restart, health evidence, and preservation of audit/queue data.
- Documentation-only safety improvement; no Railway variable, queue, broker, Telegram, or trading state changed.

### Phase 6.93 Read-Only Scheduler Queue Activation Guard

- Changed recurring scheduler startup to require the existing reviewed work/dead-letter queues instead of attempting queue-schema creation; missing queues fail closed with a bounded migration message.
- The guarded one-run path uses the same read-only queue requirement, keeping queue provisioning exclusively in the separate migration command.
- Verified 208 tests, build, typecheck, lint, secret-surface audit, and diff checks. Worker deployment `0712ec60-a46f-438c-958a-5eaa6193466f` reached `SUCCESS`; hosted queue status remains present and fully drained, with persistent scheduler/handler/broker/Paper Autopilot gates unchanged.

### Phase 6.94 Recovery Runbook

- Added [`docs/railway-recovery-runbook.md`](docs/railway-recovery-runbook.md) covering Railway PostgreSQL backups/PITR, off-platform logical dumps, isolated restore drills, service-variable recovery, queue/migration verification, paper reconciliation after restore, and fail-closed rollback.
- The runbook explicitly distinguishes documented procedure from completed backup/restore evidence; no backup setting, database, Railway variable, scheduler, broker, Telegram, or trading state was changed.

### Phase 6.95 Railway PITR Audit

- Read-only Railway CLI inspection confirmed the PostgreSQL volume is `Ready`, but PostgreSQL point-in-time recovery is currently `enabled:false` and `bucketWired:false`.
- PITR enablement is an operator/infrastructure decision with storage and cost implications; it was not changed by this phase. The recovery runbook remains accurate but its backup/PITR acceptance gate is not yet passed.

### Phase 6.96 Recovery Verification Visibility

- Added an operator-recorded `RECOVERY_DRILL_VERIFIED` contract, defaulting to `unverified`, and exposed it as bounded recovery status in authenticated Operations Health and the dashboard.
- The status cannot be inferred from a database connection, volume presence, or deployment health; it must be set only after the documented PITR/restore evidence exists.
- Verified 209 tests, build, typecheck, lint, secret-surface audit, and diff checks. No Railway variable, PITR setting, database, queue, broker, scheduler, Telegram, or trading state changed.
- API deployment `392decbc-015d-4fd0-a75b-a6f6fb4aef72` reached `SUCCESS`; Vercel production deployment `dpl_NAt8esJQUk5aNxiQapUBx2s7TmTw` is `Ready`. Hosted recovery status remains unverified because PITR is disabled and no restore drill has been recorded.

### Phase 6.97 Auditable Recovery Verification Contract

- Tightened recovery verification so `RECOVERY_DRILL_VERIFIED=true` counts only with a bounded `RECOVERY_DRILL_APPROVAL_REFERENCE` and valid UTC `RECOVERY_DRILL_VERIFIED_AT`; missing or malformed evidence remains `unverified`.
- Added focused configuration coverage. No hosted variable, PITR setting, database, scheduler, queue, broker, Telegram, or trading state changed.
- API deployment `471f72e5-8c1a-4b94-9370-b4d3732c7f39` reached `SUCCESS`; hosted recovery remains `unverified` because the required evidence variables are unset.

### Phase 6.98 Guarded Recovery Readiness Command

- Added `pnpm --filter @momentum/worker recovery-readiness`, a no-database/no-queue command that emits only the recovery evidence booleans and `verified`/`unverified` status.
- It requires `RECOVERY_READINESS=true` and exits non-zero until the explicit flag, bounded reference, and UTC timestamp satisfy the shared contract.
- Verified 209 tests, typecheck, lint, build, secret-surface audit, and diff checks. No hosted variable or infrastructure state changed.
- Worker deployment `02b6a8bd-7f6e-4ff3-988f-9f365958889b` reached `SUCCESS`; hosted `recovery-readiness` returned `status:"unverified"` with approval-reference, timestamp, and verified-flag checks all false, as expected.

### Phase 4.1 Structured Agent Runs

- `packages/domain/src/agent-runs.ts` defines versioned, structured agent-run requests and artifacts for the orchestrator, stock/crypto research, macro advisory, strategy, risk explanation, execution, and reconciliation roles.
- The in-process run store enforces `queued → running → succeeded|failed`, immutable snapshots, unique run IDs, timestamp ordering, concise rationale, evidence references, and redacted failure codes.
- The deterministic orchestrator dispatches only registered handlers and validates returned artifacts. It does not call an LLM, broker, database, or order method; model/provider and prompt-template fields are provenance metadata only.

### Phase 4.2 Read-Only Research Agents

- `packages/domain/src/research-agents.ts` adds deterministic stock and crypto research handlers that consume fresh, validated Alpaca bar inputs and produce bounded momentum watchlist artifacts.
- Each artifact carries the asset class, capture time, source evidence reference, average volume, point-in-time return, and source-bar timestamp. Candidate output is capped at 20 symbols and is explicitly research evidence, not an order recommendation.
- Invalid/stale input, non-positive prices/volumes, and malformed timestamps fail closed. The handlers have no credentials, persistence, strategy-stage, risk, or order authority and remain disabled until a later worker/API wiring unit.

### Phase 4.3 Agent-Run Persistence and Read View

- `packages/db/migrations/0008_agent_runs.sql` and the matching Drizzle schema persist agent-run provenance, lifecycle status, redacted error codes, and structured artifact metadata/payloads with status and non-empty-field constraints.
- `createAgentRunRepository` enforces queued → running → succeeded/failed updates and bounded recent-run queries. Migration application remains a controlled operation; application startup never migrates automatically. Railway has now applied migration `0008` through that guarded process.
- Authenticated `GET /v1/agent-runs?limit=50` returns recent run metadata, statuses, timestamps, input references, and artifact provenance. It intentionally omits artifact rationale and payload contents from this read view to keep the operational surface bounded.
- No agent is invoked automatically by this unit. The endpoint has no broker, order, risk-approval, or configuration mutation authority and fails closed when `DATABASE_URL` or Clerk authentication is unavailable.

### Phase 4.4 Macro Advisory and Economic Events

- `packages/domain/src/macro-advisory.ts` defines validated economic-event records and a deterministic macro-advisory artifact with bounded horizon, source references, and explicit `high_impact_event_near`/`source_data_sparse` flags.
- The artifact is advisory context only. It does not infer sentiment, change a risk policy, approve/reject a signal, or submit an order; stale, malformed, or over-large event input fails closed.

### Phase 4.5 Guarded Research Run Once

- `apps/worker` exposes `research-run-once`, guarded by `RESEARCH_RUN_ONCE=true`, explicit bounded JSON input, and the reviewed agent-run repository. It supports one stock, crypto, or macro artifact and exits after persistence.
- The command is disabled by default, does not fetch data, and does not invoke an LLM. Future provider/Alpaca adapters must supply validated inputs through this boundary; no agent result can approve risk or submit an order.
- Handler failures persist only `research_handler_failed`, while the command emits generic success/failure output. Hosted use requires the `0008_agent_runs.sql` migration and a separately reviewed operator invocation.

### Phase 4.6 Hosted Agent-Run Schema Readiness

- Worker deployment `c8db3f78-e562-451d-bbf6-6ad93c092f6f` reached `SUCCESS` with the Phase 4.5 command boundary.
- The guarded Railway migration reported `appliedThrough=0008` and `migrationCount=8`. No research fixture was inserted, no broker request was made, and persistent scheduler/handler/Paper Autopilot flags remain disabled.

### Phase 4.7 Agent Health Dashboard View

- The authenticated dashboard reads `GET /v1/agent-runs?limit=20` and displays recent agent type, task, status, creation time, and artifact provenance metadata.
- The browser parser rejects malformed run/status/reference data and the UI never displays artifact payload or rationale. Unavailable API/authentication produces an explicit degraded state.
- This is a read-only observation surface; it cannot invoke agents, change configuration, approve risk, or submit orders.

### Phase 4.8 Agent-Run Detail Boundary

- Authenticated `GET /v1/agent-runs/:runId` returns one stored run and its bounded artifact detail for operator inspection.
- The API validates run IDs, limits nested payload depth/entries/string size, redacts secret-like keys, truncates rationale, and omits incomplete artifact details. Unknown runs return a redacted not-found response.
- This endpoint is read-only and does not execute agents, expose credentials, contact providers, approve risk, or submit orders.

### Phase 4.9 Guarded Paper Market Research Source

- `apps/worker/src/research-market-source.ts` maps the existing server-only Alpaca paper historical-bars adapter into validated stock/crypto research inputs with bounded symbols, timeframes, limits, and candidate counts.
- The `research-market-run-once` command requires command-scoped `RESEARCH_MARKET_RUN_ONCE=true`, paper runtime, explicit broker opt-in, server credentials, `DATABASE_URL`, and migration `0008`; it reads bars once, persists one agent run, and exits.
- The source and command are disabled by default and never submit orders, approve risk, start a scheduler, or expose credentials. Hosted execution remains a separately approved paper read/write operation.

### Phase 4.10 Research Schedule Readiness Boundary

- `apps/worker/src/research-scheduler.ts` defines the disabled-by-default daily research queue identity, UTC cron default, bounded retry settings, deterministic manual job identity, and a redacted readiness assessment.
- Enabling the research schedule requires paper mode, a configured PostgreSQL connection, explicit broker read opt-in, paper credentials, and an explicitly enabled research handler. Malformed paper-mode values fail closed; readiness reports only safe reason codes and never returns credentials.
- Worker health exposes `researchSchedule` with enabled/handler-enabled flags and `disabled`/`blocked`/`ready` status. This unit does not provision queues, invoke handlers, or start recurring research; those remain a separate reviewed activation and implementation step.

### Phase 4.11 Research-Preparation Queue Boundary

- The research scheduler now defines a separate work/dead-letter queue contract, bounded `pg-boss` queue options, and an idempotent UTC manual enqueue identity independent of daily reconciliation.
- Queue payloads are validated as versioned `{ kind: "research_preparation", version: 1 }` jobs before an injected preparation runner can execute them. Invalid payloads fail closed; the runner has no implicit broker, order, risk, or configuration authority.
- Queue provisioning/enqueue/handler functions are library boundaries only. The worker does not start this queue or enable its recurring cron while `RESEARCH_SCHEDULER_ENABLED` and `RESEARCH_HANDLER_ENABLED` remain disabled.

### Phase 4.12 Deterministic Research-Preparation Planner

- `apps/worker/src/research-preparation.ts` validates explicit stock and crypto symbol lists, approved timeframes, bar limits, and candidate limits, then creates one bounded plan per asset class.
- The preparation executor reads validated fresh market input through an injected source, constructs a versioned agent-run request, dispatches the deterministic stock/crypto handler, and hands lifecycle persistence to the existing repository boundary.
- The planner has no default universe, no LLM dependency, and no order/risk authority. It remains callable only from a future explicitly enabled queue handler; no hosted input read or persistence write was performed.

### Phase 4.13 Gated Research-Preparation Queue Handler

- `createResearchPreparationQueueHandler` composes the readiness check, explicit preparation configuration, two-asset-class plan, injected market-data source, deterministic agents, and existing agent-run persistence lifecycle.
- The handler rejects the queue job before source access unless every research gate reports `ready`; it processes stock and crypto plans sequentially and returns only bounded run statuses/IDs.
- This is composition code, not activation: the worker does not register the handler with `pg-boss`, enable the research cron, or run hosted market-data calls while the persistent gates remain disabled.

### Phase 4.14 Gated Research Scheduler Registration

- `createResearchScheduler` registers the research queue, UTC cron, and validated job handler only after `getResearchScheduleReadiness` returns `ready`; blocked environments never create a queue client.
- Queue lifecycle failures and handler failures set a bounded runtime health state (`scheduled`, `running`, `degraded`, or `disabled`) and stop the client after startup failure. The schedule uses a stable key and bounded retry/dead-letter settings.
- This registration is an opt-in library boundary. The deployed worker still does not instantiate it while `RESEARCH_SCHEDULER_ENABLED=false`; no hosted queue or market-data action was performed.

### Phase 4.15 Research Scheduler Runtime Health

- `WorkerHealth.researchSchedule` now includes optional last/next run timestamps and runtime states for `scheduled`, `running`, `degraded`, and `disabled`, while retaining `blocked` for readiness failure.
- `apps/worker/src/app.ts` combines static readiness with scheduler runtime state: an enabled but not-yet-started, fully gated scheduler reports `ready`; blocked configuration reports `blocked`; runtime failures remain visible as `degraded` without exposing queue details or credentials.
- The `/health` response remains read-only. No scheduler is instantiated by this change and no Railway persistent flag or external service state changes.

### Phase 4.16 Guarded Worker Startup Composition

- `research-scheduler-runtime.ts` composes the paper market-data reader, PostgreSQL agent-run repository, deterministic preparation handler, and gated scheduler factory only when `RESEARCH_SCHEDULER_ENABLED=true` and readiness is complete.
- `apps/worker/src/index.ts` invokes that composition at startup behind the existing fail-closed check. With the default disabled flag, no database client, Alpaca reader, queue client, or scheduler is constructed for research.
- Startup failures are contained in the scheduler promise so the worker health endpoint can report degraded state; no live endpoint, order path, risk override, or persistent variable mutation is introduced.

### Phase 4.17 Guarded Research Readiness Verification

- `pnpm --filter @momentum/worker research-readiness` is guarded by `RESEARCH_SCHEDULE_READINESS=true` and prints only boolean checks, safe reason codes, and `disabled`/`blocked`/`ready` status.
- The command never constructs a database/broker client, starts a scheduler, reads market data, or writes state. It exits non-zero only when the scheduler is explicitly enabled but blocked.
- CI runs the command with the default environment, proving the repository remains safely `disabled` without requiring credentials or hosted services.

### Phase 4.18 Hosted Research Readiness Evidence

- Deployed worker `5290f522-99da-4b71-b1bf-2e2b4d9f8c86` reached `SUCCESS` through the Railway CLI using the tested revision.
- Railway SSH ran the guarded `research-readiness` command successfully: status was `disabled`; `databaseConfigured` and `paperCredentialsConfigured` were true; `paperMode` was true; broker, handler, and scheduler gates were false.
- A separate server-side flag classification confirmed `BROKER_CONNECTION_ENABLED=false`; research/durable scheduler and handler flags were unset; `PAPER_AUTOPILOT_ENABLED` was unset. No secret values were printed and no market-data, database-write, scheduler, or order operation was performed.

### Phase 4.19 Separate Research Run Approval Guard

- `research-market-run-once` now requires both `RESEARCH_MARKET_RUN_ONCE=true` and a separate command-scoped `RESEARCH_MARKET_OPERATOR_APPROVAL=true`, plus a bounded non-secret `RESEARCH_MARKET_APPROVAL_REFERENCE`.
- The guard runs before paper credentials, database, or market-data clients are constructed. Invalid, missing, or unsafe references fail closed without revealing values.
- [`docs/railway-research-runbook.md`](docs/railway-research-runbook.md) documents the future one-run process. No hosted research command was executed in this unit.

### Phase 4.20 Hosted Research Preflight

- `research-market-preflight` validates the separate approval/reference, paper-only runtime, explicit broker/database prerequisites, agent type, symbol count, timeframe, bar limit, and candidate bound without constructing Alpaca, PostgreSQL, or queue clients.
- It prints bounded metadata only and is a required local/hosted step before `research-market-run-once`; malformed or incomplete configuration fails closed.
- The preflight does not read market data, write agent runs, start a scheduler, or submit orders. Hosted research execution remains pending explicit operator approval.

### Phase 4.21 Research Approval Provenance

- The guarded one-run command now adds `operator-approval:<reference>` alongside the market-data evidence reference in the persisted `agent_runs.input_refs` field.
- The reference is bounded and non-secret; credentials and account values are never placed in provenance. This gives a future hosted artifact an auditable link to the approved run without granting approval authority to the artifact itself.
- No hosted command was executed for this change; the persisted write remains behind the separate approval guard and paper/broker/database gates.

### Phase 4.22 Read-Only Research Run Verification

- `research-run-verify` loads one persisted agent run by ID and returns only bounded metadata after checking succeeded status, artifact presence, supported agent type, and the expected approval provenance.
- The command is guarded by `RESEARCH_RUN_VERIFY=true`, uses PostgreSQL read-only repository methods, never contacts Alpaca, and prints no artifact payload, rationale, account value, or credential.
- It exists to close out a future approved hosted run; no run ID is currently verified by this command.

### Phase 4.23 Latest-Run Research Verification

- The read-only verifier can now select the most recent supported stock/crypto run carrying the requested approval reference when `RESEARCH_RUN_ID` is omitted; an explicit ID remains supported for deterministic checks.
- Selection is bounded to the latest 100 persisted runs and returns the same metadata-only success contract. No artifact payload or rationale is loaded into output.

### Phase 4.24 Hosted Research Tooling Deployment

- Worker deployment `9467848b-f63a-4598-a783-2bc65c65715c` reached `SUCCESS` through the Railway CLI with the tested research tooling.
- Railway SSH verified `research-readiness` as `disabled` with database/paper credentials configured and broker, handler, and scheduler gates off. A command-scoped hosted preflight returned bounded paper configuration metadata for one stock symbol without constructing a market-data or database client.
- No hosted research run, agent-run write, queue start, persistent variable change, or order action occurred.

### Phase 4.25 Deterministic Market-Bar Integrity

- The paper market-data source now rejects fewer-than-two bars, unrequested symbols, invalid/future timestamps, per-symbol out-of-order bars, non-positive OHLCV values, and inconsistent OHLC ranges before producing `ResearchAgentInput`.
- The source accepts an injected clock for deterministic tests and captures the validated source time; the existing research handlers remain responsible for their own artifact-level validation.
- These checks are read-only and fail closed. They do not alter broker requests, submit orders, write database state, or enable scheduling.

### Phase 4.26 Duplicate Market-Bar Rejection

- The integrity boundary distinguishes exact duplicate timestamps from older out-of-order rows, producing explicit safe failure categories for operator diagnosis.
- Both cases remain fail-closed before agent input creation; no provider payload or credential is emitted.

### Phase 4.27 Market-Bar Integrity Deployment

- Worker deployment `440f6de2-6d34-4661-9d90-547f4fd18ce9` reached `SUCCESS` with the tested integrity checks.
- Railway SSH readiness remains `disabled` with paper mode/database/paper credentials configured and broker, handler, and scheduler gates off. No hosted market-data request or artifact write was made.

### Phase 6.13 Dashboard Operations Health Surface

- The authenticated dashboard consumes only the redacted `/v1/operations-health` response and displays reconciliation freshness plus scheduler, broker-read, and Paper Autopilot gates.
- Invalid or unavailable health data is shown as unavailable/degraded; the dashboard never fabricates account or performance values and has no control authority.

### Phase 6.8 Guarded Application Schema Migration

- Added a one-shot application migration runner with an explicit ledger and per-file transactions, separate from `pg-boss`'s own schema migration.
- The runner applies only the reviewed files under `packages/db/migrations`, skips recorded versions, and rolls back a failed file before exiting.
- It is paper-only and has no broker, scheduler, or order authority.

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

Position sizing must reject any intent whose estimated loss at the planned stop, including estimated fees and slippage, exceeds `5%` of invested notional, and reject long stops more than 5% below entry. The initial paper-account equity baseline is `USD 100,000` and must be reconciled before Paper Autopilot can start.

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
