# Progress Tracker

## Snapshot

- **Phase:** Phase 6.397 — First natural broker-reconciled paper order.
- **Status:** The hosted Worker completed a natural 15:45 UTC crypto cycle and recorded an approved BTC/USD decision with `executionStatus: reconciled` after the conservative `0.001` sizing override. Continuous paper trading is now evidenced end to end for this cycle; the 30-day paper-forward evidence window and authenticated dashboard verification remain ongoing.
- **Current operating mode:** Paper Autopilot; continuous order submission enabled behind deterministic risk, freshness, reconciliation, and kill-switch gates.
- **Current goal:** Verify the first natural paper research/order cycle and authenticated dashboard portfolio/position rendering, then continue the 30-day paper-forward evidence gate.
- **Last updated:** 2026-08-28.

### Phase 6.396 — Conservative hosted crypto sizing and operator-surface correction (2026-08-28)

- [x] Review the rejected one-unit BTC/USD candidate against the configured 100,000 USD paper baseline and crypto exposure policy.
- [x] Set `PAPER_AUTOPILOT_CRYPTO_QUANTITY=0.001` in Railway production; no risk limit or live-trading setting changed.
- [x] Confirm the resulting Worker deployment `75d88b82-ffc8-425c-b928-ef0a2426e538` reached `SUCCESS`.
- [x] Correct the public landing page so its execution-gate description matches the enabled Paper Autopilot runtime.
- [x] Observe the 15:45 UTC scheduled cycle and confirm an approved BTC/USD decision with `executionStatus: reconciled`.
- [ ] Run the web build with the hosted/bundled Node runtime; the local Node 22.9.0 is below pnpm's required 22.13 minimum.

### Phase 6.397 — First natural broker-reconciled paper order (2026-08-28)

- [x] Confirm Worker health advanced `lastRunAt` to `2026-08-28T15:45:11Z` and scheduled the next tick for `16:00 UTC`.
- [x] Confirm the crypto research agent produced one bounded BTC/USD candidate.
- [x] Confirm deterministic risk approved the candidate with no rejection reasons.
- [x] Confirm the structured risk-cycle record reports `executionStatus: reconciled` and intent `intent:BTC_USD:2026-08-28T15:00:00Z`.
- [x] Confirm no duplicate candidate or second order was submitted in the cycle.
- [ ] Verify the resulting live position and P/L through the authenticated dashboard/read model.
- [ ] Continue the 30-day stable paper-forward evidence window.

### Phase 6.398 — Dashboard build verification and publication (2026-08-28)

- [x] Run the web typecheck and production build with Node `v24.15.0` / pnpm `11.22.0`.
- [x] Run the complete repository suite: 80 test files and 317 tests passed; all eight workspace typechecks passed.
- [x] Push the corrected dashboard source to the active GitHub branch.
- [x] Publish the verified dashboard to Vercel production after the quota reset; deployment is `Ready` at `https://papertrader-web.vercel.app`.
- [x] Verify the public landing route returns HTTP 200 and `/dashboard` redirects to the configured Clerk sign-in boundary.
- [ ] Verify authenticated dashboard rendering against the reconciled BTC/USD position and P/L.

### Phase 6.399 — Hosted surface configuration verification (2026-08-28)

- [x] Confirm Vercel production deployment is `Ready` and serving the `papertrader-web.vercel.app` alias.
- [x] Confirm Vercel has the Clerk publishable/secret/operator variables and `NEXT_PUBLIC_API_BASE_URL` configured in Preview and Production (values remain encrypted and undisclosed).
- [x] Confirm the public dashboard route returns HTTP 307 to the Clerk sign-in boundary when unauthenticated.
- [x] Confirm Railway API health returns `healthy` and the Worker health remains Paper Autopilot, scheduled, connected, and position-management ready.
- [ ] Verify authenticated read-model rendering and position/P&L values with an operator browser session.

### Phase 6.400 — Post-entry position-management evidence (2026-08-28)

- [x] Confirm the Worker remains healthy at `2026-08-28T15:50Z` with the crypto stream connected and the next research tick scheduled for `16:00 UTC`.
- [x] Confirm position-management passes continue every 60 seconds with no exit submitted and no blocked readiness reason.
- [x] Confirm the reconciled entry increased the persisted/managed position count from two to three in the hosted position-management log.
- [ ] Verify the new BTC/USD position's quantity, mark, unrealized P/L, and originating intent in the authenticated dashboard.
- [ ] Continue observing deterministic exit handling and reconciliation across subsequent cycles.

### Phase 6.401 — Position symbol observability (2026-08-28)

- [x] Extend the bounded position-management pass log with up to ten managed symbols.
- [x] Preserve the credential-free, backward-compatible log shape when no symbols are supplied.
- [x] Add regression coverage for symbol reporting and run the worker typecheck/focused test gate (317 tests passed).
- [x] Deploy Worker revision `5b39dd9e9166ec57190f42ed70185880e9d54a40`; Railway deployment `674e7458-bbb8-44e3-ae15-4b7ff187b544` reached `SUCCESS`.
- [x] Verify the next hosted pass remained healthy and emitted bounded managed-symbol evidence (`AAPL`) with three persisted positions.

### Phase 6.402 — Unmanaged-position safety alert (2026-08-28)

- [x] Detect persisted positions that have no stored deterministic exit plan instead of silently excluding them from management.
- [x] Emit a bounded structured `unmanaged_position_detected` record and one critical, 24-hour-deduplicated Telegram review alert per asset.
- [x] Keep unmanaged positions fail-closed: no automatic order is submitted until an exit plan is present.
- [x] Add regression coverage; focused worker tests pass with 318 total tests.
- [x] Deploy Worker revision `506b6d57498b272ed9f2bd8b5c362452e4a520f8`; deployment `33685302-dbd3-4e30-90ae-3daa52ea27db` reached `SUCCESS`.
- [x] Verify the hosted Worker emitted `unmanaged_position_detected` for `BTCUSD` and `PFD`, while continuing to manage only the position with a stored plan (`AAPL`); no exit order was submitted.

### Phase 6.403 — Dashboard unmanaged-position visibility (2026-08-28)

- [x] Include exit-plan metadata in authenticated operator trade decisions without exposing credentials or provider payloads.
- [x] Mark each live position as `Active` or `Review required` based on the stored deterministic plan.
- [x] Add an explicit dashboard warning listing positions that are fail-closed due to missing exit plans.
- [x] Verify API and web typechecks plus the full 318-test suite.
- [x] Deploy the API change to Railway; deployment `64dc342e-8fad-4ee3-885e-cce09ce30e5f` reached `SUCCESS` and API health remains `healthy`.
- [ ] Publish the web change to Vercel after the provider's free daily deployment quota resets (current response: `api-deployments-free-per-day`).
- [ ] Verify the authenticated dashboard warning against `BTCUSD` and `PFD`.

### Phase 6.404 — Authoritative unmanaged-position read model (2026-08-29)

- [x] Compute unmanaged positions in the authenticated API from the latest persisted account snapshot and exit-plan metadata, independent of paged audit history.
- [x] Validate and expose only bounded asset-class/symbol state to the browser.
- [x] Update dashboard management labels and warning banner to use this authoritative field.
- [x] Verify API/web typechecks and the complete 318-test suite.
- [x] Deploy the API change to Railway; deployment `f4621f9a-75af-47ba-bb02-01ac60e795f0` reached `SUCCESS` and API health remains `healthy`.
- [ ] Publish the web change and verify the authenticated dashboard displays `BTCUSD` and `PFD` as review-required.

### Phase 6.405 — Hosted fail-closed enforcement continuity (2026-08-29)

- [x] Confirm the deployed Worker remains healthy on revision `e01d814287dfe518cea4b0357ae1da51a26c8fa4`.
- [x] Confirm position management continues every 60 seconds with three persisted positions and only `AAPL` managed by a stored plan.
- [x] Confirm `BTCUSD` and `PFD` continue to emit bounded unmanaged-position warnings with zero automatic exits submitted.
- [ ] Publish the matching web revision after Vercel's deployment quota resets and verify the authenticated warning UI.

### Phase 6.406 — Unmanaged-position log severity (2026-08-29)

- [x] Classify `unmanaged_position_detected` records as structured `warn` events while preserving bounded symbols and fail-closed behavior.
- [x] Add regression coverage and pass the full 318-test suite plus Worker typecheck.
- [x] Deploy Worker revision `ecb6dae9c2132a0566f623cfe4467eec7c79ab0b`; deployment `bf1a272c-6b5c-45c5-9ae4-26f7277298d4` reached `SUCCESS`.
- [x] Verify the next hosted position pass emitted `level: "warn"` for `BTCUSD` and `PFD`, while the managed `AAPL` pass remained informational and submitted zero exits.

### Phase 6.407 — Safety contract documentation sync (2026-08-29)

- [x] Document the authoritative latest-snapshot/exit-plan calculation in `architecture.md`.
- [x] Document the dashboard `Review required` presentation and fail-closed invariant in `ui-context.md`.
- [ ] Publish and verify the corresponding dashboard revision after Vercel quota reset.

### Phase 6.408 — Safety state in account export (2026-08-29)

- [x] Add an `exitPlanStatus` field to the authenticated account CSV export.
- [x] Mark positions as `active` or `review_required` using the same authoritative unmanaged-position read model as the dashboard.
- [x] Leave orders, activities, and account snapshots unchanged apart from an empty status column for non-position rows.
- [x] Verify API typecheck and the full 318-test suite.
- [x] Deploy API revision `2b60810b215a4cb6d5a3281b412cd3c9c2d59e26`; Railway deployment `976724c3-d320-476a-a8f7-48116ea03b15` reached `SUCCESS` and API health remains `healthy`.
- [ ] Verify the authenticated CSV export in production.

### Phase 6.409 — Protected export boundary verification (2026-08-29)

- [x] Confirm the production `/v1/read-model.csv` endpoint remains protected and returns HTTP `401` without an operator credential.
- [x] Confirm the API and Worker remain healthy while the export enhancement is deployed.
- [ ] Verify the authenticated CSV contains `exitPlanStatus` values after operator sign-in.
- [ ] Publish the dashboard UI revision after Vercel's deployment quota reset.

### Phase 6.410 — Dashboard lint/build repair (2026-08-29)

- [x] Remove the unused audit decision variable introduced while switching to the authoritative unmanaged-position field.
- [x] Pass repository lint with `--max-warnings=0`.
- [x] Pass the Next.js production build with Node `v24.15.0`.
- [ ] Publish the corrected dashboard revision after Vercel's deployment quota resets.

### Phase 6.411 — Full release quality gate (2026-08-29)

- [x] Run the complete Vitest suite: 80 files and 318 tests passed.
- [x] Run all eight workspace TypeScript checks successfully.
- [x] Run ESLint with `--max-warnings=0` successfully.
- [x] Run the Next.js production build successfully with Node `v24.15.0`.
- [ ] Publish the verified dashboard revision after Vercel's deployment quota resets.

### Phase 6.412 — Continuous safety monitoring checkpoint (2026-08-29)

- [x] Confirm the Worker remains healthy with connected crypto stream and the next 15-minute research tick scheduled.
- [x] Confirm position management continues with three persisted positions, one managed (`AAPL`), and two fail-closed unmanaged (`BTCUSD`, `PFD`).
- [x] Confirm warning-level unmanaged events continue without automatic exits or risk bypasses.
- [ ] Observe the next research tick's risk decision and broker reconciliation result.

### Phase 6.387 — Hosted cycle baseline after reason-logging rollout (2026-08-28)

- [x] Verify Worker deployment `8cabc43d-b343-47c1-9a0f-257198dabdcf` is `SUCCESS` and health is `healthy`.
- [x] Verify crypto stream is connected, position management is ready, and the next research tick is scheduled for `15:30 UTC`.
- [x] Run the repository lint gate successfully after the reason-logging change.
- [ ] Capture the 15:30 cycle's structured risk reasons and broker reconciliation outcome.

### Phase 6.388 — Cross-agent candidate deduplication (2026-08-28)

- [x] Deduplicate identical asset-class/symbol candidates before the cross-asset risk cycle.
- [x] Preserve separate decisions when the same symbol belongs to different asset classes.
- [x] Add regression coverage while preserving first-agent evidence and ordering.
- [x] Run full verification: 79 files and 312 tests passed; Worker typecheck and lint passed.
- [x] Deploy Worker `f4bf4f24-fa7b-450e-a486-8b4a6a68ccb3` with `SUCCESS` and verify hosted health remains healthy, scheduled, and position-management ready.
- [ ] Verify the next hosted cycle contains no duplicate symbol decisions and reconcile a successful paper order.

### Phase 6.389 — Testable risk-cycle log contract (2026-08-28)

- [x] Extract the structured risk-cycle log shape into a pure, testable builder.
- [x] Bound run identifiers, decision count, and policy-reason strings in the log contract.
- [x] Add regression coverage for the operator-facing reason payload.
- [x] Verify full tests: 79 files and 313 tests; Worker typecheck and lint pass.
- [x] Deploy Worker `ef03d353-1713-4256-899c-0aa102380c67` with `SUCCESS` and verify hosted health remains healthy, connected, scheduled, and position-management ready.
- [ ] Verify the next hosted cycle log.

### Phase 6.390 — Position decision observability (2026-08-28)

- [x] Emit one bounded structured decision record for every managed position pass.
- [x] Include symbol, deterministic exit reason, and the `shouldExit` result without prices or provider payloads.
- [x] Distinguish an exit decision from a confirmed submission in the structured record.
- [x] Add regression coverage for exit and no-exit decision records.
- [x] Run full verification: 79 files and 314 tests passed; Worker typecheck and lint passed.
- [x] Deploy Worker `4a41b0a7-0b66-4776-b8b3-4114af169b2f` with `SUCCESS` and verify hosted health remains healthy, scheduled, and position-management ready.
- [ ] Verify the next position pass emits the new submission field and reconcile any eligible paper order.

### Phase 6.391 — Natural 15:30 cycle decision evidence (2026-08-28)

- [x] Confirm the hosted Worker completed the 15:30 UTC research tick and advanced `nextRunAt` to 15:45 UTC.
- [x] Confirm the position pass emitted an explicit no-exit decision for AAPL with `submitted: false`.
- [x] Confirm BTC/USD produced a deterministic rejection with position-cap and gross-exposure-cap reasons.
- [x] Confirm no broker order was submitted for the rejected candidate.
- [ ] Reconcile a successful paper order when a candidate passes the configured exposure gates.

### Phase 6.392 — Explicit per-asset paper sizing controls (2026-08-28)

- [x] Add optional stock and crypto quantity overrides while preserving the existing global fallback.
- [x] Validate quantities as positive decimal values before risk evaluation.
- [x] Wire scheduled and one-shot risk-cycle paths through the same quantity resolver.
- [x] Document the variables without changing current Railway values.
- [x] Resolve quantity per candidate so mixed crypto/equity batches cannot accidentally share the wrong size.
- [x] Run full verification: 80 files and 317 tests passed; Worker typecheck and lint passed.
- [x] Deploy Worker `34c6f697-4a07-427a-ab0f-c255ef14e6b2` with `SUCCESS` and verify hosted health remains healthy, scheduled, and position-management ready.
- [ ] Enable a per-asset quantity only after operator review; current Railway sizing values remain unchanged.

### Phase 6.393 — One-shot sizing consistency (2026-08-28)

- [x] Apply the same per-asset quantity resolver to the guarded research-to-order command.
- [x] Preserve its explicit `PAPER_ORDER_QUANTITY` override when supplied.
- [x] Keep all current hosted quantity values unchanged.
- [ ] Verify one-shot preflight and a broker-reconciled order with an explicitly reviewed size.

### Phase 6.394 — Hosted one-shot sizing rollout (2026-08-28)

- [x] Verify full suite: 80 files and 317 tests passed; Worker typecheck and lint passed.
- [x] Deploy Worker `036639eb-a686-44b0-87dd-8dc1fa2bee47` with `SUCCESS`.
- [x] Verify hosted health remains healthy, Paper Autopilot, scheduled, and position-management ready.
- [ ] Enable a reviewed per-asset quantity and verify a paper order reconciliation.

### Phase 6.395 — Unified quantity validation (2026-08-28)

- [x] Route explicit one-shot quantity overrides through the shared positive-decimal validator.
- [x] Preserve per-asset and global fallback precedence for continuous scheduling.
- [x] Add regression coverage proving malformed explicit overrides fail closed.
- [ ] Run full verification and deploy the Worker.
- [x] Run full verification: 80 files and 317 tests passed; Worker typecheck and lint passed.
- [x] Deploy Worker `2e01ada1-f8a3-48c8-89b6-fec314afdc00` with `SUCCESS` and verify hosted health remains healthy, paper-autopilot, scheduled, and position-management ready.
- [ ] Review and explicitly enable a per-asset quantity before submitting an order.
- [x] Run full verification: 79 files and 314 tests passed; Worker typecheck and lint passed.
- [x] Deploy Worker `23e99f53-0266-489c-b6df-c7f0c8b0f922` with `SUCCESS` and verify hosted health remains healthy, scheduled, and position-management ready.
- [ ] Verify the next position pass emits per-decision records and reconcile any eligible paper order.

### Phase 6.384 — Hosted cadence and submission configuration audit (2026-08-28)

- [x] Confirm the production research cadence is `*/15 * * * *` (15-minute ticks).
- [x] Confirm stock-window filtering is enabled for the first/last two regular-session hours.
- [x] Confirm Paper Autopilot, guarded order submission, and the supervised market stream are enabled.
- [x] Confirm these values through Railway's variable metadata without exposing any secret values.
- [ ] Observe the next eligible cross-asset cycle and reconcile a successful paper order.

### Phase 6.385 — Natural scheduler tick progression (2026-08-28)

- [x] Observe the scheduled 15:15 UTC research tick completing on the hosted Worker.
- [x] Confirm `lastRunAt` advanced to `2026-08-28T15:15:31.556Z` and `nextRunAt` advanced to `2026-08-28T15:30:00.000Z`.
- [x] Confirm position management completed its concurrent pass at `2026-08-28T15:15:30.029Z`.
- [x] Confirm the Worker remained healthy with the crypto stream connected and no kill switch activation.
- [ ] Inspect the persisted cross-asset risk decisions and reconcile a successful paper order.

### Phase 6.386 — Risk decision reason observability (2026-08-28)

- [x] Confirm the natural 15:15 UTC cycle produced a deterministic BTC/USD rejection for exposure-cap reasons.
- [x] Include bounded deterministic rejection/approval reasons in the structured `paper_risk_cycle_result` log.
- [x] Keep reasons limited to policy text and exclude market payloads, credentials, and private model traces.
- [x] Run focused/full tests (79 files, 311 tests), deploy Worker `8cabc43d-b343-47c1-9a0f-257198dabdcf` with `SUCCESS`, and verify hosted health remains configured and scheduled.
- [ ] Verify the next hosted cycle log includes the bounded reasons and reconcile a successful paper order.

### Phase 6.383 — Idempotent paper submission retry guard (2026-08-28)

- [x] Check the durable paper-submission ledger before every broker call.
- [x] Reuse an existing broker-bound intent without submitting a duplicate order.
- [x] Refuse retries when an intent exists without broker confirmation, requiring reconciliation.
- [x] Add regression coverage for broker-bound reuse and ambiguous in-flight failure-closed behavior.
- [x] Verify the focused execution tests and full suite: 79 files and 311 tests passed.
- [x] Deploy the guard to the explicit Railway Worker service; deployment `4d97a07b-d547-45f9-8128-cd87c16d33eb` reached `SUCCESS`.
- [x] Verify hosted health remains configured, paper-only, connected, scheduled, and position-management ready.
- [x] Verify all eight package/application TypeScript projects with direct `tsc --noEmit` checks.
- [ ] Observe the next natural cycle and reconcile a successful paper order.

### Phase 6.357 — Always-on scheduler acceptance contract (2026-08-28)

- [x] Extend the credential-free hosted runtime verifier to require the crypto/stock research scheduler to be enabled, handler-enabled, scheduled, and reporting a next run.
- [x] Extend the verifier to require the durable daily scheduler to be enabled, scheduled, and reporting a next run.
- [x] Add fail-closed regression coverage for degraded research scheduling and incomplete durable-scheduler health.
- [x] Verify the hosted API and Worker: both services are healthy, Paper Autopilot and order submission are enabled, market data is connected, position management is ready, research is scheduled, and the durable scheduler is scheduled.
- [ ] Verify authenticated dashboard rendering and reconcile a successful paper order; these require operator session access and Alpaca's external crypto entitlement response.

### Phase 6.358 — Multi-candidate paper hand-off throughput (2026-08-28)

- [x] Identify that broker-enabled cycles stopped after evaluating only the first candidate.
- [x] Evaluate up to 10 candidates per cycle while preserving the single-order-per-reconciled-cycle invariant.
- [x] Persist every candidate's deterministic risk decision; stop only after the first approved execution.
- [x] Verify the complete regression suite: 78 files and 304 tests passed.
- [ ] Reconcile a successful paper order once an eligible candidate passes risk and Alpaca accepts the request.

### Phase 6.359 — Hosted multi-candidate worker deployment (2026-08-28)

- [x] Deploy the multi-candidate paper hand-off change to Railway's explicit `worker` service.
- [x] Confirm deployment `02315f79-8d1f-45b8-8549-69e28cc2de15` reached `SUCCESS`.
- [x] Confirm live Worker health remains `healthy`, research scheduling is `scheduled`, and position management is `ready`.
- [ ] Capture a successful broker-reconciled paper order from an eligible candidate.

### Phase 6.361 — Hosted cycle observability (2026-08-28)

- [x] Add a bounded structured log for successful research results with agent, run, candidate count, and symbols.
- [x] Add a structured paper-risk-cycle log with approval/execution status and intent IDs.
- [x] Keep logs credential-free and omit provider response bodies, account secrets, and sensitive payloads.
- [x] Verify the complete regression suite: 78 files and 305 tests passed.
- [ ] Deploy to the worker and observe the next natural cycle's log records.

### Phase 6.362 — Complete hosted cycle observability (2026-08-28)

- [x] Ensure empty and failed scheduled research results are logged instead of silently skipped.
- [x] Preserve bounded symbols and omit market payloads, credentials, and provider response bodies.
- [x] Keep paper risk/execution records separately logged after deterministic processing.
- [ ] Deploy and observe the next natural cycle's records in Railway logs.

### Phase 6.363 — Position-management pass observability (2026-08-28)

- [x] Log every position-management pass with total positions, managed positions, and submitted exits.
- [x] Cover the zero-managed-position path so silent monitoring gaps are visible.
- [x] Keep logs credential-free and exclude prices, account values, and provider payloads.
- [x] Verify the complete regression suite: 78 files and 306 tests passed.
- [ ] Deploy and observe the next position-management pass in Railway logs.

### Phase 6.364 — Hosted position-pass observability deployment (2026-08-28)

- [x] Deploy the position-management pass observability change to the explicit Railway `worker` service.
- [x] Recover from the first transient failed deployment by redeploying from the latest source.
- [x] Confirm deployment `7542ad19-3417-43fc-b077-76844d734af2` reached `SUCCESS`.
- [x] Confirm the live Worker health endpoint remains healthy, with research `scheduled` and position management `ready`.
- [ ] Observe the next natural position-management log record and reconcile a successful paper order.

### Phase 6.365 — Deployment type-safety repair (2026-08-28)

- [x] Diagnose failed deployment `e830343c-b799-4221-8eb0-eb64d8672e8d` to the invalid `PositionManagementResult.managed` property.
- [x] Correct the log record to use `managed.length` without changing trading behavior.
- [x] Verify position-management tests and worker TypeScript compilation pass.
- [ ] Redeploy and confirm configured Alpaca/database health; no order action is taken during this repair.

### Phase 6.366 — Restored configured worker rollout (2026-08-28)

- [x] Deploy the type-safety repair to the explicit Railway `worker` service.
- [x] Confirm deployment `a61e314e-e75b-488f-8bf0-9200bd461e78` reached `SUCCESS`.
- [x] Verify live health reports `alpaca: configured`, `database: configured`, `paper_autopilot`, scheduled research, and ready position management.
- [ ] Observe the next natural cycle's structured logs and reconcile a successful paper order.

### Phase 6.367 — Live position-pass evidence (2026-08-28)

- [x] Verify live Worker health reports configured Alpaca and PostgreSQL, Paper Autopilot, and scheduled research.
- [x] Observe a deployed `position_management_pass` record with one managed position and no exit submission.
- [x] Confirm the position-management scheduler remains ready and continues at its configured 60-second interval.
- [ ] Observe the next research cycle's candidate/risk records and reconcile a successful paper order.

### Phase 6.369 — Hosted release identity (2026-08-28)

- [x] Add optional `release` to Worker health from `RAILWAY_GIT_COMMIT_SHA` or `GIT_COMMIT_SHA`.
- [x] Keep the release value non-secret and omit it when the host does not provide one.
- [x] Add regression coverage and verify domain/Worker TypeScript compilation.
- [x] Run the complete regression suite: 78 files and 307 tests passed.
- [ ] Deploy and confirm the live health response reports the expected source revision.

### Phase 6.370 — Hosted release identity deployment (2026-08-28)

- [x] Deploy the release-identity health change to the explicit Railway worker service.
- [x] Confirm deployment `dd729cb2-4cf1-4380-8a8e-632d10b0990a` reached `SUCCESS`.
- [x] Confirm live health remains configured and healthy; absent host SHA is represented as omitted rather than fabricated.
- [ ] Configure a non-secret release SHA at the host if exact revision display is required.

### Phase 6.371 — Hosted paper runtime acceptance recheck (2026-08-28)

- [x] Run `verify:paper-runtime` against the live Railway API and Worker endpoints.
- [x] Confirm all configuration, scheduler, stream, position, and paper-execution prerequisites pass.
- [x] Confirm the Worker remains in `paper_autopilot` mode with no kill switch activation.
- [ ] Observe a natural research cycle and reconcile a successful paper order.

### Phase 6.372 — Cross-asset single-cycle execution (2026-08-28)

- [x] Add a batch callback to research preparation after all eligible asset-class plans complete.
- [x] Aggregate crypto and stock candidates into one bounded risk cycle and one approval reference.
- [x] Preserve per-agent result logging and recommendation notifications.
- [x] Enforce at most one broker submission across the entire scheduler job.
- [x] Verify the complete regression suite: 78 files and 307 tests passed.
- [ ] Deploy and observe the next natural cross-asset cycle; reconcile a successful paper order.

### Phase 6.373 — Hosted cross-asset execution guard (2026-08-28)

- [x] Deploy the cross-asset batch risk-cycle change to the explicit Railway worker.
- [x] Confirm deployment `6fda1aff-ab2b-4ef9-973f-8283a4e17798` reached `SUCCESS`.
- [x] Verify live configured health and ready position management after rollout.
- [ ] Observe the next natural cross-asset cycle and reconcile a successful paper order.

### Phase 6.382 — Hosted runtime CI gate (2026-08-28)

- [x] Add `verify:paper-runtime` to the paper-only GitHub Actions workflow.
- [x] Configure public health URL overrides through GitHub repository variables, with current Railway URLs as defaults.
- [x] Keep the CI gate read-only, credential-free, and fail-closed on runtime prerequisites.
- [ ] Confirm the next GitHub Actions run passes against the hosted Worker and API.

### Phase 6.374 — Single risk cycle per scheduler batch (2026-08-28)

- [x] Identify that per-agent callbacks could create separate risk cycles within one scheduler job.
- [x] Add a batch callback and aggregate all successful candidates before risk evaluation.
- [x] Preserve per-agent persistence/notifications and fail closed when every plan fails.
- [x] Verify the complete regression suite: 78 files and 307 tests passed.
- [ ] Deploy and observe the cross-asset batch in the hosted worker.

### Phase 6.375 — Cross-asset build compatibility audit (2026-08-28)

- [x] Compile domain, database, Alpaca, Worker, API, and Web TypeScript projects.
- [x] Confirm the batch callback is compatible with existing research-preparation callers.
- [x] Confirm the full regression suite remains green: 78 files and 307 tests passed.
- [ ] Observe the next natural cross-asset batch and reconcile a successful paper order.

### Phase 6.380 — Startup-convergent runtime verification (2026-08-28)

- [x] Add bounded retry handling for transient health fetches and startup stream convergence.
- [x] Preserve fail-closed behavior after all retry attempts are exhausted.
- [x] Keep the verifier read-only and credential-free.
- [ ] Run the retried verifier against the next natural cross-asset cycle and reconcile a successful paper order.

### Phase 6.381 — Tested runtime verifier retries (2026-08-28)

- [x] Extract health retry logic behind an injectable fetcher and delay.
- [x] Add regression tests for transient recovery and exhausted attempts.
- [x] Keep script imports side-effect free; environment validation runs only from the CLI entry point.
- [x] Verify the complete regression suite: 79 files and 309 tests passed.
- [ ] Observe the next natural cross-asset cycle and reconcile a successful paper order.

### Phase 6.379 — Release verification configuration (2026-08-28)

- [x] Document optional `PAPERTRADER_EXPECTED_RELEASE` usage in `.env.example`.
- [x] Keep the variable non-secret and fail closed on a mismatched Worker revision.
- [x] Preserve the live paper-runtime health and scheduler configuration.
- [ ] Observe the next natural cross-asset batch and reconcile a successful paper order.

### Phase 6.378 — Automatic source propagation acceptance (2026-08-28)

- [x] Detect the hosted revision changed from `7605c517…` to `7869a8cb…` after the source push.
- [x] Confirm the expected-release verifier fails for the stale revision and passes for the current revision.
- [x] Confirm current health remains configured, paper-only, connected, scheduled, and position-ready.
- [ ] Observe the next natural cross-asset batch and reconcile a successful paper order.

### Phase 6.376 — Expected-release runtime verification (2026-08-28)

- [x] Add optional `PAPERTRADER_EXPECTED_RELEASE` verification to the credential-free runtime command.
- [x] Fail closed when the expected release does not match the Worker health release.
- [x] Verify the live Worker against its reported release and all paper-runtime prerequisites.
- [x] Run the complete regression suite: 78 files and 307 tests passed.
- [ ] Verify the next natural cross-asset batch and reconcile a successful paper order.

### Phase 6.377 — Current hosted revision acceptance (2026-08-28)

- [x] Confirm the live Worker reports release `7605c5176033ac81820a5d9780e68217af594218`.
- [x] Run the hosted verifier with that expected release and confirm `verified: true`.
- [x] Confirm Alpaca/PostgreSQL configuration, Paper Autopilot, connected stream, ready positions, and both schedulers.
- [ ] Observe the next natural cross-asset batch and reconcile a successful paper order.

### Phase 6.368 — Configuration-aware hosted acceptance (2026-08-28)

- [x] Add explicit Alpaca and PostgreSQL configuration requirements to the hosted runtime contract.
- [x] Add regression coverage proving `not_configured` health fails closed.
- [x] Run the hosted verifier successfully: API/Worker healthy, Alpaca and database configured, Paper Autopilot enabled, market stream connected, position management ready, and both schedulers scheduled.
- [ ] Observe the next research cycle's candidate/risk records and reconcile a successful paper order.

### Phase 6.360 — Independent single-order execution guard (2026-08-28)

- [x] Decouple the single-order stop condition from the optional Telegram notification branch.
- [x] Track execution submission explicitly and stop candidate evaluation immediately after the first successful approved submission.
- [x] Preserve bounded evaluation of up to 10 candidates when earlier candidates are rejected.
- [x] Verify the complete regression suite: 78 files and 304 tests passed.
- [ ] Capture a successful broker-reconciled paper order from an eligible candidate.

### Phase 6.356 — Natural 14:15 UTC crypto cycle (2026-08-28)

- [x] Observe the scheduled `14:15 UTC` crypto preparation tick without forcing a manual run.
- [x] Confirm hosted Worker health reported `lastRunAt: 14:15:11 UTC`, `status: scheduled`, and `nextRunAt: 14:30 UTC`.
- [x] Confirm PostgreSQL persisted `research-preparation-crypto_research-20260828141510` and `research-preparation-stock_research-20260828141510` as `succeeded`.
- [x] Confirm the read-only `paper_order_submissions` ledger recorded `intent:BTC_USD:2026-08-28T14:00:00Z` as `risk_dry_run_rejected` with no broker order ID or fill.
- [x] Confirm the Worker remained healthy, the crypto stream remained connected, position management remained ready, and Paper Autopilot remained enabled after the tick.
- [ ] Verify this cycle and its bounded risk decision in the authenticated dashboard.
- [ ] Reconcile a successful paper order and resolve Alpaca's external crypto-order entitlement response.

### Phase 6.355 — Natural 14:00 UTC crypto cycle (2026-08-28)

- [x] Observe the scheduled `14:00 UTC` crypto preparation tick without forcing a manual run.
- [x] Confirm persisted run `research-preparation-crypto_research-20260828140010` completed with `status: succeeded`.
- [x] Confirm the read-only `paper_order_submissions` ledger has no new row from this cycle, proving no broker submission or fill was created.
- [x] Confirm hosted Worker health remained `healthy`, the crypto stream remained `connected`, position management remained `ready`, and the next run advanced to `14:15 UTC`.
- [ ] Verify this cycle and its bounded risk decision in the authenticated dashboard.
- [ ] Reconcile a successful paper order and resolve Alpaca's external crypto-order entitlement response.

### Phase 6.354 — Natural 13:45 UTC crypto cycle (2026-08-28)

- [x] Observe the scheduled `13:45 UTC` crypto preparation tick without forcing a manual run.
- [x] Confirm persisted run `research-preparation-crypto_research-20260828134509` completed with `status: succeeded`.
- [x] Confirm the BTC/USD hand-off was recorded as `risk_dry_run_rejected` with position-cap and gross-exposure reasons, no submission timestamp, and no broker fill.
- [x] Confirm hosted Worker health remained `healthy`, the crypto stream remained `connected`, position management remained `ready`, and the next run advanced to `14:00 UTC`.
- [ ] Verify this cycle and its bounded risk reason in the authenticated dashboard.
- [ ] Reconcile a successful paper order and resolve Alpaca's external crypto-order entitlement response.

### Phase 6.353 — Natural 13:30 UTC crypto cycle (2026-08-28)

- [x] Observe the scheduled 15-minute crypto preparation tick without forcing a manual run.
- [x] Confirm persisted run `research-preparation-crypto_research-20260828133010` completed with `status: succeeded`.
- [x] Confirm the cycle's BTC/USD risk hand-off is `risk_dry_run_rejected` with no `submitted_at` value, preserving the deterministic exposure gate.
- [x] Confirm the read-only deployed PostgreSQL query shows no new broker execution or fill from this cycle.
- [ ] Verify this cycle and its bounded risk reason in the authenticated dashboard.
- [ ] Reconcile a successful paper order and resolve Alpaca's external crypto-order entitlement response.

### Phase 6.352 — Hosted operator API auth-boundary verification (2026-08-28)

- [x] Run the read-only operator auth-boundary verifier against the public Railway API.
- [x] Confirm `/v1/operator-overview` returns HTTP `401` without an operator token.
- [x] Confirm `/v1/operator-overview.csv` returns HTTP `401` without an operator token.
- [x] Preserve the rule that unauthenticated requests cannot read portfolio, positions, trades, or audit history.
- [ ] Verify the authenticated dashboard with the configured Clerk operator session.
- [ ] Reconcile a successful paper order and resolve Alpaca's external crypto-order entitlement response.

### Phase 6.351 — Credential-free hosted runtime acceptance check (2026-08-28)

- [x] Run the read-only runtime verifier against the public Railway API and Worker health endpoints.
- [x] Confirm both services report `healthy`, Paper Autopilot is active, order submission is enabled, the market stream is connected, and position management is `ready`.
- [x] Confirm the verifier fails closed on missing prerequisites and exposes no credentials or private account data.
- [x] Verify the runtime contract and operator-overview regression tests (4 tests) pass.
- [ ] Verify the authenticated dashboard against the persisted natural cycle and live portfolio/positions.
- [ ] Reconcile a successful paper order and resolve Alpaca's external crypto-order entitlement response.

### Phase 6.328 — Natural 15-minute crypto cycle (2026-08-28)

- [x] Observe the scheduled `12:30 UTC` crypto preparation tick without forcing a manual run.
- [x] Confirm persisted run `research-preparation-crypto_research-20260828123046` completed with `status: succeeded`.
- [x] Confirm the run persisted a BTC/USD watchlist candidate with point-in-time bar metrics (`dataAsOf: 2026-08-28T12:00:00Z`) and an Alpaca market evidence reference.
- [x] Confirm hosted health remains `healthy`, crypto stream remains `connected`, and position management remains `ready` after the cycle.
- [ ] Resolve Alpaca's external HTTP 403 crypto order-entitlement response before allowing an approved crypto candidate to submit.
- [ ] Verify the authenticated dashboard Cycle card and live portfolio/position rendering.

### Phase 6.329 — Scheduled candidate risk hand-off (2026-08-28)

- [x] Confirm the `12:30 UTC` BTC/USD candidate entered the scheduled research-to-risk hand-off.
- [x] Confirm deterministic risk rejected the candidate for existing position-cap and gross-exposure limits; no broker submission occurred.
- [x] Confirm the persisted order ledger records the sanitized intent `intent:BTC_USD:2026-08-28T12:00:00Z` as `risk_dry_run_rejected` with no submission timestamp.
- [x] Confirm the rejection preserves the paper safety boundary while the Worker remains healthy and the next crypto tick is scheduled for `12:45 UTC`.
- [ ] Verify the authenticated dashboard presents this risk decision and its bounded reasons in the Cycle card.
- [ ] Resolve the separate Alpaca HTTP 403 crypto order-entitlement response before an approved crypto candidate can submit.

### Phase 6.330 — Provider error classification (2026-08-28)

- [x] Add a shared, credential-free classifier for Alpaca order HTTP failures.
- [x] Identify crypto HTTP 403 responses as `crypto_order_entitlement_blocked` while preserving generic classification for other asset/status combinations.
- [x] Include the bounded classification in server-side order errors without exposing provider response bodies.
- [x] Verify Alpaca order tests (5), package TypeScript, and ESLint pass.
- [ ] Deploy the classifier and verify the next approved crypto attempt reports the bounded blocker.

### Phase 6.331 — Failure-reason alert propagation (2026-08-28)

- [x] Propagate the credential-free provider classification into failed paper-entry alert text.
- [x] Keep provider response bodies, credentials, and sensitive details out of notifications.
- [x] Add regression coverage for crypto entitlement alert messaging.
- [x] Verify focused Worker/Alpaca tests (10), Worker TypeScript, and ESLint pass.
- [ ] Deploy and confirm the next approved crypto attempt produces the bounded Telegram reason.

### Phase 6.332 — Dashboard feed-status wording (2026-08-28)

- [x] Remove misleading dashboard labels that reported server-side market/trade feeds as disconnected or disabled.
- [x] Clearly label those feeds as server-side and direct operators to Worker health for stream status.
- [x] Verify dashboard state tests (10), web TypeScript, ESLint, and production Next.js build pass.
- [ ] Publish the verified dashboard build to the production Vercel alias when deployment quota permits.

### Phase 6.333 — Dashboard lifecycle labeling (2026-08-28)

- [x] Replace the stale Phase 2 dashboard eyebrow with current live paper-operations wording.
- [x] Preserve the authenticated, read-only dashboard boundary and paper-only semantics.
- [x] Verify dashboard tests (10), web TypeScript, ESLint, and production Next.js build pass.
- [ ] Publish the verified dashboard build to the production Vercel alias when deployment quota permits.

### Phase 6.334 — Dashboard preview publication (2026-08-28)

- [x] Confirm Vercel generated a Ready preview for the pushed dashboard commit.
- [x] Confirm the preview `/dashboard` route preserves the authentication boundary (`302` to Vercel SSO/Clerk).
- [x] Confirm the production dashboard build is available for operator review at the preview URL.
- [ ] Publish the preview to the production alias when Vercel deployment quota permits.

### Phase 6.335 — Production promotion quota check (2026-08-28)

- [x] Attempt promotion of the Ready dashboard preview to the production alias.
- [x] Confirm Vercel rejected the promotion with the explicit free-tier deployment quota error `api-deployments-free-per-day` (HTTP 402).
- [x] Preserve the Ready preview and production alias without changing application or trading state.
- [ ] Retry promotion after Vercel's quota window resets.

### Phase 6.336 — Natural 12:45 crypto cycle (2026-08-28)

- [x] Observe the scheduled `12:45 UTC` crypto preparation tick without forcing a manual run.
- [x] Confirm persisted run `research-preparation-crypto_research-20260828124525` completed with `status: succeeded`.
- [x] Confirm BTC/USD candidate metrics and captured Alpaca evidence were persisted.
- [x] Confirm no additional broker order was created while the candidate remained outside deterministic exposure limits.
- [x] Confirm Worker health remains `healthy` and the crypto stream remains `connected`.
- [ ] Continue the paper-forward evidence window and await an approved candidate for the next broker hand-off.

### Phase 6.337 — Dashboard operating-mode accuracy (2026-08-28)

- [x] Replace stale dashboard copy that contradicted the active server-side Paper Autopilot state.
- [x] Make the operating-mode footer render the resolved mode dynamically.
- [x] Verify dashboard tests (10), web TypeScript, ESLint, and production Next.js build pass.
- [ ] Publish the verified dashboard build to the production alias when Vercel quota permits.

### Phase 6.338 — Continuous paper runtime regression verification (2026-08-28)

- [x] Run the complete Vitest regression suite after the latest dashboard and provider-error changes: 77 files and 301 tests passed.
- [x] Confirm the deployed Worker health contract remains `healthy` with `paper_autopilot`, order submission enabled, connected crypto stream, and ready position management.
- [x] Preserve the fail-closed behavior for the current BTC/USD candidate: deterministic exposure checks prevent a broker write when the candidate is not approved.
- [ ] Resolve Alpaca's external `crypto_order_entitlement_blocked` response for an approved crypto candidate.
- [ ] Verify the authenticated dashboard against the latest persisted cycle and promote the Ready preview after Vercel's deployment quota resets.

### Phase 6.339 — Continuous paper runtime deployment verification (2026-08-28)

- [x] Confirm the Railway deployment for commit `aea094f` reached `SUCCESS`.
- [x] Confirm the post-deploy Worker health contract remains `healthy` with `paper_autopilot`, order submission enabled, connected crypto stream, ready position management, and scheduled research.
- [ ] Resolve Alpaca's external `crypto_order_entitlement_blocked` response for an approved crypto candidate.
- [ ] Verify the authenticated dashboard against a persisted natural cycle and reconcile one successful paper order.
- [ ] Promote the Ready Vercel preview after the deployment quota window resets.

### Phase 6.340 — Credential-free runtime verification command (2026-08-28)

- [x] Add `pnpm verify:paper-runtime` to validate API and Worker health using only public health endpoints.
- [x] Fail closed unless Paper Autopilot, order submission, connected market data, and ready position management are all reported.
- [x] Keep the command read-only: it does not load secrets, query private account data, or submit broker orders.
- [ ] Run the command against hosted URLs in the next verification window and record a successful natural order/reconciliation separately.

### Phase 6.341 — Runtime verification configuration (2026-08-28)

- [x] Document the two non-secret health URL variables required by `pnpm verify:paper-runtime`.
- [x] Keep the example file free of credentials and provider secrets.
- [ ] Run the verifier again after the next natural scheduler cycle and record successful paper order reconciliation separately.

### Phase 6.342 — Runtime verification contract tests (2026-08-28)

- [x] Extract the runtime acceptance decision into a side-effect-free contract module.
- [x] Add regression coverage for both healthy and fail-closed prerequisite states.
- [ ] Run the verifier after the next natural scheduler cycle and record successful paper order reconciliation separately.

### Phase 6.343 — Natural 13:00 crypto cycle (2026-08-28)

- [x] Observe the scheduled 15-minute cycle without forcing a manual run.
- [x] Confirm Worker health reports `lastRunAt: 13:00:26 UTC` and `nextRunAt: 13:15 UTC`.
- [x] Confirm the Worker remained healthy and position management remained ready after the cycle.
- [ ] Confirm the persisted candidate/risk decision and whether a broker submission was attempted through the authenticated audit view.
- [ ] Resolve Alpaca's external crypto-order entitlement response before an approved crypto candidate can submit.

### Phase 6.344 — Natural cycle persistence verification (2026-08-28)

- [x] Read the deployed PostgreSQL ledger through the Worker container using a credential-free, read-only query path.
- [x] Confirm persisted run `research-preparation-crypto_research-20260828130025` completed with `status: succeeded`.
- [x] Confirm recent order rows contain no newly filled crypto order; no broker state was changed by verification.
- [ ] Verify the persisted 13:00 candidate and risk decision in the authenticated dashboard.
- [ ] Resolve Alpaca's external crypto-order entitlement response before an approved crypto candidate can submit.

### Phase 6.345 — Natural cycle execution-boundary verification (2026-08-28)

- [x] Query the deployed order-submission ledger after the 13:00 research run using a read-only Worker-container connection.
- [x] Confirm the latest submission rows contain no 13:00 entry or fill, proving no broker execution was attempted for that cycle.
- [x] Preserve the fail-closed boundary: an unapproved candidate cannot create a broker order.
- [ ] Verify the corresponding candidate and deterministic rejection reasons in the authenticated dashboard.
- [ ] Resolve Alpaca's external crypto-order entitlement response before an approved crypto candidate can submit.

### Phase 6.346 — Natural cycle intent reconciliation (2026-08-28)

- [x] Inspect the complete recent paper-order ledger after the 13:00 cycle.
- [x] Confirm the sanitized `intent:BTC_USD:2026-08-28T12:00:00Z` row is `risk_dry_run_rejected` with no `submitted_at` value.
- [x] Confirm the scheduler's run timestamp and the candidate's bar timestamp are distinct and correctly represented.
- [ ] Verify this risk decision and its reasons in the authenticated dashboard.
- [ ] Resolve Alpaca's external crypto-order entitlement response before an approved crypto candidate can submit.

### Phase 6.347 — Filled-order position reconciliation (2026-08-28)

- [x] Read the latest deployed account snapshot and associated positions through the Worker container using a read-only query.
- [x] Confirm the filled AAPL paper order is represented as quantity `1` in the latest snapshot.
- [x] Confirm current unrealized P/L is persisted for AAPL (`+1.34`) and the pre-existing PFD position (`-609.63`).
- [ ] Verify these live portfolio values render in the authenticated dashboard.
- [ ] Resolve Alpaca's external crypto-order entitlement response before an approved crypto candidate can submit.

### Phase 6.348 — Research scheduler liveness guard (2026-08-28)

- [x] Add a bounded two-minute overdue-tick check to Worker research-scheduler health.
- [x] Preserve `scheduled` status during the grace period and report `degraded` only after the next tick is overdue.
- [x] Add regression coverage; focused scheduler/app tests (16), Worker TypeScript, ESLint, and diff checks pass.
- [ ] Observe the guard across a hosted missed-tick scenario without changing scheduler cadence or order behavior.

### Phase 6.349 — Public Worker deployment of scheduler liveness guard (2026-08-28)

- [x] Deploy the verified liveness-guard commit explicitly to Railway service `worker`.
- [x] Confirm deployment `d052b88b-0898-4631-9fee-517ffc7d178f` reached `SUCCESS`.
- [x] Confirm the public Worker health endpoint remains healthy after deployment.
- [ ] Observe the guard across a hosted missed-tick scenario without changing scheduler cadence or order behavior.

### Phase 6.350 — Natural 13:15 crypto cycle after liveness deployment (2026-08-28)

- [x] Observe the scheduled 13:15 UTC cycle without forcing a manual run.
- [x] Confirm persisted run `research-preparation-crypto_research-20260828131509` completed with `status: succeeded`.
- [x] Confirm the latest BTC/USD hand-off is `risk_dry_run_rejected` with no `submitted_at` value.
- [x] Confirm Worker health remained healthy and the next run advanced to 13:30 UTC.
- [ ] Verify the persisted decision and bounded reasons in the authenticated dashboard.
- [ ] Resolve Alpaca's external crypto-order entitlement response before an approved crypto candidate can submit.

### Phase 6.327 — Asset-aware crypto order execution (2026-08-28)

- [x] Confirm Alpaca documentation supports `gtc`/`ioc` for crypto and not `day`.
- [x] Normalize crypto entry and exit submissions to `gtc` at the Alpaca adapter boundary.
- [x] Add regression coverage for crypto market-order time-in-force normalization.
- [x] Verify focused Alpaca/Worker tests, type checks, and lint pass.
- [x] Re-run the full test suite: 77 files / 299 tests passed; Worker/Alpaca lint is clean.
- [x] Deploy current Worker build successfully (`61b80fd4-ffca-4bd7-80fe-a999e661dc44`).
- [x] Verify Alpaca paper assets API returns active/tradable crypto assets including ETH/USD; order submission still returns HTTP 403, confirming the remaining gate is account/provider permission rather than asset lookup.
- [x] Verify Alpaca `/v2/account` reports `status=ACTIVE`, `crypto_status=ACTIVE`, and `trade_suspended_by_user=false`; the remaining HTTP 403 is therefore an order-entitlement/provider response requiring Alpaca support or account-level review.
- [x] Observe the natural `12:15 UTC` crypto preparation cycle (`research-preparation-crypto_research-20260828121531`); research succeeded and the provider-rejected ETH/USD entry produced a delivered Telegram failure alert.
- [x] Execute the guarded preparation handler at `2026-08-28T12:23:49Z`; Alpaca returned a validated BTC/USD bar snapshot and the crypto research agent persisted one candidate with its market metrics and evidence references.
- [ ] Run an approved crypto paper candidate through the deployed path and reconcile its broker state; the deployed request now reaches Alpaca but returns redacted HTTP 403, requiring crypto trading permission/asset eligibility to be checked in the Alpaca paper account.

### Phase 6.326 — Continuous paper-trading activation checkpoint (2026-08-28)

- [x] Record the bounded non-secret continuous paper-trading authorization reference.
- [x] Set `PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED=true` and the approval reference on Railway Worker.
- [x] Deploy current Worker build successfully (`d2560580-9647-419c-80f5-2b3834eb5c97` reached `SUCCESS`).
- [x] Verify hosted health reports paper mode, submission enabled, Alpaca/database configured, kill switch inactive, market stream connected, and position management ready.
- [x] Confirm Alpaca historical bars are retrieved and a guarded crypto research run completes successfully (`research-market-1787918110481`).
- [x] Run the guarded end-to-end paper evidence path (`CONTINUOUS-PAPER-E2E-001`); reconciliation and research completed, and the risk engine rejected the candidate at the configured 5% boundary without submitting an order.
- [x] Record the confirmed USD 100,000 baseline and fix generated-stop rounding so stops remain strictly below 5%.
- [x] Run the guarded end-to-end paper path with AAPL (`CONTINUOUS-PAPER-E2E-007`); deterministic approval passed and Alpaca paper order `4af1ef57-4c1f-4c82-9e1a-725704ad28d2` was submitted and reconciled.
- [x] Verify the persisted read model after reconciliation: equity `99392.30000000`, AAPL position `1.00000000`, and PFD position `2903.00000000` are available for dashboard/API rendering.
- [x] Reconcile again at `2026-08-28T12:05:13.633Z`; the new AAPL order remains `new`/`0.00000000` filled, consistent with the premarket check, while live positions remain persisted.
- [x] Verify Telegram events are delivered (`sent`) for paper entry submission, paper entry failure, position detection, and daily portfolio summaries.
- [x] Query Alpaca directly at `2026-08-28T12:07:11.722Z`: account `ACTIVE`, equity `99392.22`, AAPL quantity `1` with unrealized P/L `2.02`, PFD quantity `2903` with unrealized P/L `-609.63`; order `4af1ef57-4c1f-4c82-9e1a-725704ad28d2` remains `new`/zero-filled pending the regular session.
- [x] Verify production dashboard route `https://papertrader-web.vercel.app/dashboard` responds with the Clerk sign-in boundary (`307`) and is ready for authenticated live portfolio rendering.
- [ ] Confirm historical bars are retrieved and persisted during the next natural scheduled research cycle.
- [ ] Confirm any approved paper order, reconciliation, portfolio snapshot, dashboard display, and Telegram alert end to end.

### Phase 6.325 — Dashboard cadence contract coverage (2026-08-28)

- [x] Add a dashboard-state fixture for `*/15 * * * *` research cadence and stock-window mode.
- [x] Verify parsed state preserves both fields for operator display.
- [x] Verify dashboard-state tests (10), ESLint, and Web TypeScript checks pass.
- [x] Confirm this change does not alter runtime scheduling or broker permissions.
- [ ] Observe another natural crypto cycle and a US stock-window cycle.

### Phase 6.324 — Cadence boundary acceptance coverage (2026-08-28)

- [x] Expose the scheduler’s next-run calculation as a pure, testable function.
- [x] Verify `2026-08-28T11:32:50Z` resolves to `11:45:00Z` for `*/15 * * * *`.
- [x] Verify an exact `11:45:00Z` boundary resolves to `12:00:00Z`.
- [x] Verify the focused Worker suite (8 tests), ESLint, and Worker TypeScript checks pass.
- [x] Confirm no runtime configuration, broker state, or order-submission gate changed.
- [ ] Observe later natural crypto and stock-window cycles.

### Phase 6.323 — Follow-up cadence and performance checkpoint (2026-08-28)

- [x] Confirm the first cycle remains recorded and the next crypto tick is scheduled for 11:45 UTC.
- [x] Confirm the crypto stream remains connected and position management remains ready.
- [x] Run the deployed read-only performance report through the compiled Worker command path.
- [x] Record current evidence: 100 snapshots, final equity `99,391.42`, captured P&L `+0.39`, maximum drawdown `0.00027165%`.
- [x] Confirm continuous paper-order submission remains disabled.
- [ ] Observe the 11:45 UTC cycle and a stock-window cycle during regular New York hours.

### Phase 6.322 — First natural asset-aware research cycle (2026-08-28)

- [x] Observe the configured 11:30 UTC research tick without forcing a manual queue run.
- [x] Confirm Worker health records `lastRunAt: 2026-08-28T11:30:03.786Z` and schedules the next tick at 11:45 UTC.
- [x] Confirm a fresh persisted account/reconciliation capture at `2026-08-28T11:30:34.664Z`.
- [x] Confirm performance report remains `ready` with 100 snapshots and only the 30-day stability block.
- [x] Confirm crypto stream remains connected and continuous paper-order submission remains disabled.
- [ ] Observe a later crypto cycle and a stock-window cycle during regular New York hours.

### Phase 6.321 — Hosted crypto stream observability (2026-08-28)

- [x] Add redacted market-stream state to the Worker health contract.
- [x] Track connecting, connected, reconnecting, and stopped states without exposing credentials.
- [x] Verify full tests (77 files / 297 tests), lint, and Worker TypeScript checks.
- [x] Deploy and confirm Railway deployment `a79793a7-dfdf-4325-bd96-d7d849d88277` reached `SUCCESS`.
- [x] Confirm hosted `/health` reports `assetClass: crypto`, `status: connected`, and a recent `lastMessageAt`.
- [ ] Observe and reconcile the first naturally completed 15-minute crypto research run.

### Phase 6.320 — Hosted asset-aware cadence verification (2026-08-28)

- [x] Verify the deployed compiled preparation module reads stock-window mode as enabled.
- [x] Verify hosted crypto and stock symbol sets are loaded without exposing credentials.
- [x] Verify 09:30 ET opening-window and 14:00 ET closing-window timestamps are admitted.
- [x] Verify a midday timestamp is rejected and the Worker health remains `healthy`.
- [ ] Observe and reconcile the first naturally completed 15-minute crypto research run.

### Phase 6.319 — Asset-aware research cadence (2026-08-28)

- [x] Add timezone-safe weekday window detection for 09:30–11:30 and 14:00–16:00 America/New_York.
- [x] Filter stock preparation outside those windows while keeping crypto preparation eligible on every tick.
- [x] Support minute-interval scheduler health calculation for `*/15 * * * *`.
- [x] Verify 77 test files / 297 tests, ESLint, and Worker TypeScript checks locally.
- [x] Set Railway Worker cadence variables to `RESEARCH_PREPARATION_CRON=*/15 * * * *` and `RESEARCH_STOCK_WINDOW_ONLY=true`.
- [x] Rebuild the Worker from the phase branch and verify the full configured health contract after deployment.
- [x] Confirm hosted health remains `healthy`, position management is `ready`, and continuous paper-order submission is disabled.

### Phase 6.318 — Hosted paper-performance heartbeat (2026-08-28)

- [x] Run the deployed read-only performance report through the corrected `/app/apps/worker/dist` command path.
- [x] Confirm report status `ready` with 100 reconciled snapshots and one consecutive calendar day.
- [x] Record the current evidence: first capture `2026-08-28T09:36:00.560Z`, last capture `2026-08-28T11:15:50.593Z`, final equity `99,391.19`, captured P&L `+0.02`, and maximum drawdown `0.00027165%`.
- [x] Confirm the only stability block remains `minimum_30_consecutive_calendar_days_not_met`.
- [x] Confirm the command was read-only and continuous paper-order submission remains disabled.
- [ ] Verify the natural daily scheduler cycle after `2026-08-29T00:00:00Z` and append its persisted audit evidence.

### Phase 6.317 — Railway diagnostic command-path hardening (2026-08-28)

- [x] Reproduce the root-level compiled command path failure without exposing secrets or changing state.
- [x] Confirm deployed compiled Worker commands are located below `/app/apps/worker/dist`.
- [x] Document the corrected Railway SSH path for the read-only performance report.
- [x] State the read-only and paper-only safety boundary in the runbook.
- [x] Confirm GitHub Actions run `33142688927` for commit `0e08b10` completed successfully.
- [ ] Verify the natural daily scheduler cycle after `2026-08-29T00:00:00Z`.

### Phase 6.316 — Hosted paper-performance evidence checkpoint (2026-08-28)

- [x] Run the deployed read-only performance report using the Worker’s compiled command path.
- [x] Confirm the report is `ready` with 100 reconciled snapshots and `snapshotCount: 100`.
- [x] Confirm paper evidence spans 1 consecutive calendar day (`2026-08-28T03:03:57.522Z` through `2026-08-28T04:41:27.808Z`).
- [x] Confirm final equity `99,390.97`, total captured P&L `+0.27`, total return `0.00027166%`, and maximum drawdown `0.00036221%`.
- [x] Confirm the only stability block is `minimum_30_consecutive_calendar_days_not_met`.
- [x] Confirm the report was read-only and continuous paper-order submission remains disabled.
- [ ] Verify the first natural daily scheduler cycle after `2026-08-29T00:00:00Z` and continue the 30-day evidence gate.

### Phase 6.315 — Verification and hosted-runtime checkpoint (2026-08-28)

- [x] Run the complete local Vitest suite: 77 test files and 295 tests passed.
- [x] Run ESLint with `--max-warnings=0`; no warnings or errors reported.
- [x] Confirm GitHub Actions run `33141957155` for commit `14851b2` completed successfully.
- [x] Confirm the hosted Worker remains healthy in `paper_autopilot` mode with position management ready and no blocked reasons.
- [x] Confirm continuous paper-order submission remains disabled and Telegram remains approved-only with a 24-hour routine cooldown.
- [ ] Verify the next natural daily cycle after `2026-08-29T00:00:00Z` and append its persisted audit evidence.
- [ ] Publish the verified branch build to the production Vercel alias when the free-tier deployment quota permits.

### Phase 6.314 — Public runtime-status alignment (2026-08-28)

- [x] Align the public landing page with the hosted Worker’s `paper_autopilot` operating mode.
- [x] Clarify that continuous order submission is disabled as a separate execution gate.
- [x] Remove stale Observe-mode/foundation wording from the public status surface.
- [x] Attempt production publication; Vercel still reports the free-tier `api-deployments-free-per-day` limit and leaves the existing alias unchanged.
- [x] Attempt promotion of the existing verified preview; Vercel applies the same quota restriction and production remains unchanged.
- [ ] Publish the verified branch build to the production Vercel alias when deployment quota permits.

### Phase 6.313 — Clean-checkout CI test bootstrap (2026-08-28)

- [x] Inspect the latest phase-branch GitHub Actions failure and identify missing workspace package build artifacts as the cause.
- [x] Build all workspace packages before Vitest in the paper-only CI workflow.
- [x] Verify the corrected order locally: 5 workspace package builds and 77 test files / 295 tests passed.
- [x] Push the workflow fix in commit `857f4d0` and confirm GitHub Actions runs `33141439614` and `33141550294` completed successfully.

### Phase 6.312 — Secret-surface security checkpoint (2026-08-28)

- [x] Run `audit:secret-surfaces` against source and browser output.
- [x] Confirm no Alpaca, Telegram, database, Clerk, or deployment credential-like values are exposed.
- [x] Preserve server-side secret storage and paper-only execution gates.
- [ ] Continue daily paper evidence and verify the next natural scheduler cycle.

### Phase 6.311 — Phase-branch CI coverage (2026-08-28)

- [x] Add `phase-6-10-operator-health` to the CI push trigger.
- [x] Preserve read-only repository permissions and paper-only verification steps.
- [x] Push the workflow change in commit `27f63d3`.
- [ ] Inspect the resulting GitHub Actions run when repository access exposes it.

### Phase 6.310 — Operator monitoring-link alignment (2026-08-28)

- [x] Replace the stale Vercel preview URL in README monitoring links.
- [x] Point operators to `https://papertrader-web.vercel.app`.
- [x] Preserve Railway health links and paper-only execution safeguards.
- [x] Push the documentation update in commit `df26dcd`.
- [ ] Continue daily evidence and verify the next natural scheduler cycle.

### Phase 6.309 — Pre-cycle post-deployment heartbeat (2026-08-28)

- [x] Confirm the deployed Worker remains `healthy` in `paper_autopilot` mode.
- [x] Confirm research and durable schedulers remain scheduled for `2026-08-29T00:00:00Z`.
- [x] Confirm position management remains `ready` with no blocked reasons.
- [x] Confirm Telegram policy remains approved-only with a 24-hour routine cooldown.
- [x] Confirm continuous order submission remains disabled.
- [ ] Verify the natural UTC cycle after the scheduled boundary.

### Phase 6.308 — Domain risk-contract regression hardening (2026-08-28)

- [x] Add a direct domain assertion for `estimatedLossPercent = 5.00000000` at the invested-notional limit.
- [x] Rebuild the domain package successfully.
- [x] Run the complete suite: 77 files and 295 tests passed.
- [x] Run ESLint with zero warnings.
- [x] Preserve the deployed paper-only runtime and deterministic risk gates.
- [ ] Continue daily evidence and verify the next natural scheduler cycle.

### Phase 6.307 — Hosted broker-truth reconciliation (2026-08-28)

- [x] Run the guarded hosted paper reconciliation against Alpaca paper broker truth.
- [x] Confirm reconciliation completed without submitting, cancelling, or modifying an order.
- [x] Confirm performance report remains `ready` with 100 snapshots.
- [x] Confirm only `minimum_30_consecutive_calendar_days_not_met` blocks stability.
- [x] Confirm Worker health, research/durable schedulers, and position management remain healthy/ready.
- [ ] Continue daily evidence and verify the next natural UTC cycle.

### Phase 6.306 — Fresh hosted performance checkpoint (2026-08-28)

- [x] Run the hosted read-only paper performance report after the risk-policy deployment.
- [x] Confirm 100 reconciled snapshots and report status `ready`.
- [x] Confirm final equity `99,391.01`, total captured P&L `+0.06`, and maximum drawdown `0.00027165%`.
- [x] Confirm the only stability block is `minimum_30_consecutive_calendar_days_not_met`.
- [x] Confirm Worker health, schedulers, and position management remain healthy/ready.
- [x] Confirm continuous order submission remains disabled.
- [ ] Continue daily paper evidence toward the 30-day stability gate.

### Phase 6.305 — Risk-policy consumer verification (2026-08-28)

- [x] Run API TypeScript validation successfully after the risk metric correction.
- [x] Run Web TypeScript validation successfully after the risk metric correction.
- [x] Build the optimized Web application successfully; dashboard, agent detail, and export routes remain intact.
- [x] Preserve paper mode, deterministic risk controls, and dry-run execution.
- [ ] Continue daily paper evidence and verify the next natural scheduler cycle.

### Phase 6.304 — Deployed invested-notional risk policy reporting (2026-08-28)

- [x] Deploy the corrected risk metric to the Railway Worker.
- [x] Confirm deployment `a52317cd-89ba-43c1-be00-1d2a19cbaea3` reached `SUCCESS`.
- [x] Confirm hosted Worker health is `healthy`, research/durable schedulers are scheduled, and position management is ready.
- [x] Confirm hosted Paper Autopilot readiness is `ready` with fresh reconciliation at 31 seconds.
- [x] Confirm policy remains baseline `100000`, 5% maximum invested-notional risk, and 5% maximum stop distance.
- [x] Confirm execution remains `dry_run` and continuous order submission remains disabled.
- [ ] Continue daily paper evidence and monitor the next natural cycle.

### Phase 6.303 — Invested-notional risk reporting fix (2026-08-28)

- [x] Change `estimatedLossPercent` to calculate against invested notional rather than total account equity.
- [x] Preserve non-negative equity validation and deterministic 5% approval enforcement.
- [x] Update the dry-run regression expectation to `5.00000000%` for a 5% stop.
- [x] Rebuild the domain package and run the complete suite: 77 files and 295 tests passed.
- [x] Run ESLint with zero warnings and Worker TypeScript validation successfully.
- [x] Push the fix in commit `e76053b`.
- [ ] Deploy the safety fix to Railway and verify hosted readiness before any continuous-order decision.

### Phase 6.302 — Paper Autopilot runtime-readiness verification (2026-08-28)

- [x] Run the hosted guarded Paper Autopilot runtime-readiness command.
- [x] Confirm all prerequisite checks pass, including paper mode, broker/database credentials, scheduler activation, and inactive kill switch.
- [x] Confirm reconciliation freshness is `fresh` at 59 seconds.
- [x] Confirm policy remains initial baseline `100000`, maximum loss risk `5%`, and maximum stop distance `5%`.
- [x] Confirm execution status is `dry_run` and continuous order submission remains disabled.
- [ ] Continue daily paper evidence and obtain separate authorization before enabling continuous submission.

### Phase 6.301 — Runtime safety heartbeat (2026-08-28)

- [x] Confirm Worker health remains `healthy` in `paper_autopilot` mode.
- [x] Confirm research and durable schedulers are both scheduled for `2026-08-29T00:00:00Z`.
- [x] Confirm position management completed at `2026-08-28T03:59:29Z` with no blocked reasons.
- [x] Confirm Telegram remains ready with approved-only risk alerts and a 24-hour routine cooldown.
- [x] Confirm continuous paper-order submission remains disabled.
- [ ] Verify the next natural UTC cycle and append its persisted audit evidence.

### Phase 6.300 — Pre-natural-cycle safety checkpoint (2026-08-28)

- [x] Confirm the live Worker health contract remains `healthy` in paper mode.
- [x] Confirm research and durable schedulers remain scheduled for the next UTC boundary.
- [x] Confirm position management has a recent run and no blocked reasons.
- [x] Confirm Telegram remains ready with approved-only risk alerts and a 24-hour routine cooldown.
- [x] Confirm continuous paper-order submission remains disabled.
- [ ] Verify the natural daily cycle after `2026-08-29T00:00Z`.

### Phase 6.299 — Runtime heartbeat after guarded cycle (2026-08-28)

- [x] Confirm Worker health remains `healthy` and paper-only after the guarded cycle.
- [x] Confirm research and durable schedulers remain scheduled for `2026-08-29T00:00:00Z`.
- [x] Confirm position management remains `ready` with a recent run and no blocked reasons.
- [x] Confirm Telegram remains ready with approved-only risk alerts and a 24-hour routine cooldown.
- [x] Confirm continuous paper-order submission remains disabled.
- [ ] Verify the next natural UTC cycle and append its persisted audit evidence.

### Phase 6.298 — Fresh guarded cycle verification (2026-08-28)

- [x] Enqueue a fresh bounded guarded daily run through the durable queue path.
- [x] Confirm the persistent Worker consumed the job and advanced its scheduler `lastRunAt`.
- [x] Run the cycle-level verifier with the cycle start timestamp; result is `status: "verified"`.
- [x] Confirm reconciliation is fresh and both queues have zero queued/active jobs.
- [x] Confirm paper mode and continuous order submission remain unchanged.
- [ ] Continue natural UTC cycles and the 30-day evidence gate.

### Phase 6.297 — Pre-cycle runtime heartbeat (2026-08-28)

- [x] Confirm Worker health remains `healthy` in paper mode.
- [x] Confirm research scheduler is enabled, handler-enabled, and `scheduled` for `2026-08-29T00:00:00Z`.
- [x] Confirm durable daily scheduler is enabled and `ready` for `2026-08-29T00:00:00Z`.
- [x] Confirm position management is `ready` with a recent run and no blocked reasons.
- [x] Confirm Telegram remains ready with approved-only risk alerts and a 24-hour routine cooldown.
- [x] Confirm continuous paper-order submission remains disabled.
- [ ] Verify the natural cycle after `2026-08-29T00:00:00Z` and append its persisted audit evidence.

### Phase 6.296 — Recovery acceptance verification (2026-08-28)

- [x] Run the guarded hosted recovery-readiness command without exposing secrets or changing infrastructure.
- [x] Confirm `approvalReferencePresent:true`, `verifiedAtPresent:true`, and `verifiedFlag:true`.
- [x] Confirm recovery status is `verified`.
- [x] Confirm no broker order, scheduler setting, database, or production dashboard state changed.
- [ ] Continue daily paper evidence and retry current-branch production publication after Vercel constraints clear.

### Phase 6.295 — Production alias state verification (2026-08-28)

- [x] Inspect `papertrader-web.vercel.app` and confirm its production deployment status is `Ready`.
- [x] Confirm the production alias remains stable and protected by the Clerk sign-in boundary.
- [x] Confirm current-branch preview deployments are `Ready` and available for authenticated review.
- [x] Confirm attempted promotion did not alter the production alias.
- [ ] Promote the current verified preview after Vercel team/quota access permits.

### Phase 6.294 — Production publication attempt (2026-08-28)

- [x] Confirm a current-branch Vercel preview is `Ready` and contains the production dashboard build.
- [x] Attempt production deployment from the verified workspace.
- [x] Confirm Vercel rejected the deployment only for the daily free-tier quota; no partial promotion occurred.
- [x] Preserve the existing production alias and paper-trading runtime unchanged.
- [ ] Retry production publication after the quota window resets, then perform authenticated visual verification.

### Phase 6.293 — Dashboard production build checkpoint (2026-08-28)

- [x] Build the Web application with the production Next.js pipeline successfully.
- [x] Confirm dynamic dashboard, agent-detail, and export routes are generated without type or build errors.
- [x] Confirm the production dashboard responds with the Clerk sign-in redirect when unauthenticated.
- [x] Confirm hosted Worker research and daily schedulers remain scheduled and position management remains ready.
- [x] Preserve paper mode, deterministic risk controls, and the disabled continuous order-submission gate.
- [ ] Complete an authenticated visual dashboard pass and continue the 30-day paper evidence gate.

### Phase 6.292 — Always-on runtime integrity checkpoint (2026-08-28)

- [x] Confirm the hosted research scheduler is `scheduled` with the next UTC run recorded.
- [x] Confirm the durable daily scheduler is `ready` with the same next UTC run and a completed latest audit.
- [x] Confirm position management is `ready` and running on its 60-second interval.
- [x] Confirm production dashboard routing is live and unauthenticated access redirects to the Clerk sign-in boundary.
- [x] Confirm paper mode, kill switch, deterministic risk policy, and continuous order submission settings remain unchanged.
- [ ] Complete authenticated dashboard visual verification and continue the 30-day paper evidence gate.

### Phase 6.291 — Full application quality checkpoint (2026-08-28)

- [x] Run the complete regression suite: 77 files and 295 tests passed.
- [x] Run Web TypeScript validation successfully.
- [x] Run API TypeScript validation successfully.
- [x] Run repository ESLint with zero warnings.
- [x] Preserve paper mode, deterministic risk controls, scheduler, and notification policy.
- [ ] Continue daily scheduled evidence until the 30-day stability gate is satisfied.

### Phase 6.290 — Hosted performance reconciliation checkpoint (2026-08-28)

- [x] Run the hosted read-only paper performance report through the Worker network.
- [x] Confirm 100 reconciled account snapshots are persisted and the report status is `ready`.
- [x] Confirm captured metrics: final equity `99,390.86`, total P&L `+0.31`, max drawdown `0.19` (`0.00019116%`).
- [x] Confirm the only stability block is `minimum_30_consecutive_calendar_days_not_met`.
- [x] Confirm paper mode and continuous order submission remain unchanged.
- [ ] Continue daily scheduled evidence until the 30-day stability gate is satisfied.

### Phase 6.289 — Release readiness regression checkpoint (2026-08-28)

- [x] Verify hosted Worker health: `healthy`, paper mode, scheduler `ready`, position management `ready`.
- [x] Verify the scheduler has a persisted next run at `2026-08-29T00:00:00Z` and the last guarded cycle completed successfully.
- [x] Verify work and dead-letter queues have zero queued/active jobs; retained failure history is non-actionable.
- [x] Verify Telegram remains enabled with approved-only risk alerts and a 24-hour routine cooldown.
- [x] Run the complete regression suite: 77 files and 295 tests passed.
- [x] Confirm continuous paper-order submission remains disabled.
- [ ] Observe the next natural UTC cycle and continue the 30-day paper evidence gate.

### Phase 6.270 — Critical-path status verification (2026-08-28)

- [x] Verify live Worker health: `healthy`, paper mode, kill switch inactive, scheduler `ready`, position management `ready`.
- [x] Verify live notification policy: approved risk decisions only and one routine digest per 24-hour scope.
- [x] Verify continuous order submission remains disabled pending the explicit paper-order gate.
- [ ] Validate the next scheduled cycle and its persisted audit/digest records.
- [ ] Complete authenticated dashboard visual verification and production alias publication when Vercel quota/team access permits.

### Phase 6.271 — Verification pass and execution-path check (2026-08-28)

- [x] Run the complete local regression suite: 77 files and 293 tests passed.
- [x] Confirm the latest Worker deployment `46de0908-5707-4712-8d14-80d31c36a432` is `SUCCESS` and the public health contract remains healthy.
- [x] Confirm no persistent execution flag was changed while checking the guarded path.
- [ ] Resolve the deployed SSH command-runtime mismatch (the interactive shell does not expose the Node executable) or use the next scheduled cycle for hosted e2e evidence.

### Phase 6.272 — Release baseline verification (2026-08-28)

- [x] Run ESLint with zero warnings across `apps` and `packages`.
- [x] Run TypeScript checks for Worker, API, and Web applications.
- [x] Reconfirm hosted Worker health, UTC scheduler readiness, 60-second position management, and the approved-only/24-hour Telegram policy.
- [x] Confirm Paper Autopilot order submission remains disabled.
- [ ] Observe the next scheduled cycle and capture its persisted evidence.

### Phase 6.273 — Hosted guarded e2e execution-path verification (2026-08-28)

- [x] Resolve the Railway SSH runtime-path issue: the deployed Node runtime is present at `/mise/installs/node/22.23.2/bin/node`; the default interactive PATH omitted it.
- [x] Execute the guarded paper e2e command with all order-submission gates disabled; no broker order was submitted.
- [x] Preserve fail-closed behavior when the research input/handler did not complete; the command emitted only its bounded stage failure.
- [x] Diagnose the intermittent Alpaca research-stage failure using a separately bounded research verification, then rerun the e2e evidence cycle once.

### Phase 6.274 — Hosted paper e2e evidence completed (2026-08-28)

- [x] Deploy the bounded daily-bar candidate fallback; Railway deployment `bf4e9a84-795a-4f58-9a24-d14c093e15b5` reached `SUCCESS`.
- [x] Run the guarded hosted e2e flow with order submission disabled and verify it completed with `status: "completed"`.
- [x] Confirm the research run persisted as `paper-e2e-fast-20260828-06-research` and the deterministic risk decision was persisted as `rejected`.
- [x] Confirm the run reported no broker order ID and therefore submitted no order.
- [ ] Run the same flow with a separately approved one-shot paper order only after the operator explicitly authorizes that execution check.

### Phase 6.275 — One-shot paper-order preflight (2026-08-28)

- [x] Run the guarded live preflight for `AAPL` without submitting, cancelling, or modifying any order.
- [x] Confirm the preflight has a baseline confirmation, two succeeded research candidates, and a fresh market snapshot.
- [x] Confirm the only blocked reason is `paper_order_submission_gate_disabled`.
- [ ] Obtain explicit operator authorization before enabling the command-scoped one-shot paper execution check.

### Phase 6.276 — One-shot paper order executed and reconciled (2026-08-28)

- [x] Receive explicit operator authorization reference `PAPER-ORDER-ACTIVATE-001`.
- [x] Submit exactly one command-scoped paper order for quantity `1` through the deterministic approval path.
- [x] Confirm Alpaca paper order `9dcae89d-fbd2-4edb-b662-701bf380601d` was returned and post-order reconciliation completed.
- [x] Confirm continuous `PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED` was not changed persistently.
- [ ] Observe the broker order until terminal fill/cancel/expiry state and confirm the resulting position/exit-plan lifecycle.

### Phase 6.277 — Post-order position and performance verification (2026-08-28)

- [x] Run the command-scoped position-management pass after the paper order.
- [x] Confirm one managed position and zero exit submissions; the stored deterministic exit plan remains active.
- [x] Generate the read-only paper performance report: one calendar evidence day, total P&L `-0.02`, and max drawdown `0.00002012%` at capture.
- [ ] Continue daily reconciliation, position management, and evidence collection toward 30 consecutive calendar days.

### Phase 6.278 — Notification and lifecycle gate verification (2026-08-28)

- [x] Confirm the managed position remains under the deterministic exit-plan monitor with zero exit submissions.
- [x] Run the Telegram no-send test preflight; delivery configuration and credential formats are valid.
- [x] Confirm no test notification was sent while the non-secret approval reference is absent.
- [ ] Supply a separate Telegram test approval reference only if a test message is desired.
- [ ] Continue daily evidence collection toward 30 consecutive calendar days.

### Phase 6.279 — Paper Autopilot runtime gate verification (2026-08-28)

- [x] Run the command-scoped Paper Autopilot runtime-readiness check without changing persistent variables.
- [x] Confirm all prerequisite checks pass: paper mode, broker/database/credentials, scheduler/handler, risk policy, fresh reconciliation, and inactive kill switch.
- [x] Confirm execution status remains `dry_run` with order submission disabled.
- [ ] Obtain explicit approval to enable continuous paper order submission, or keep the system in dry-run evidence mode.

### Phase 6.280 — Post-execution safety verification (2026-08-28)

- [x] Recheck hosted Worker health after the one-shot paper execution.
- [x] Confirm durable scheduler is `scheduled` and position management is `ready`.
- [x] Confirm persistent continuous order submission remains `false`.
- [ ] Continue daily reconciliation, position monitoring, and 30-day evidence collection.

### Phase 6.281 — Post-execution regression baseline (2026-08-28)

- [x] Run the complete regression suite: 77 files and 293 tests passed.
- [x] Run ESLint with zero warnings across `apps` and `packages`.
- [x] Run the Worker TypeScript check successfully.
- [ ] Verify the next UTC scheduled cycle and append its persisted audit evidence.

### Phase 6.282 — Scheduled-cycle verification enabled (2026-08-28)

- [x] Deploy the verifier change; Railway deployment `9fcad8b5-c8f5-4f39-afe2-76b482e33414` reached `SUCCESS`.
- [x] Verify the latest scheduled cycle from `2026-08-28T00:00:00Z` with fresh reconciliation captured at `2026-08-28T01:50:59Z`.
- [x] Confirm both durable queues are present with zero queued/active jobs; retained work-queue failure history does not block verification.
- [x] Confirm the hosted verifier returned `status: "verified"` without changing execution settings.
- [ ] Verify the next natural UTC cycle and add its digest/evidence record.

### Phase 6.283 — Durable position-alert cooldown (2026-08-28)

- [x] Replace process-local position-detection deduplication with a durable 24-hour cooldown key.
- [x] Preserve immediate lifecycle alerts while preventing duplicate alerts after Worker restarts.
- [x] Pass position-runtime and Telegram notifier tests, Worker typecheck, and lint.
- [x] Deploy Worker release `6dccdf55-d556-4fe7-a9af-1ba107bcae8e`; deployment reached `SUCCESS`.
- [ ] Verify the next natural cycle and confirm alert counts remain within policy.

### Phase 6.284 — Post-release queue and health verification (2026-08-28)

- [x] Verify hosted Worker health after the cooldown release.
- [x] Confirm scheduler `scheduled`, position management `ready`, and Telegram `ready` with the expected policy.
- [x] Confirm work and dead-letter queues have zero queued/active jobs; retained failure history is non-actionable.
- [x] Confirm continuous paper-order submission remains disabled.
- [ ] Verify the next natural UTC cycle and its persisted digest/evidence record.

### Phase 6.286 — One-run contention containment (2026-08-28)

- [x] Record the guarded one-run attempt as incomplete because its provenance audit was not persisted.
- [x] Confirm the recurring Worker remains `healthy`/`scheduled` with position management `ready`.
- [x] Confirm durable queues have zero queued/active jobs; only retained historical failure count remains.
- [x] Confirm continuous paper-order submission remains disabled and no broker order was created by the attempt.
- [ ] Verify the next natural UTC cycle; do not run a shared-queue manual command while the recurring scheduler is active.

### Phase 6.287 — Guarded daily cycle consumed and verified (2026-08-28)

- [x] Enqueue a fresh guarded daily job with run ID `manual-daily-preparation-phase-6-288` through the durable queue path.
- [x] Confirm the persistent Worker consumed the job and completed the matching scheduler audit.
- [x] Confirm audit completion at `2026-08-28T01:56:40Z` with fresh reconciliation captured after cycle start.
- [x] Confirm both durable queues have zero queued/active jobs and the verifier returned `status: "verified"`.
- [ ] Verify the next natural UTC cycle and continue the 30-day evidence record.

### Phase 6.288 — Same-day cycle cooldown verification (2026-08-28)

- [x] Enqueue and consume a second guarded daily cycle with run ID `manual-daily-preparation-phase-6-289`.
- [x] Verify its scheduler audit completed and reconciliation was fresh.
- [x] Confirm both durable queues have zero queued/active jobs.
- [x] Confirm no Telegram events were persisted in the five-minute post-cycle window, consistent with the 24-hour routine cooldown.
- [ ] Verify the next natural UTC cycle and continue the 30-day evidence record.

### Phase 6.269 — Paper Autopilot runtime readiness (2026-08-28)

- [x] Run the guarded hosted runtime-readiness check without exposing secrets or submitting an order.
- [x] Confirm all paper, broker, database, scheduler, baseline, risk-policy, and kill-switch gates pass.
- [x] Confirm reconciliation freshness is `fresh` (39 seconds at capture) and execution status remains `dry_run`.
- [ ] Verify the next scheduled daily cycle and its once-per-24-hour digest behavior.

### Phase 6.268 — Fresh guarded-run end-to-end verification (2026-08-28)

- [x] Enqueue a fresh guarded manual job with run ID `manual-daily-preparation-verify-20260828-01`.
- [x] Confirm job `4e697c75-69a2-574a-b23b-aa4052b43135` completed with zero retries.
- [x] Confirm the matching manual audit row completed with no failure code.
- [x] Confirm no duplicate routine digest was created inside the 24-hour cooldown window.
- [x] Confirm no order-submission setting changed and no broker order was created.
- [ ] Complete authenticated dashboard visual verification and publish the Vercel production alias after quota/team constraints clear.

### Phase 6.266 — Post-release notification verification (2026-08-28)

- [x] Compare Telegram event counts after the cooldown release against the historical 24-hour window.
- [x] Confirm no post-release routine portfolio or research digest duplicates were persisted.
- [x] Confirm the only post-release Telegram event was the expected critical legacy scheduler retry failure.
- [x] Confirm the latest scheduled daily audit remains completed and Worker health remains healthy/scheduled.
- [ ] Verify the next UTC scheduled cycle produces at most one routine digest per scope.

### Phase 6.267 — Fresh guarded-run trigger support (2026-08-28)

- [x] Allow the guarded queue command to accept a bounded, non-secret run ID for a fresh verification trigger.
- [x] Keep default same-day idempotency and UUID job IDs unchanged.
- [x] Deploy and run a fresh trigger, then verify its manual audit record completes; follow-on evidence is recorded in Phase 6.268.

### Phase 6.265 — Legacy queue cleanup and scheduler recovery (2026-08-28)

- [x] Remove only the validated stale pre-fix retry job; terminal failure/dead-letter history remains retained.
- [x] Restart the Worker and verify Railway deployment `a9cc189a-6dab-43fc-b193-ffebc76bc017` reached `SUCCESS`.
- [x] Verify hosted Worker health is `healthy`, scheduler `scheduled`, position management `ready`, Telegram `ready`, and order submission disabled.
- [ ] Validate a fresh manual trigger on the next UTC date under its distinct audit identity.

### Phase 6.264 — Legacy queue retry containment (2026-08-28)

- [x] Inspect pg-boss job state without exposing payloads or credentials.
- [x] Confirm the normal scheduled daily run is `completed` with no failure code.
- [x] Confirm direct paper reconciliation completes successfully and no broker order is submitted.
- [x] Confirm pre-fix manual jobs are bounded by the configured retry limit; one is terminal `failed` and one is on its final retry.
- [ ] Verify the final legacy retry reaches terminal/dead-letter state; fresh manual jobs on the next UTC date should use the distinct audit identity.

### Phase 6.260 — Guarded daily-cycle evidence attempt (2026-08-28)

- [x] Confirm the deployed Worker starts with the notification policy visible in its redacted health/log contract.
- [ ] Complete a guarded durable run-once enqueue from the local operator environment; the command failed closed with a generic queue error after Railway variable injection, and no order-submission flag was changed.
- [ ] Verify the resulting persisted daily digest and risk-cycle records after a successful scheduled run.

### Phase 6.261 — Safe guarded-run diagnostics (2026-08-28)

- [x] Add failure-stage-only diagnostics to the guarded enqueue command; no error text or secret-bearing connection data is emitted.
- [ ] Redeploy and rerun the command inside the Worker network to identify the failing stage.

### Phase 6.262 — Durable queue job-id compatibility (2026-08-28)

- [x] Replace the manual daily job key with a deterministic UUID accepted by pg-boss.
- [x] Preserve same-day idempotency and add UUID-format regression coverage.
- [x] Deploy the UUID job-id fix; Railway deployment `b20fc847-991b-447d-b8e8-5ae3e4944b6c` reached `SUCCESS`.
- [x] Rerun the guarded enqueue inside the Worker network; job `347d270d-2ed2-5371-989b-2922d2276911` returned `queued:true`.
- [x] Isolate broker/database access with direct paper reconciliation; it completed successfully without submitting an order.
- [ ] Verify the persistent Worker consumes the queued job and writes the daily-cycle audit/digest records; queue inspection currently shows two queued jobs.

### Phase 6.263 — Manual daily-run audit identity (2026-08-28)

- [x] Deploy the distinct manual audit run ID fix; Railway deployment `72911f7c-6f72-4147-94cd-c5e90a8b0673` reached `SUCCESS`.
- [x] Confirm the daily scheduled run completed successfully in `durable_schedule_runs` with no failure code.
- [x] Re-run the manual trigger; it returned `queued:false` against the existing idempotent job, without creating a broker order.
- [x] Verify 293 tests, Worker TypeScript, ESLint, and diff hygiene.
- [ ] Verify a fresh manual trigger on the next UTC date completes under its distinct audit ID; two pre-fix retry jobs remain queued and require bounded cleanup/expiry.

### Phase 6.259 — Dashboard notification policy surface (2026-08-28)

- [x] Add the 24-hour routine digest and approved-only risk-alert policy to the authenticated dashboard health card.
- [x] Preserve backward-compatible parsing defaults while the API rolls out the new fields.
- [x] Verify 293 tests, web/API/Worker TypeScript, ESLint, and the production Next.js build.
- [x] Deploy the API; Railway deployment `1838ba5b-6b51-4a46-a8b4-430e8c33c475` reached `SUCCESS` and API health is `healthy`.
- [ ] Publish the web UI after Vercel's daily deployment quota resets; source is pushed in commit `9b8652f`.
- [x] Confirm latest Vercel preview `https://papertrader-acc3jzcpc-altafrs-projects.vercel.app` is Ready; protected dashboard correctly redirects unauthenticated requests to Vercel SSO.

### Phase 6.258 — Notification policy health visibility (2026-08-28)

- [x] Expose the active 24-hour routine cooldown in Worker health without exposing secrets.
- [x] Expose that risk-decision Telegram alerts are restricted to approved selections.
- [x] Verify Worker/domain TypeScript, ESLint, diff hygiene, and the full 293-test suite.
- [x] Deploy the health-contract update and verify the hosted `/health` response.
- [x] Railway deployment `d7d13121-1c6f-47ee-af5d-75120177922b` reached `SUCCESS`; `/health` reports `routineCooldownHours:24` and `riskDecisionAlerts:approved_only`.

### Phase 6.257 — Durable 24-hour notification cooldown (2026-08-28)

- [x] Add a persistence-backed cooldown check for routine digest alerts.
- [x] Prevent UTC midnight boundary duplicates while preserving immediate critical/lifecycle alerts.
- [x] Verify cooldown behavior across restarts/day boundaries with regression coverage.
- [x] Verify 293 tests across 77 files, Worker/database TypeScript, ESLint, and diff hygiene.
- [x] Deploy the cooldown hardening to Railway and verify the Worker health response.
- [x] Railway deployment `fa095a6d-eaf2-411f-944e-4233a17c24ef` reached `SUCCESS`; Worker health is `healthy`, scheduler `scheduled`, position management `ready`, and Telegram `ready`.

### Phase 6.256 — Notification policy regression coverage (2026-08-28)

- [x] Add a pure policy contract proving approved risk selections notify while rejected decisions remain audit-only.
- [x] Verify the low-noise research and risk notification tests together.
- [x] Verify the full suite: 292 tests across 77 files, Worker TypeScript, ESLint, and diff hygiene.
- [ ] Observe the next scheduled daily digest and verify authenticated dashboard rendering.

### Phase 6.255 — Low-noise Telegram digest policy (2026-08-28)

- [x] Keep critical failures, approved selections, order lifecycle, and position lifecycle alerts immediate.
- [x] Suppress routine zero-candidate research notices and individual rejected risk-candidate Telegram warnings while retaining their durable audit records.
- [x] Deduplicate research selection and portfolio/P&L summary alerts to one UTC calendar day across restarts.
- [x] Verify 291 tests, Worker TypeScript, ESLint, and diff hygiene locally.
- [x] Deploy the Worker and verify Railway reports `SUCCESS` with healthy Telegram alert state.
- [x] Clarify the alert contract in `project-overview.md` and `architecture.md`.

### Phase 6.202 — Credential-free hosted auth-boundary verification (2026-08-26)

- [x] Add `pnpm verify:operator-auth-boundary` to check unauthenticated overview and CSV endpoints.
- [x] Add mocked success/failure tests and run the verifier against Railway production.
- [x] Confirmed both hosted endpoints return `401`; no credentials were used or exposed.
- [x] Verify 254 tests, typecheck, lint, production build, and the live boundary check pass.
- [ ] Add a protected operator token to run the complementary authenticated contract check in CI.

### Phase 6.201 — CI monitoring link and status badge (2026-08-26)

- [x] Add a live GitHub Actions status badge to the repository README.
- [x] Add a direct workflow-page link for monitoring and manually starting paper-only verification.
- [x] Verify the local quality suite remains green.
- [ ] Trigger and inspect a manual workflow run; GitHub CLI is not installed in the current environment.

### Phase 6.200 — Manual paper-only verification trigger (2026-08-26)

- [x] Add GitHub Actions `workflow_dispatch` support for on-demand verification after deployments.
- [x] Preserve the same read-only, paper-only quality gates and optional protected hosted-contract check.
- [x] Update the repository runbook text and verify the local quality suite remains green.
- [ ] Execute a manual hosted workflow run and verify its result in GitHub Actions.

### Phase 6.199 — Preserved performance-range audit context (2026-08-26)

- [x] Preserve active audit date bounds when switching the paper-performance window.
- [x] Reuse the same validated URL-state builder for performance links and audit navigation.
- [x] Add regression coverage and verify 252 tests, typecheck, lint, and production build pass.
- [x] Publish Vercel preview `https://papertrader-4r854j862-altafrs-projects.vercel.app`; authenticated hosted navigation remains pending behind deployment protection.

### Phase 6.198 — Credential-optional hosted contract CI (2026-08-26)

- [x] Extend GitHub Actions with an optional hosted operator-overview/CSV contract check.
- [x] Keep the live check skipped when protected `OPERATOR_AUTH_TOKEN` is absent; local tests and quality gates always run.
- [x] Document the secret names and preserve token secrecy through environment-only injection.
- [ ] Verify the workflow's live authenticated branch after the protected repository secrets are configured.

### Phase 6.197 — Audit page-count visibility (2026-08-26)

- [x] Derive total audit pages from authenticated category totals and the active page size.
- [x] Render `Page X of Y` beside the active date window and persisted-event timestamp.
- [x] Add page-count tests for populated and empty histories.
- [x] Verify 252 tests, typecheck, lint, and production build pass.
- [x] Publish Vercel preview `https://papertrader-qm4n6lkn5-altafrs-projects.vercel.app`; authenticated hosted page-count rendering remains pending behind deployment protection.

### Phase 6.196 — Latest persisted audit-event provenance (2026-08-26)

- [x] Return the latest captured timestamp from the current bounded audit page metadata.
- [x] Render it beside the active date range and coverage totals using UTC formatting.
- [x] Preserve explicit `Not available` handling when the page contains no persisted events.
- [x] Verify 251 tests, typecheck, lint, and production build pass.
- [x] Deploy API `9ae089a8-804b-4617-8c85-145550424820` and Vercel preview `https://papertrader-b91d9tutm-altafrs-projects.vercel.app`; API health is healthy. Authenticated provenance rendering remains pending behind deployment protection.

### Phase 6.195 — Truthful unavailable-audit state (2026-08-26)

- [x] Show an explicit degraded-state notice when the authenticated operator overview cannot be read while account data is still available.
- [x] Clarify that empty audit tables must not be interpreted as zero historical records.
- [x] Add parser coverage for rejected/unavailable overview payloads.
- [x] Verify 251 tests, typecheck, lint, and production build pass.
- [x] Publish Vercel preview `https://papertrader-2qvbswrzu-altafrs-projects.vercel.app`; authenticated hosted rendering remains pending behind deployment protection.

### Phase 6.194 — Clearable audit filters and disabled navigation (2026-08-26)

- [x] Add a Clear action that removes audit date bounds while retaining the selected performance range.
- [x] Render unavailable Previous/Next controls as non-clickable states rather than links with only visual styling.
- [x] Verify 250 tests, typecheck, lint, and production build pass.
- [x] Publish Vercel preview `https://papertrader-i7mw93n6r-altafrs-projects.vercel.app`; authenticated hosted navigation remains pending behind deployment protection.

### Phase 6.193 — Explicit active audit-window label (2026-08-26)

- [x] Show the active audit date window as an explicit UTC range beside pagination and totals.
- [x] Preserve clear Beginning/Now labels when no bound is selected.
- [x] Add formatter tests and verify 250 tests, typecheck, lint, and production build pass.
- [x] Publish Vercel preview `https://papertrader-4oz2gi7r1-altafrs-projects.vercel.app`; authenticated hosted rendering remains pending behind deployment protection.

### Phase 6.192 — Preserved dashboard performance-window state (2026-08-26)

- [x] Preserve the selected 7-day, 30-day, or All performance range when using audit Previous/Next navigation.
- [x] Preserve the selected range when applying manual date filters or choosing audit presets.
- [x] Add URL-state helper coverage and verify 249 tests, typecheck, lint, and production build pass.
- [x] Publish Vercel preview `https://papertrader-7i1tyeyw7-altafrs-projects.vercel.app`; authenticated hosted navigation remains pending behind deployment protection.

### Phase 6.191 — Explicit audit-query validation errors (2026-08-26)

- [x] Return `400 invalid_operator_history_query` for malformed page, limit, or date-range parameters on JSON and CSV overview routes.
- [x] Preserve `401` authentication failures and `503` runtime/database failures.
- [x] Add focused classification tests for validation versus runtime errors.
- [x] Verify 248 tests, typecheck, lint, and production build pass.
- [x] Deploy API `587f5d15-2300-4be5-9155-64699302a39f`; health is healthy and unauthenticated malformed/valid overview requests both correctly return `401` before query parsing. Authenticated `400` validation inspection remains protected.

### Phase 6.190 — Complete audit coverage summary (2026-08-26)

- [x] Render totals for all audited categories: agents, filtered trades, executions, lifecycle events, and scheduler runs.
- [x] Keep the summary compact, dark-mode, read-only, and scoped to the active date filter.
- [x] Add a dashboard parser test proving all totals survive validation.
- [x] Verify 247 tests, typecheck, lint, and production build pass.
- [x] Publish Vercel preview `https://papertrader-3hjfgqi2x-altafrs-projects.vercel.app`; authenticated hosted rendering remains pending because deployment protection blocks unauthenticated inspection.

### Phase 6.189 — Testable authenticated deployment verifier (2026-08-26)

- [x] Refactor the verifier into an exported network-contract function while preserving the CLI entry point.
- [x] Add mocked authenticated success and `401` failure integration tests without using real credentials.
- [x] Preserve bearer-token secrecy and fail-closed behavior.
- [x] Verify 246 tests, typecheck, lint, and production build pass.
- [ ] Run the verifier against the hosted API with a real authenticated operator token when one is available.

### Phase 6.188 — Authenticated operator-overview deployment verifier (2026-08-26)

- [x] Add `pnpm verify:operator-overview`, using `OPERATOR_API_BASE_URL` and `OPERATOR_AUTH_TOKEN` only from the local environment.
- [x] Validate overview arrays, pagination metadata, filtered totals, and audit CSV strategy metadata columns.
- [x] Keep the token out of logs, files, source control, and browser code; missing credentials fail safely with exit code `2`.
- [x] Add contract tests and verify 244 tests, typecheck, lint, and production build pass.
- [ ] Run the verifier against the hosted API with an authenticated operator session token; deployment protection prevents obtaining that token through unauthenticated inspection.

### Phase 6.187 — Inclusive calendar-day audit filters (2026-08-26)

- [x] Normalize date-only `from` filters to `00:00:00.000Z` and date-only `to` filters to `23:59:59.999Z`.
- [x] Add focused boundary tests for lower-bound, upper-bound, and explicit-instant inputs.
- [x] Preserve parameterized SQL, authenticated access, and read-only behavior.
- [x] Verify 241 tests, typecheck, lint, and production build pass.
- [x] Deploy API `de82b44b-103d-4663-8b2f-544598849b56` and Vercel preview `https://papertrader-nu9t11oau-altafrs-projects.vercel.app`; API health is healthy and unauthenticated date-filtered overview/CSV requests return `401`. Authenticated boundary inspection remains behind deployment protection.

### Phase 6.186 — Audit history totals and date presets (2026-08-26)

- [x] Add parameterized filtered record counts for agents, filtered trades, execution decisions, lifecycle events, and scheduler runs.
- [x] Validate and parse totals in the authenticated overview read model.
- [x] Add one-click All, Today, 7-day, and 30-day dashboard presets while retaining manual date filters.
- [x] Show filtered totals beside the page controls without implying that shadow evidence is profitability evidence.
- [x] Verify 238 tests, typecheck, lint, and production build pass.
- [x] Deploy API `17a2293d-7cdd-4123-9412-60d89e17281e` and Vercel preview `https://papertrader-jgx315go9-altafrs-projects.vercel.app`; API health is healthy and unauthenticated filtered overview/CSV requests return `401`. Authenticated totals and preset rendering remain pending behind deployment protection.

### Phase 6.185 — Paginated and date-filtered audit history (2026-08-26)

- [x] Add authenticated `page`, `limit`, `from`, and `to` query parameters to the operator overview and audit CSV contracts.
- [x] Apply parameterized PostgreSQL date filters and bounded page sizes across agent runs, filtered trades, execution decisions, lifecycle events, and scheduler records.
- [x] Add read-only dashboard Previous/Next controls and date filters; export links preserve the active page and range.
- [x] Return pagination metadata, including whether another page is available, without changing strategy, risk, or order behavior.
- [x] Verify 238 tests, typecheck, lint, and production build pass.
- [x] Deploy API `e14114cb-b54e-4ad3-9416-b05a5550c2f3` and Vercel preview `https://papertrader-ree59e7ew-altafrs-projects.vercel.app`; API health is healthy, query-string routes are recognized, and unauthenticated overview/CSV requests return `401`. Authenticated inspection remains subject to deployment protection.

### Phase 6.184 — Strategy catalog metadata included in audit export (2026-08-26)

- [x] Extend the authenticated operator CSV schema with strategy version, asset class, owner, description, stage, lookback, and default-parameter fields.
- [x] Export one formula-safe `strategy_catalog` record per registered strategy alongside agent, decision, lifecycle, and timeline records.
- [x] Preserve read-only behavior and fail-closed authentication; no strategy configuration or order authority is added.
- [x] Verify 238 tests, typecheck, lint, and production build pass.
- [x] Deploy API `df02e5b1-6940-4b39-bc42-234a02bb0c6e`; hosted health is healthy and unauthenticated `/v1/operator-overview.csv` returns `401`. Authenticated CSV content remains pending because deployment protection prevents unauthenticated inspection.

### Phase 6.158 — Unified operator audit dashboard (2026-08-25)

- [x] Add authenticated `/v1/operator-overview` read model for agent rationale, filtered/shadow decisions, and paper execution provenance.
- [x] Show point-in-time signal fields (strategy, score, entry, stop, expiry, rationale, and outcome) without inventing missing broker metrics.
- [x] Consolidate agents, portfolio positions, order/fill history, performance, filtered trades, and decision log in the dark compact dashboard.
- [x] Mark execution decisions without attached market snapshots as incomplete rather than implying indicator coverage.
- [x] Verify 236 tests, typecheck, lint, and production build pass.
- [x] Deploy API `0f73391e-e92a-47f3-b7fd-a5df0224bef1` and Vercel preview `https://papertrader-1hnd36sky-altafrs-projects.vercel.app`; API health is healthy and unauthenticated overview access correctly returns `401`.
- [ ] Verify authenticated hosted rendering in the operator browser session.

### Phase 6.159 — Point-in-time decision indicators (2026-08-25)

- [x] Compute finalized-bar RSI14, EMA20, EMA50, ATR14, relative volume20, close, volume, and timestamp for strategy candidates.
- [x] Add immutable market-snapshot fields to shadow observations and paper submission persistence.
- [x] Add guarded migration `0011_decision_market_snapshots.sql` with reference `MARKET-SNAPSHOT-0011`; hosted migration plan now reports no pending migrations.
- [x] Expose indicator snapshots through `/v1/operator-overview` and display them in filtered-trade and execution-decision audit tables.
- [x] Verify 238 tests, typecheck, lint, and production builds; deploy Worker `558da0db-3aed-4359-a643-44924d1c054a` and API `1eef0fa3-2584-4109-b1f5-2c10e135e48d`.
- [ ] Verify authenticated hosted dashboard rendering and confirm a persisted signal carries the snapshot.

### Phase 6.160 — Research candidate audit evidence (2026-08-25)

- [x] Extend the scheduled research artifact candidate contract with RSI14, EMA20, EMA50, ATR14, relative volume20, close, volume, and timestamp.
- [x] Surface persisted research candidates in the authenticated operator overview as `research_candidate`, clearly separated from order decisions.
- [x] Run bounded paper stock research with approval reference `RESEARCH-INDICATOR-PHASE-160B`; persisted run `research-market-1787673210266` contains 2 candidates and 2 indicator snapshots.
- [x] Deploy Worker `e3f8d216-24e2-4aee-9055-e6c1acf9e84d`, API `2707630c-69d1-44d2-a6dc-67e282669440`, and Vercel preview `https://papertrader-mdd0s6aad-altafrs-projects.vercel.app`; API health is healthy.
- [ ] Verify the authenticated browser view displays the persisted candidates and indicator values.

### Phase 6.161 — Paper performance equity curve (2026-08-26)

- [x] Extend the authenticated paper-performance read model with per-snapshot equity, return, and drawdown points.
- [x] Add a compact dark-mode equity curve to the dashboard performance card with latest-capture timestamp.
- [x] Verify 238 tests, typecheck, lint, and production build pass.
- [x] Deploy API `92f951e8-bbdd-4f2b-ab51-bdefc951fe87`; hosted API health is healthy. Vercel preview: `https://papertrader-e7xfv7fhx-altafrs-projects.vercel.app`.
- [ ] Verify authenticated browser rendering; Vercel deployment protection currently redirects unauthenticated inspection to Vercel login.

### Phase 6.162 — Deterministic risk decision evidence (2026-08-26)

- [x] Persist structured risk evidence with paper submissions: estimated loss, estimated loss percentage, policy version, and deterministic reasons.
- [x] Add guarded migration `0012_risk_decision_evidence.sql`; apply it with reference `RISK-DECISION-0012` and verify no pending migrations.
- [x] Expose risk evidence in `/v1/operator-overview` and render it in the compact execution decision log.
- [x] Verify 238 tests, typecheck, lint, and production builds; deploy Worker `3dc4518e-ee2f-4722-85a1-fc4b15e3f643` and API `172da7b4-361c-42d1-ae10-4963573e9efd`.
- [x] Verify hosted API health is healthy. Latest Vercel preview: `https://papertrader-bv5yg83zr-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted dashboard rendering; deployment protection still redirects unauthenticated inspection to Vercel login.

### Phase 6.163 — Agent rationale and evidence visibility (2026-08-26)

- [x] Correct `/v1/operator-overview` to return the nested agent artifact contract expected by the dashboard parser.
- [x] Preserve safe stored rationale, confidence, artifact type, evidence references, task, status, and timing for each agent.
- [x] Render per-agent rationale and evidence-reference context in the compact dark dashboard.
- [x] Verify 238 tests, typecheck, lint, and production builds.
- [x] Deploy API `90ebae31-59c3-4c28-8db4-a16cb6455bc4`; hosted API health is healthy. Vercel preview: `https://papertrader-li8jwvot6-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted rendering; deployment protection redirects unauthenticated inspection to Vercel login.

### Phase 6.164 — Authenticated audit CSV export (2026-08-26)

- [x] Add authenticated `/v1/operator-overview.csv` export for agent runs, filtered decisions, and execution decisions.
- [x] Include rationale/reasons, risk evidence, point-in-time market snapshots, strategy, status, and timestamps in the export.
- [x] Add `/dashboard/export` server-side proxy using the Clerk session token; no browser-side broker credential or raw API token is exposed.
- [x] Quote CSV fields and neutralize formula-leading values; unauthenticated API export verification returns `401`.
- [x] Verify typecheck, lint, tests, and production build; deploy API `1b6837b9-f53a-4c6b-ba0a-a44368e80134` and Vercel preview `https://papertrader-oovokwc9k-altafrs-projects.vercel.app`.
- [x] Verify hosted API health is healthy.
- [ ] Verify authenticated browser download; deployment protection still blocks unauthenticated inspection.

### Phase 6.165 — Read-only current-state alert summary (2026-08-26)

- [x] Replace the dashboard alert placeholder with derived critical, warning, and informational health notices.
- [x] Cover stale/delayed reconciliation, active kill switch, blocked migrations, recovery verification, Telegram readiness, and paper-stability gate state.
- [x] Keep notices read-only and clearly separate from immutable audit history and order authority.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy Vercel preview `https://papertrader-ky0lqexmm-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.166 — Selectable paper-performance windows (2026-08-26)

- [x] Add validated `7d`, `30d`, and `all` performance ranges to the authenticated paper-performance endpoint.
- [x] Recalculate selected-window metrics, equity curve, drawdown, calendar coverage, and stability status from persisted snapshots.
- [x] Add compact dashboard links for the active performance window.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy API `f4f060a7-fecc-4d5d-a158-5474bc908076` and web preview `https://papertrader-9361k59kt-altafrs-projects.vercel.app`.
- [x] Verify the protected live range route returns `401` without authentication and API health remains healthy.
- [ ] Verify authenticated hosted rendering of each window; deployment protection still blocks unauthenticated inspection.

### Phase 6.167 — Complete persisted order/activity history (2026-08-26)

- [x] Remove dashboard-side truncation of persisted orders and account activities.
- [x] Render every row returned by the reconciled read model with quantities, status, and timestamps.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy Vercel preview `https://papertrader-l6hw9pase-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted history rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.168 — Strategy-level shadow performance summary (2026-08-26)

- [x] Aggregate persisted filtered/shadow observations by strategy.
- [x] Show total, open, closed, wins, losses, and average observed return when an outcome is available.
- [x] Label the metrics as shadow/research evidence rather than live profitability.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy Vercel preview `https://papertrader-pn4pogbrd-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted strategy rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.169 — Read-only dashboard auto-refresh (2026-08-26)

- [x] Add a manual authenticated Refresh control to the dashboard status bar.
- [x] Add a 60-second server-rendered refresh interval with explicit read-only behavior.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy Vercel preview `https://papertrader-59czmm5lr-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted refresh behavior; deployment protection still blocks unauthenticated inspection.

### Phase 6.170 — Reconciled portfolio P/L and exposure metrics (2026-08-26)

- [x] Derive day P/L from persisted equity and last-equity values when available.
- [x] Sum persisted position unrealized P/L and calculate gross exposure percentage from market value versus equity.
- [x] Preserve explicit unavailable states when source fields are missing; no browser-side broker calls were added.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy Vercel preview `https://papertrader-3unnv08iv-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted portfolio metrics rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.171 — Agent evidence references rendered (2026-08-26)

- [x] Render stored agent evidence-reference identifiers beside each displayed rationale.
- [x] Preserve the structured-output-only boundary; no hidden chain-of-thought is collected or exposed.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy Vercel preview `https://papertrader-1iezh0yya-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted evidence rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.172 — Complete persisted decision history rendered (2026-08-26)

- [x] Remove dashboard-side 25-row truncation from filtered/shadow trades and paper execution decisions.
- [x] Render every row returned by the authenticated overview endpoint while retaining server-side bounds.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy Vercel preview `https://papertrader-es7u9vcv3-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted decision-history rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.173 — Strategy lifecycle/version history rendered (2026-08-26)

- [x] Expose persisted strategy lifecycle events in the authenticated operator overview.
- [x] Render strategy key/version, stage transition, revision, reason, evidence key, and approval time in the dashboard.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy API `533a0552-e27b-4ea2-b5c1-da21201fda39` and Vercel preview `https://papertrader-ezhlsa0bw-altafrs-projects.vercel.app`.
- [x] Verify hosted API health is healthy and unauthenticated overview access remains `401`.
- [ ] Verify authenticated hosted lifecycle rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.174 — Structured risk evidence rendered in decision log (2026-08-26)

- [x] Display estimated loss, invested-notional loss percentage, policy version, and deterministic reason for paper execution decisions when persisted.
- [x] Preserve explicit missing-evidence handling without inventing values.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy Vercel preview `https://papertrader-2n4y8iils-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted risk-evidence rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.175 — Complete point-in-time indicator snapshots rendered (2026-08-26)

- [x] Render RSI14, EMA20, EMA50, ATR14, relative volume20, close, volume, and snapshot timestamp in filtered and approval decision rows.
- [x] Preserve explicit `Not captured` handling for legacy or incomplete snapshots.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy Vercel preview `https://papertrader-mlo29d0dr-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted indicator rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.176 — Unified immutable audit timeline (2026-08-26)

- [x] Combine persisted agent, lifecycle, scheduler, and execution records into a bounded chronological overview timeline.
- [x] Render the timeline read-only while retaining source-specific audit tables and CSV export.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy API `d3418583-45d3-4dcc-b606-85301ca07ef5` and Vercel preview `https://papertrader-6e6wax0h1-altafrs-projects.vercel.app`.
- [x] Verify hosted API health is healthy and unauthenticated overview access remains `401`.
- [ ] Verify authenticated hosted timeline rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.177 — Audit CSV expanded to unified event coverage (2026-08-26)

- [x] Add lifecycle-transition and unified-timeline records to the authenticated operator CSV export.
- [x] Preserve quoted/formula-safe fields and fail-closed unauthenticated behavior.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy API `12cdd184-4a16-4d18-b515-9da63b9eea25`.
- [x] Verify hosted API health is healthy and unauthenticated CSV access returns `401`.
- [ ] Verify authenticated hosted CSV contents; deployment protection still blocks unauthenticated inspection.

### Phase 6.178 — Authenticated agent detail view (2026-08-26)

- [x] Add protected `/dashboard/agents/[runId]` detail pages linked from agent cards.
- [x] Show stored rationale, evidence references, confidence/schema, and API-redacted artifact payload.
- [x] Preserve server-side secret-key redaction and the structured-output-only reasoning boundary.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy Vercel preview `https://papertrader-2zdjldgtx-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted agent-detail rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.179 — Position notional and return metrics (2026-08-26)

- [x] Show invested notional and derived return percentage for each persisted position.
- [x] Preserve explicit unavailable handling for missing fields or zero notional and highlight negative values.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy Vercel preview `https://papertrader-hrixnpklg-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted position metrics rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.180 — Full order/fill reconciliation table (2026-08-26)

- [x] Render all persisted orders with side/type, status, requested/filled quantities, client and broker IDs, and submitted/updated timestamps.
- [x] Keep the order/fill surface read-only and sourced from reconciled broker state.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy Vercel preview `https://papertrader-g4luhz70l-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted order/fill rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.181 — Performance snapshot history table (2026-08-26)

- [x] Add a collapsible selected-window snapshot table behind the equity curve.
- [x] Show UTC capture time, equity, return, and drawdown for each returned snapshot.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy Vercel preview `https://papertrader-k3hcvmdfx-altafrs-projects.vercel.app`.
- [ ] Verify authenticated hosted snapshot-history rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.182 — Authenticated reconciled account CSV export (2026-08-26)

- [x] Add protected account read-model CSV export for snapshot, positions, orders/fills, and activities.
- [x] Include identifiers, quantities, P/L, prices, and timestamps while preserving formula-safe CSV fields.
- [x] Add the authenticated dashboard account-export proxy and link it from Orders & Fills.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy API `01f1facd-a627-4fea-9d30-0691e03c4412` and Vercel preview `https://papertrader-pmiojjtpy-altafrs-projects.vercel.app`.
- [x] Verify hosted API health is healthy and unauthenticated account export access returns `401`.
- [ ] Verify authenticated hosted account CSV download; deployment protection still blocks unauthenticated inspection.

### Phase 6.183 — Versioned strategy catalog metadata rendered (2026-08-26)

- [x] Expose registered strategy key, version, asset class, owner, description, stage, required lookback, and default parameters through the authenticated overview.
- [x] Render catalog metadata read-only beside lifecycle and outcome evidence.
- [x] Verify 238 tests, typecheck, lint, and production build; deploy API `87cde9b9-24bc-432e-94dc-3ebc3d235870` and Vercel preview `https://papertrader-2te70xo02-altafrs-projects.vercel.app`.
- [x] Verify hosted API health is healthy and unauthenticated overview access remains `401`.
- [ ] Verify authenticated hosted strategy catalog rendering; deployment protection still blocks unauthenticated inspection.

### Phase 6.148 — Capital baseline and loss-cut policy (2026-08-25)

- [x] Verify Alpaca's official paper-trading documentation: new paper accounts default to USD 100,000 and can be reset to an arbitrary amount.
- [x] Update the active baseline from USD 1,000 to USD 100,000 across policy, readiness, operator setup, and runbook documentation.
- [x] Preserve the absolute USD 100 maximum planned loss per trade; at USD 100,000 equity this is stricter than the 0.25% equity limit.
- [x] Add deterministic rejection for long stops more than 5% below entry and regression coverage.
- [x] Deploy and verify the updated risk policy on Railway before any paper order submission; Worker deployment `4d7b55ce-5cd2-4a2c-b470-2edf1ea80cee` and API deployment `db445a0d-f62d-4970-bf95-4eda94f5b932` succeeded, with hosted readiness `ready` and a fresh reconciliation.

### Phase 6.149 — Invested-notional loss policy (2026-08-25)

- [x] Remove the USD 100 absolute cap and 0.25% equity cap from the active policy.
- [x] Enforce planned loss, fees, and slippage at no more than 5% of invested notional.
- [x] Keep the separate maximum 5% adverse stop-distance rule for long positions.
- [x] Update API, dashboard, readiness output, tests, and operating documentation.
- [x] Deploy Worker `3e62b3cb-ce9f-458e-b95c-06a2c030d0ba`; hosted readiness reports `5%` invested-notional risk, `5%` stop distance, and status `ready`.

### Phase 6.150 — Accelerated closeout rehearsal (2026-08-25)

- [x] Send the guarded Telegram channel test with reference `TELEGRAM-FAST-CLOSEOUT-20260825`; command reported success and no secret values were exposed.
- [x] Run a fresh hosted paper-account reconciliation; command completed and runtime readiness remained `ready` with a 10-second-old snapshot.
- [x] Re-run hosted Paper Autopilot runtime readiness: all paper, scheduler, freshness, risk, and kill-switch gates passed.
- [x] Complete post-restore recovery sign-off; isolated recovery Worker `868981c7-f753-46a7-852d-1d8a750852d4` reconciled against restored PostgreSQL, producing four account snapshots with latest capture `2026-08-25T15:02:51.939Z`.

### Phase 6.151 — Isolated recovery sign-off (2026-08-25)

- [x] Create an isolated recovery Worker against the retained PITR sibling database; production Worker/API and trading state remained untouched during reconciliation.
- [x] Run paper reconciliation successfully against the restored database.
- [x] Persist bounded recovery evidence on production with reference `RECOVERY-PITR-20260825-POSTRECON` and UTC verification timestamp `2026-08-25T15:02:51.939Z`.
- [x] Verify hosted recovery readiness `verified`, Paper Autopilot readiness `ready`, fresh reconciliation, inactive kill switch, and healthy API.
- [ ] Decide separately whether to retain or delete the isolated recovery Worker/database; no destructive cleanup was performed.

### Phase 6.152 — Bounded paper research run (2026-08-25)

- [x] Run a one-shot stock research job over paper Alpaca market data for `AAPL,MSFT` with bounded approval reference `RESEARCH-PAPER-PHASE-152-20260825`.
- [x] Persist and verify the research artifact: run `research-market-1787670407363`, status `succeeded`, artifact present, approval provenance present.
- [x] Confirm the command did not submit, approve, cancel, or schedule any order; recurring scheduler and live mode remained unchanged.

### Phase 6.153 — Crypto research verification (2026-08-25)

- [x] Verify the Alpaca crypto bars endpoint returned paper-market data for `BTC/USD`.
- [x] Run crypto research with a bounded `1Hour` timeframe and approval reference `RESEARCH-PAPER-PHASE-153-20260825-BROKER`.
- [x] Persist and verify artifact run `research-market-1787670529523`, status `succeeded`, artifact present, and approval provenance present.
- [x] Preserve fail-closed behavior: the initial `1Day` attempt was not accepted when the provider returned fewer than two bars; no fallback weakened validation.

### Phase 6.154 — Paper performance evidence (2026-08-25)

- [x] Add a read-only Worker performance-report command over persisted account snapshots.
- [x] Add regression coverage for insufficient history, return, and drawdown calculations; 235 tests pass with typecheck, lint, and build.
- [x] Deploy Worker `d7b4d8d9-36ac-4481-a8da-46ea1c8464b8` and run the hosted report.
- [x] Verify 12 reconciled snapshots: final equity `99292.09000000`, total P/L `-98.12000000`, total return `-0.09872200%`, and maximum drawdown `0.20037185%`.
- [ ] Continue collecting multi-day evidence before making any strategy or risk-performance claim.

### Phase 6.155 — Multi-day coverage report (2026-08-25)

- [x] Extend the read-only report with first/last capture timestamps and calendar-day coverage.
- [x] Deploy Worker `534280c5-e6b1-42e7-be0b-f5be0e9e1830` and rerun the hosted report.
- [x] Verify 13 snapshots across 3 calendar days (`2026-08-22` through `2026-08-25`): total return `-0.09872200%`, max drawdown `0.20037185%`.
- [ ] Continue toward the required 30 consecutive calendar days of stable paper evidence.

### Phase 6.156 — Consecutive coverage verification (2026-08-25)

- [x] Add consecutive-calendar-day coverage calculation with gap-reset tests; 236 tests pass with typecheck, lint, and build.
- [x] Deploy Worker `94e70d04-a290-49ff-b9a7-4bc3869afd92` and rerun the report.
- [x] Verify 14 snapshots across 3 calendar days, with 2 consecutive days currently covered.
- [x] Record current simulated result honestly: total return `-0.18984767%`, total P/L `-188.69`, maximum drawdown `0.20037185%`.
- [ ] Continue toward 30 consecutive calendar days; no strategy change is justified by the current short, negative sample.

### Phase 6.157 — Stability-readiness gate (2026-08-25)

- [x] Add a machine-readable stability gate requiring 30 consecutive calendar days and maximum drawdown no greater than 5%.
- [x] Add regression coverage for blocked history and drawdown-policy checks; 236 tests pass with typecheck, lint, and build.
- [x] Deploy and verify the gate; current hosted report is correctly `stability.status:"blocked"` with reason `minimum_30_consecutive_calendar_days_not_met`.

## Delivery Roadmap

### Phase 6.147 — Fast-path Paper Autopilot activation (2026-08-25)

- [x] Record explicit authorization to skip waiting for the first natural scheduler cycle.
- [x] Enable `PAPER_AUTOPILOT_ENABLED=true` and `OPERATING_MODE=paper_autopilot` on Railway Worker and API without changing paper/live or risk settings.
- [x] Detect and correct a stale-`main` variable-triggered deployment by deploying the verified branch directly.
- [x] Verify Worker health, scheduled durable scheduler, inactive global kill switch, fresh reconciliation, and runtime readiness `ready`.
- [x] Verify API health and confirm no order submission occurred.
- [ ] Complete post-restore reconciliation and recovery sign-off.
- [ ] Verify Telegram delivery with an approved test reference.

**Phase 6.147 exit gate:** Paper Autopilot is enabled only behind the existing deterministic paper-mode, freshness, risk, and kill-switch gates; no live order path is enabled.

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
- [x] Verify Vercel, browser bundles, source control, logs, and PostgreSQL contain no Alpaca credentials.

#### 0.5 Operational decisions

- [ ] Review and approve Version 1 scope and the initial paper risk policy.
- [ ] Decide the default emergency-stop response before implementing paper execution.
- [ ] Select the Alpaca market-data subscription/feed.
- [x] Select Telegram Bot API as the primary critical-alert provider; a secondary critical-alert path remains open.

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
- [x] Verify browser bundles/logs never contain Alpaca secrets.

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
| P2 | Which secondary alert path should complement Telegram for critical incidents? | Response time and redundancy | Operator |
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

## Completed Build Unit — Phase 6.28

- **User story:** As the operator, I can verify that persisted broker truth is fresh before unattended paper execution is considered runtime-ready.
- **Implemented:** Added `PAPER_AUTOPILOT_RUNTIME_READINESS=true pnpm --filter @momentum/worker paper-autopilot-runtime-readiness`, with deterministic fresh/delayed/stale/unavailable classification and configuration/freshness composition.
- **Safety boundary:** The command performs only a bounded PostgreSQL read when `DATABASE_URL` is present, closes the pool, and never calls Alpaca, starts schedules, changes configuration, approves risk, or submits orders.
- **Verification:** 158 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `3ac368fd-c5b3-4443-989b-354d2b16195f` reached `SUCCESS`; hosted runtime-readiness returned `status:"disabled"`, reconciliation `status:"fresh"` at age `56932` seconds, and all execution gates disabled. No Alpaca call or scheduler action occurred.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation; keep all execution gates disabled.

## Completed Build Unit — Phase 6.29

- **User story:** As the operator, I can stop all paper-order execution with one server-side emergency flag that agents, browser code, and order payloads cannot bypass.
- **Implemented:** Added `GLOBAL_KILL_SWITCH_ACTIVE`, readiness reason reporting, Worker startup validation, and a pre-persistence execution check with regression tests.
- **Safety boundary:** The flag defaults to inactive, rejects malformed values, remains server-side, and does not itself enable execution. Current Railway configuration remains unchanged and disabled.
- **Verification:** 161 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `726c5b3b-8dfb-4b3f-9f4f-9511935f7f43` reached `SUCCESS`; hosted readiness returned `globalKillSwitchActive:false`, `status:"disabled"`, and all execution gates disabled. No persistent variable changed.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation; keep the kill switch and all execution gates disabled.

## Completed Build Unit — Phase 6.30

- **User story:** As the operator, I can see whether the global emergency stop is active without being given a browser control to alter it.
- **Implemented:** Added `globalKillSwitchActive` to authenticated operations health, strict dashboard parsing, and the operations-health card.
- **Safety boundary:** The value is redacted metadata only; the browser cannot toggle it, bypass it, or submit orders. No execution or scheduler behavior changed.
- **Verification:** 161 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. API deployment `ceb8f9fb-1723-43d0-8d8d-3e9344c72c1d` reached `SUCCESS`; `/health` returned HTTP 200 and unauthenticated `/v1/operations-health` returned HTTP 401. Vercel preview `dpl_GGphneUFTQm7wviXF7w8HRsGphrz` reached `Ready`; unauthenticated HTTP returned the expected deployment-protection 302. No worker flags changed.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation; keep all execution gates disabled.

## Completed Operations Unit — Phase 6.31

- **User story:** As the operator, I can verify that private Worker health agrees with API/dashboard kill-switch state.
- **Implemented:** Added `globalKillSwitchActive` to the shared Worker health contract and resolved it through the server-side configuration guard.
- **Safety boundary:** Health is read-only and cannot toggle or bypass the kill switch; startup and execution guards remain independent enforcement points.
- **Verification:** 161 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `8823b09e-16c8-4773-874e-903321c23474` reached `SUCCESS`; private `/health` returned HTTP 200 with `globalKillSwitchActive:false`, `operatingMode:"observe"`, configured integrations, broker disabled, and all optional gates disabled.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation; keep the kill switch and all execution gates disabled.

## Completed Operations Unit — Phase 6.32

- **User story:** As the operator, I can verify the emergency stop blocks an otherwise fully configured Autopilot readiness check without changing hosted configuration.
- **Implemented:** Ran a command-scoped Railway readiness exercise with `GLOBAL_KILL_SWITCH_ACTIVE=true` and all other gates supplied only to the client-free process.
- **Safety boundary:** The process exited non-zero with `status:"blocked"` and `global_kill_switch_active`; no Alpaca/PostgreSQL client, scheduler, order, or persistent variable was touched.
- **Verification:** Persistent-variable audit after the exercise found broker access explicitly `false`; handler, scheduler, kill-switch, and Autopilot variables absent or disabled.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation; keep all execution gates disabled.

## Completed Build Unit — Phase 6.33

- **User story:** As the operator, I can verify the exact temporary preconditions for one paper reconciliation before running the side-effecting command.
- **Implemented:** Added `DURABLE_ONE_RUN_READINESS=true pnpm --filter @momentum/worker durable-one-run-readiness` with bounded gate checks and approval-reference validation.
- **Safety boundary:** The command is client-free and read-only; `ready` does not enqueue work, contact Alpaca, write PostgreSQL, enable a scheduler, or approve orders.
- **Verification:** 164 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `5e0f535b-0506-41c2-ae7e-90b1eee0851d` reached `SUCCESS`; hosted preflight with persistent flags returned `blocked` for the expected temporary gates, while a command-scoped fully gated preflight with approval reference `ticket-123` returned `ready`. Neither invocation enqueued work or constructed clients.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation; do not execute it solely because preflight is ready.

## Completed Build Unit — Phase 6.34

- **User story:** As the operator, I can verify queue drainage and fresh persisted reconciliation after a one-run without exposing financial data.
- **Implemented:** Added `DURABLE_ONE_RUN_VERIFY=true pnpm --filter @momentum/worker durable-one-run-verify`, with bounded queue and reconciliation verification.
- **Safety boundary:** The command is read-only; it cannot enqueue work, start schedules, call Alpaca, write PostgreSQL, or expose account/order payloads.
- **Verification:** 167 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `66634d2f-9498-4e24-b7ef-38508d66c1fb` reached `SUCCESS`; hosted verifier returned `status:"verified"`, both queues present/drained, and reconciliation `status:"fresh"` at age `58259` seconds. This confirms current persisted state only; no new one-run was executed.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation; do not infer execution from the verifier's current-state result.

## Completed Build Unit — Phase 6.35

- **User story:** As the operator, I can attach post-run evidence to a bounded run identifier and approval reference without exposing secrets or claiming unsupported causality.
- **Implemented:** Added command-scoped `DURABLE_ONE_RUN_ID` validation, included the run ID and approval reference in the guarded one-run completion output, and required both bounded references in the post-run verifier contract. Readiness now checks for the run identifier as well as the approval reference.
- **Safety boundary:** References are non-secret operator metadata only. The verifier remains read-only and current-state based; it does not persist an audit event or prove that a particular run caused the latest reconciliation snapshot.
- **Verification:** 168 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. No hosted command, broker request, scheduler enablement, or one-run reconciliation was executed.
- **Next smallest unit:** Obtain explicit approval for the one-run paper reconciliation; provide a unique run ID and approval reference if execution is authorized.

## Completed Build Unit — Phase 6.36

- **User story:** As the operator, I can verify that a completed one-run's provenance is durably linked to its persisted account snapshot.
- **Implemented:** Added reviewed migration `0009_durable_one_run_audits.sql`; reconciliation inserts the run ID, approval reference, capture time, and snapshot link transactionally when the queued one-run payload carries matching provenance. The verifier now requires the persisted audit row and matching references.
- **Safety boundary:** Only the explicitly guarded one-run path writes this audit row. Recurring scheduling, live trading, browser code, and approval authority remain unchanged; migration `0009` has not been applied to Railway.
- **Verification:** 168 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. No hosted migration, command, broker request, scheduler enablement, or one-run reconciliation was executed.
- **Next smallest unit:** Review and explicitly approve applying migration `0009` in Railway, then run the separate paper-only one-run runbook with a unique run ID and approval reference.

## Completed Build Unit — Phase 6.37

- **User story:** As the operator, I can check whether Railway is structurally ready for migration `0009` before applying it.
- **Implemented:** Added `DATABASE_MIGRATION_READINESS=true pnpm --filter @momentum/worker database-migration-readiness`, a read-only check for the reviewed migration file, migration record, audit table, and required columns.
- **Safety boundary:** The command never creates tables, applies SQL, enables scheduling, calls Alpaca, or changes hosted configuration. It returns only booleans and bounded reason codes.
- **Verification:** 170 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `586ab6cb-9a45-4013-8825-1b603e33b6cc` reached `SUCCESS`; the private Railway readiness check returned the expected bounded reasons `migration_not_recorded`, `audit_table_missing`, and `audit_columns_missing`, with the migration file present. No SQL mutation occurred.
- **Next smallest unit:** Review and explicitly approve applying migration `0009` in Railway, then rerun readiness and proceed only if it returns `ready`.

## Completed Build Unit — Phase 6.38

- **User story:** As the operator, I cannot accidentally apply migration `0009` without recording an explicit bounded approval reference in the command environment.
- **Implemented:** Added `DATABASE_MIGRATION_APPROVAL_REFERENCE` validation and gated pending migration `0009` in the guarded application migration command.
- **Safety boundary:** The approval reference is non-secret and only authorizes the already-guarded migration command; it does not enable scheduling, call Alpaca, or bypass paper-only controls. Migration `0009` remains unapplied.
- **Verification:** 172 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `332fe1c9-1e55-4c53-8336-d20b08835d94` reached `SUCCESS`; private health remained healthy and the hosted readiness check returned the expected blocked migration state. No hosted migration or SQL mutation was performed.
- **Next smallest unit:** Obtain explicit operator approval/reference, apply migration `0009` through the guarded command, and rerun the read-only readiness check.

## Completed Build Unit — Phase 6.39

- **User story:** As the operator, I can inspect exactly which migrations are pending before authorizing any database mutation.
- **Implemented:** Added `DATABASE_MIGRATION_PLAN=true pnpm --filter @momentum/worker database-migration-plan`, which reports pending versions and approval requirements without writing to PostgreSQL.
- **Safety boundary:** An absent `schema_migrations` table is reported explicitly; the command never treats that absence as permission to apply SQL.
- **Verification:** 174 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `7b78fe6a-f6f9-4d51-9984-d7bb7cc70647` reached `SUCCESS`; the private no-write plan reported exactly one pending migration, `0009_durable_one_run_audits.sql`, with `approvalRequired:true`. No migration or SQL mutation occurred.
- **Next smallest unit:** Obtain explicit approval/reference, apply migration `0009` through the guarded command, and rerun readiness.

## Completed Build Unit — Phase 6.40

- **User story:** As the operator, I can see one truthful readiness state for the daily server-side reconciliation path.
- **Implemented:** Added `DAILY_RECONCILIATION_READINESS=true pnpm --filter @momentum/worker daily-reconciliation-readiness`, combining scheduler gates with migration readiness.
- **Safety boundary:** `disabled` means the recurring scheduler remains off; `blocked` means prerequisites are missing. The command is read-only and cannot enable scheduling or place orders.
- **Verification:** 177 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `b1440657-b6aa-4497-97ab-6c6004723569` reached `SUCCESS`; the private combined readiness check returned the clean blocked migration reasons above with scheduler `disabled`. No hosted migration or database mutation occurred.
- **Next smallest unit:** Obtain explicit approval/reference, apply migration `0009` through the guarded command, rerun combined readiness, and only then review scheduler activation.

## Completed Build Unit — Phase 6.41

- **User story:** As the operator, I cannot start the recurring daily scheduler against an incomplete audit schema.
- **Implemented:** Added a startup query/guard that checks migration `0009`, its audit table, and required columns before `DURABLE_SCHEDULER_ENABLED=true` can start the durable scheduler.
- **Safety boundary:** The guard fails closed and closes its read-only pool; it does not apply migrations, enable scheduling, contact Alpaca, or submit orders.
- **Verification:** 179 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `34e9c4f9-a76c-4590-9e9e-d41c68067a36` reached `SUCCESS`; private health remained healthy and combined readiness remained blocked by migration `0009`. The normal default-disabled worker path remains unchanged; no hosted scheduler activation or database mutation occurred.
- **Next smallest unit:** Obtain explicit approval/reference, apply migration `0009`, rerun daily readiness, and then consider controlled scheduler activation.

## Completed Build Unit — Phase 6.42

- **User story:** As the operator, I can authorize only the specific reviewed migration rather than implicitly authorizing every pending migration.
- **Implemented:** Added `DATABASE_MIGRATION_TARGET=0009` validation to the guarded application migration command when migration `0009` is pending, alongside the existing approval-reference guard.
- **Safety boundary:** The target and reference are bounded command metadata; no SQL, scheduler, broker, or approval state is changed by validation alone.
- **Verification:** 180 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `cd79e69e-1a31-438c-ba47-c4480ae1b82a` reached `SUCCESS`; private health remained healthy with all execution gates disabled. No hosted migration or database mutation occurred.
- **Next smallest unit:** Obtain explicit approval/reference, run the guarded command with the exact `0009` target, rerun readiness, and review scheduler activation only after the audit schema is ready.

## Completed Build Unit — Phase 6.43

- **User story:** As the operator, I can trust that the scheduler startup guard’s database probe fails closed when the tracking table is missing or the audit schema is incomplete.
- **Implemented:** Added direct mocked-query tests for complete readiness and missing `schema_migrations` behavior, plus assertion coverage for incomplete state.
- **Safety boundary:** Tests only exercise an in-memory query contract; they do not connect to Railway, apply SQL, or enable scheduling.
- **Verification:** 182 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. No hosted state changed.
- **Next smallest unit:** Obtain explicit approval/reference and apply migration `0009` through the exact-target guarded command.

## Completed Build Unit — Phase 6.44

- **User story:** As the operator, I can be confident that an unexpected pending migration is rejected before the migration command mutates tracking state.
- **Implemented:** Added pending-set validation before `schema_migrations` creation; only `0009` may be pending for this guarded command, and it requires the exact target plus approval reference.
- **Safety boundary:** Unexpected pending versions fail closed before migration SQL or tracking-table creation. No hosted state changed.
- **Verification:** 183 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Worker deployment `3cf7e599-61c8-47e3-9ab0-270468b357f5` reached `SUCCESS`; the private no-write plan confirms exactly one pending migration (`0009`) and no unrelated pending versions. No SQL mutation occurred.
- **Next smallest unit:** Obtain explicit approval/reference and apply only migration `0009` through the exact-target guarded command.

## Completed Build Unit — Phase 6.45

- **User story:** As the operator, I can see migration readiness in the authenticated dashboard without receiving any migration or scheduling control.
- **Implemented:** Added bounded audit-migration status/reasons to operations health and a dashboard card field alongside scheduler and risk state.
- **Safety boundary:** The API performs read-only metadata checks, closes its temporary pool, and cannot apply SQL or change runtime gates. Browser code remains display-only.
- **Verification:** 184 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. API deployment `ecc32524-c11f-49b0-bac0-c191f75f88a9` reached `SUCCESS`, private health was healthy, and Vercel preview `dpl_Coim3aCAv7mRqduqRCaBXD1ZAtHn` reached `Ready`; no hosted migration or scheduler activation occurred.
- **Next smallest unit:** Obtain explicit approval/reference for migration `0009`.

## Completed Build Unit — Phase 6.46

- **User story:** As the operator, I can see exactly why migration readiness is blocked in the dashboard.
- **Implemented:** Rendered the bounded migration reason codes beneath the read-only Audit migration status.
- **Safety boundary:** The browser remains display-only and cannot apply SQL, change scheduler flags, or alter broker access.
- **Verification:** 184 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. No hosted migration or scheduler activation occurred.
- **Next smallest unit:** Deploy the dashboard reason display, then obtain explicit approval/reference for migration `0009`.

## Completed Build Unit — Phase 6.47

- **User story:** As the API, I can expose migration readiness through one tested, read-only query contract.
- **Implemented:** Extracted `readAuditMigrationReadiness` and added complete/missing-schema query tests; operations health now uses the shared reader.
- **Safety boundary:** Unexpected query failures remain unavailable responses; no SQL write, migration, scheduler, or broker authority was added.
- **Verification:** 185 tests, typecheck, lint, production build, secret-surface audit, and diff checks pass. Railway API deployment `388817b7-dced-4e13-8869-dca26122bb59` reached `SUCCESS`, and a private `/health` probe returned HTTP 200. No hosted migration or scheduler activation occurred.
- **Next smallest unit:** Obtain explicit approval/reference for migration `0009`; keep the recurring scheduler, broker access, and Paper Autopilot disabled until that migration is applied and readiness is rechecked.

## Completed Build Unit — Phase 6.48

- **User story:** As the dashboard, I can trust that migration block reasons come from a bounded server contract rather than arbitrary API text.
- **Implemented:** Added a shared migration-reason union to the API/browser contracts and rejected unknown browser reason codes with focused parser coverage.
- **Safety boundary:** This is read-only contract validation. It cannot apply SQL, change scheduler/broker flags, contact Alpaca, or submit orders.
- **Verification:** `pnpm test` passes 185 tests; typecheck, lint, production build, secret-surface audit, and diff checks pass. API deployment `c4882939-bce4-47b9-8e05-38337a170691` reached `SUCCESS` with private `/health` HTTP 200. Vercel preview `dpl_4NrANzRza3rdLjSc86NxuxQnv9gG` reached `Ready`; unauthenticated `/dashboard` returned HTTP 302 due deployment protection. No hosted migration or scheduler activation occurred.
- **Next smallest unit:** Obtain explicit approval/reference for migration `0009`; keep recurring scheduling, broker access, and Paper Autopilot disabled until migration readiness returns `ready`.

## Completed Operations Unit — Phase 6.49

- **User story:** As the operator, I can recheck the complete daily server-side readiness contract before authorizing any migration or scheduler action.
- **Verified:** Railway SSH ran `DAILY_RECONCILIATION_READINESS=true pnpm --filter @momentum/worker daily-reconciliation-readiness` on the deployed Worker. It returned `blocked` with `migration_not_recorded`, `migration_audit_table_missing`, and `migration_audit_columns_missing`; scheduler status remained `disabled` and the migration file check passed.
- **Safety boundary:** The command is read-only and exited non-zero because the migration gate is blocked. No SQL mutation, queue start, Alpaca request, broker mutation, or order action occurred.
- **Next smallest unit:** Obtain explicit approval/reference for migration `0009`, apply only that exact reviewed migration through the guarded command, then rerun readiness.

## Completed Build Unit — Phase 6.50

- **User story:** As the operator, I can see whether daily research preparation is disabled, blocked, or configuration-ready without starting it.
- **Implemented:** Added API and dashboard research-schedule readiness metadata with explicit broker, database, paper-credential, handler, and scheduler gates, plus pure tests for disabled/blocked/ready states.
- **Safety boundary:** Read-only metadata only; no research queue, Alpaca request, PostgreSQL write, Railway variable change, scheduler start, or order path was added.
- **Verification:** `pnpm test` passes 186 tests; typecheck, lint, production build, secret-surface audit, and diff checks pass. API deployment `d5764f90-7ba4-424c-a8a2-cc979e684c98` reached `SUCCESS` with private `/health` HTTP 200. Vercel deployment was attempted but rejected by the free-tier daily limit, so the latest dashboard preview remains the prior Ready deployment.
- **Next smallest unit:** After Vercel quota resets, deploy the dashboard contract, then obtain explicit approval/reference for migration `0009`.

## Completed Build Unit — Phase 6.51

- **User story:** As the operator, I can trust that research scheduling can never report ready outside the explicit paper environment.
- **Implemented:** Added the `TRADING_MODE=paper` and `ALPACA_PAPER_TRADE=true` requirement to the deterministic research-schedule readiness assessment and regression tests.
- **Safety boundary:** This is read-only configuration validation; it cannot enable research, change modes, call Alpaca, write PostgreSQL, or submit orders.
- **Verification:** `pnpm test` passes 186 tests; typecheck, lint, production build, secret-surface audit, and diff checks pass. API deployment `0be9a305-3ce5-4031-8fee-4c922fb46899` reached `SUCCESS` with private `/health` HTTP 200. No Vercel deployment was attempted because dashboard code was unchanged and quota is exhausted.
- **Next smallest unit:** Deploy the pending dashboard build after Vercel quota resets, then obtain explicit approval/reference for migration `0009`.

## Completed Operations Unit — Phase 6.52

- **User story:** As the operator, I can apply only the reviewed durable one-run audit migration after providing an explicit non-secret approval reference.
- **Implemented/verified:** Railway SSH ran the exact-target guarded command with `DATABASE_MIGRATION_TARGET=0009` and `DATABASE_MIGRATION_APPROVAL_REFERENCE=MIGRATION-0009-123`; it reported `appliedThrough:"0009"` and `migrationCount:9`.
- **Readiness evidence:** `database-migration-readiness` returned `ready`; `daily-reconciliation-readiness` returned `disabled` with no blocked reasons; `durable-status` showed both queues present with zero queued, active, and failed jobs.
- **Safety boundary:** The migration reference authorized schema application only. No Alpaca request, one-run reconciliation, persistent broker/handler/scheduler flag change, scheduler activation, Paper Autopilot activation, or order action occurred.
- **Next smallest unit:** Obtain a separate explicit approval/reference for the paper reconciliation one-run, execute the bounded runbook once, then run the read-only verifier and inspect the authenticated dashboard.

## Completed Verification Unit — Phase 6.53

- **User story:** As the operator, I can verify the repository and backend secret boundary without exposing credential values.
- **Verification:** `pnpm audit:secret-surfaces` passed; `pnpm test` passed 186 tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed. Railway API/worker variable-name inspection showed server-side Alpaca and database variables without printing values; persistent broker, scheduler, handler, and Paper Autopilot gates remain disabled.
- **Open verification:** Vercel environment names and hosted logs were not rechecked because the current checkout is not linked to the Vercel project. This remains an explicit Phase 0.4 verification item, not a presumed pass.
- **Next smallest unit:** Obtain a separate approval/reference for the paper reconciliation one-run, or link the local checkout to Vercel to complete the remaining hosted frontend secret audit before that run.

## Completed Verification Unit — Phase 6.54

- **User story:** As the operator, I can verify that the Vercel frontend project does not hold backend broker or database credentials.
- **Verification:** Linked the checkout read-only to `altafrs-projects/papertrader-web` and listed Preview/Production variables. Only Clerk/authentication variables and `NEXT_PUBLIC_API_BASE_URL` were present; no Alpaca or `DATABASE_URL` variable was present. No deployment or environment mutation occurred.
- **Safety boundary:** No Vercel runtime log content was printed, and no deployment was attempted. Railway remains the sole backend secret boundary; paper mode and all execution gates remain unchanged.
- **Next smallest unit:** Obtain a separate approval/reference for the paper reconciliation one-run, then execute the bounded runbook and verify its persisted audit result.

## Completed Verification Unit — Phase 6.55

- **User story:** As the operator, I can prove the actual one-run command is fully gated and ready without contacting Alpaca or mutating PostgreSQL.
- **Verification:** Railway SSH ran the deployed worker's `DURABLE_ONE_RUN_READINESS=true` command with command-scoped broker/handler gates, `DURABLE_SCHEDULER_ENABLED=false`, `PAPER_AUTOPILOT_ENABLED=false`, bounded reference, and bounded run ID. It returned `status:"ready"` and `blockedReasons:[]`; all required paper/database/credential checks passed and the global kill switch was inactive.
- **Safety boundary:** This was a client-free, read-only preflight. No Alpaca request, database write, queue start, persistent variable change, scheduler activation, Paper Autopilot activation, or order action occurred.
- **Next smallest unit:** Obtain a separate explicit approval/reference for the actual one-run paper reconciliation, then run it exactly once and execute the read-only verifier.

## Completed Verification Unit — Phase 6.56

- **User story:** As the operator, I can verify the hosted worker can reach Railway PostgreSQL without exposing connection details or starting any workflow.
- **Verification:** Railway SSH ran `DATABASE_STATUS=true pnpm --filter @momentum/worker database-status` and returned `{"databaseReachable":true}`.
- **Safety boundary:** The command performed only a read-only connectivity probe. No migration, Alpaca request, queue start, persistent variable change, scheduler activation, Paper Autopilot activation, or order action occurred.
- **Next smallest unit:** Obtain a separate explicit approval/reference for the actual one-run paper reconciliation, then run it exactly once and execute the read-only verifier.

## Completed Hosted Unit — Phase 6.57

- **User story:** As the operator, I can access the current dashboard deployment through Vercel's protected preview environment after the quota reset.
- **Verification:** Vercel deployment `dpl_3jRuQ8ph9653U1MJ7DhzyqEm4zLi` reached `Ready`. Unauthenticated requests to `/` and `/dashboard` returned `302` deployment-protection redirects.
- **Safety boundary:** No environment variable, broker flag, scheduler, database, or order behavior changed. Authenticated Clerk access is still required to inspect the dashboard.
- **Next smallest unit:** Obtain a separate explicit approval/reference for the actual one-run paper reconciliation, then run it exactly once and execute the read-only verifier.

## Completed Hosted Unit — Phase 6.58

- **User story:** As the operator, I can verify the deployed worker is healthy and remains safely paused before any paper reconciliation.
- **Verification:** A private Node health probe returned `status:"healthy"`, `operatingMode:"observe"`, `alpaca:"configured"`, `database:"configured"`, `brokerConnectionEnabled:false`, `durableScheduler.status:"disabled"`, `researchSchedule.status:"disabled"`, `shadowEvaluation.status:"disabled"`, and `globalKillSwitchActive:false`.
- **Safety boundary:** The probe was read-only and emitted no credential values. No Alpaca request, database write, queue start, scheduler activation, Paper Autopilot activation, or order action occurred.
- **Next smallest unit:** Obtain a separate explicit approval/reference for the actual one-run paper reconciliation, then run it exactly once and execute the read-only verifier.

## Completed Verification Unit — Phase 6.59

- **User story:** As the operator, I can verify that a readiness preflight does not itself create a reconciliation audit.
- **Verification:** The deployed read-only verifier was run with `DURABLE_ONE_RUN_ID=preflight-20260823` and `DURABLE_SCHEDULER_APPROVAL_REFERENCE=PREFLIGHT-ONLY-20260823`. It found both queues present and drained, but returned `status:"incomplete"` with `provenance_audit_missing` and matching provenance reasons; no audit row exists for that ID.
- **Safety boundary:** The verifier emitted bounded metadata only and did not contact Alpaca, write PostgreSQL, start scheduling, change persistent variables, or submit orders.
- **Next smallest unit:** Obtain a separate explicit approval/reference for the actual paper reconciliation, then run it exactly once and rerun this verifier with the real run ID/reference.

## Completed Operations Unit — Phase 6.60

- **User story:** As the operator, I can attempt one approved paper reconciliation without allowing a failure to enable recurring execution or leave an ambiguous audit record.
- **Execution evidence:** The command-scoped run used approval reference `PAPER-RECONCILIATION-123` and run ID `paper-reconciliation-20260823-01`. It exited with the generic `Durable one-run paper reconciliation failed.` result.
- **Post-run evidence:** The read-only verifier returned `status:"incomplete"` with no persisted provenance for that run ID; work and dead-letter queues were present and fully drained. A bounded Railway log query returned zero worker log lines for the observation window, so no cause is inferred. Persistent variables remained safe (`BROKER_CONNECTION_ENABLED=false`; handler/scheduler/autopilot flags absent or false), and the private worker health probe remained healthy in observe mode.
- **Safety boundary:** No credentials, account values, provider responses, SQL, or order actions were emitted. The run was not retried. A retry requires diagnosis and a new explicit approval/reference plus a new unique run ID.
- **Next smallest unit:** Review bounded Railway/runtime failure evidence and, only if the cause is understood and the operator reauthorizes it, run one new guarded reconciliation attempt.

## Completed Build Unit — Phase 6.61

- **User story:** As the operator, I can receive a safe diagnostic category if a future approved one-run fails, without exposing provider or database details.
- **Implemented:** Added `classifyDurableOneRunFailure` with bounded categories and changed the guarded command to emit only `failure_code=<category>` on failure. Added tests for broker, network, timeout, queue, database, and unknown errors.
- **Verification:** 189 tests passed; typecheck, lint, production build, and secret-surface audit passed. Railway worker deployment `7e940734-ba4e-4f16-8f72-74672a25ae34` reached `SUCCESS`.
- **Safety boundary:** No retry was performed. The classifier cannot authorize scheduling, alter paper mode, expose credentials, or submit orders.
- **Next smallest unit:** Review the failure category from a newly authorized attempt; do not reuse the failed run ID or approval reference without explicit reauthorization.

## Completed Build Unit — Phase 6.62

- **User story:** As the operator, I can distinguish which one-run lifecycle stage failed without seeing raw errors or secrets.
- **Implemented:** Added bounded `failure_stage` output to the guarded one-run failure line and deployed it with the redacted failure classifier.
- **Verification:** 189 tests, typecheck, lint, production build, and secret-surface audit passed; Railway deployment `195298d5-789d-4fb2-acbe-7e4309400507` reached `SUCCESS`.
- **Safety boundary:** No retry, broker request, database write, scheduler activation, or persistent variable change occurred in this phase.
- **Next smallest unit:** Use the stage-aware diagnostic only during a newly authorized attempt, with a new approval reference and run ID.

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
| Phase 6.28 Paper Autopilot runtime freshness readiness | Pass | Added guarded PostgreSQL-only freshness classification and configuration/freshness composition; 158 tests and full static verification pass; worker deployment `3ac368fd-c5b3-4443-989b-354d2b16195f` verified hosted `status=disabled` with fresh reconciliation; no Alpaca, scheduler, approval, or order action added |
| Phase 6.29 global kill-switch runtime guard | Pass | Added `GLOBAL_KILL_SWITCH_ACTIVE` fail-closed checks to readiness, Worker startup, and paper execution; 161 tests and full static verification pass; deployment `726c5b3b-8dfb-4b3f-9f4f-9511935f7f43` verified hosted inactive/default-safe state; no hosted flag change or order action occurred |
| Phase 6.30 operator-visible kill-switch status | Pass | Authenticated API/dashboard expose read-only `globalKillSwitchActive`; 161 tests and full static verification pass; API deployment `ceb8f9fb-1723-43d0-8d8d-3e9344c72c1d` and protected Vercel preview `dpl_GGphneUFTQm7wviXF7w8HRsGphrz` verified; no browser control, execution, scheduler, or configuration mutation added |
| Phase 6.31 Worker kill-switch health consistency | Pass | Shared Worker health now reports the same server-resolved kill-switch state; 161 tests and full static verification pass; deployment `8823b09e-16c8-4773-874e-903321c23474` verified private health consistency; no hosted flag or order behavior changed |
| Phase 6.32 hosted kill-switch exercise | Pass | Command-scoped fully gated readiness exited non-zero with `global_kill_switch_active`; persistent-variable audit confirmed no hosted setting changed and all execution gates remain disabled |
| Phase 6.33 durable one-run readiness preflight | Pass | Added client-free one-run gate/approval-reference preflight; 164 tests and full static verification pass; deployment `5e0f535b-0506-41c2-ae7e-90b1eee0851d` verified blocked persistent state and ready command-scoped state; no queue, broker, database-write, or order action added |
| Phase 6.34 durable one-run post-run verification | Pass | Added bounded queue-drain and reconciliation-freshness verifier; 167 tests and full static verification pass; deployment `66634d2f-9498-4e24-b7ef-38508d66c1fb` verified current queues/reconciliation as fresh; no queue enqueue, broker call, database write, or account/order payload exposure added |
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

## Completed Build Unit — Phase 6.76

- **User story:** As the operator, I can verify Telegram alert configuration readiness without sending a message or exposing credentials.
- **Implemented:** Added a no-send readiness contract with safe boolean checks and bounded block reasons, plus a worker command guarded by `TELEGRAM_ALERT_READINESS=true`.
- **Verification:** 200 tests passed; typecheck, lint, production build, secret-surface audit, and diff checks passed. The local readiness command reports `status:"disabled"`; no network request or alert occurred.
- **Hosted verification:** Worker deployment `8eedbd84-dbb4-436c-9dc7-c6c0837e0a43` reached `SUCCESS`. The read-only hosted command returned `status:"ready"` with boolean checks only; durable queues are present and drained. No Telegram message was sent.
- **Next smallest unit:** Obtain explicit approval/reference before any future channel test; do not alter trading, scheduler, or Paper Autopilot gates.

## Completed Build Unit — Phase 6.77

- **User story:** As the operator, I can see whether Telegram alert configuration is ready from private worker health without receiving secret values or activating delivery.
- **Implemented:** Added non-secret `telegramAlerts` readiness metadata to the shared worker health contract and its deterministic health projection.
- **Verification:** 201 tests, typecheck, lint, production build, secret-surface audit, and diff checks passed. Local health tests cover disabled, blocked, and ready states without network calls.
- **Hosted verification:** Worker deployment `92a03701-6ae4-43f3-8e3b-114ecbe71d63` succeeded. Private `/health` returned healthy observe mode with `telegramAlerts:{enabled:true,status:"ready"}`; broker/schedulers/Paper Autopilot remain disabled and both queues are present and drained. No Telegram message was sent.
- **Next smallest unit:** Obtain explicit approval/reference before any channel test; readiness metadata does not authorize delivery.

## Completed Build Unit — Phase 6.78

- **User story:** As the authenticated operator, I can see Telegram alert configuration readiness in the dashboard without receiving secret values or a send control.
- **Implemented:** Added bounded Telegram readiness metadata to API operations health, strict browser parsing, and the dashboard operations-health card; added the API workspace dependency on the shared notification contract.
- **Verification:** 201 tests, typecheck, lint, production build, secret-surface audit, and diff checks passed. No network or alert action was added.
- **Hosted verification:** API deployment `43f841c9-b29a-4f00-bbea-8f54925575af` reached `SUCCESS` and private `/health` returned healthy. Vercel preview `https://papertrader-iti0ribm2-altafrs-projects.vercel.app` completed; unauthenticated `/dashboard` returned deployment-protection HTTP 302. The authenticated contract remains read-only and no alert was sent.
- **Next smallest unit:** Obtain explicit approval/reference before any channel test; dashboard readiness visibility does not authorize delivery.

## Completed Build Unit — Phase 6.79

- **User story:** As the operator, I can distinguish configured Telegram alerts from verified message delivery.
- **Implemented:** Added the non-secret `deliveryVerification:"unverified"` state across notification readiness, worker/API health, dashboard parsing, and dashboard presentation.
- **Verification:** 201 tests, typecheck, lint, production build, secret-surface audit, and diff checks passed. No Telegram request or state mutation occurred.
- **Hosted verification:** Worker deployment `16f62475-ce15-41af-95da-dcff198aded3` and API deployment `04e7081d-08d7-4b7d-bb8e-b5ff739652d7` succeeded. Worker health reports `telegramAlerts:{enabled:true,status:"ready",deliveryVerification:"unverified"}` in observe mode; both durable queues are present and drained. Vercel preview `https://papertrader-huj93av8q-altafrs-projects.vercel.app` is deployment-protected with HTTP 302. No Telegram message was sent.
- **Next smallest unit:** Obtain approval/reference before any channel test; a successful test must be recorded before delivery can be called verified.

## Completed Build Unit — Phase 6.80

- **User story:** As the operator, I can validate the guarded Telegram test prerequisites without sending a message.
- **Implemented:** Added `telegram-alert-test-readiness`, requiring a command-scoped preflight flag and reporting approval-reference/configuration checks with bounded reason codes.
- **Verification:** 202 tests, typecheck, lint, production build, secret-surface audit, and diff checks passed. Synthetic bounded config reported `status:"ready"`; missing local config correctly reported blocked. No network request occurred.
- **Hosted verification:** Worker deployment `4e06994a-ca98-428a-ade9-8ea32a9e9cab` succeeded. Hosted preflight blocked without `TELEGRAM_ALERT_TEST_APPROVAL_REFERENCE` and returned `status:"ready"` with a synthetic bounded reference; queues remained present and drained. No Telegram message or network request occurred.
- **Next smallest unit:** Obtain explicit authorization before the actual Telegram channel test; the preflight does not authorize sending.

## Completed Build Unit — Phase 6.81

- **User story:** As the operator, I can see the exact daily server schedule and timezone even while activation remains disabled.
- **Implemented:** Added `cron` and `timezone:"UTC"` to the private durable-scheduler health contract, with coverage for the default and custom cron values.
- **Verification:** 203 tests, typecheck, lint, production build, secret-surface audit, and diff checks passed. No queue, broker, database, or scheduler action occurred.
- **Hosted verification:** Worker deployment `23908ee8-7107-4fd1-96a2-7098cd458f56` succeeded. Private health reports `cron:"0 0 * * *"`, `timezone:"UTC"`, and scheduler `disabled`; both queues are present and drained. Persistent scheduler/handler/broker gates remain unchanged.
- **Next smallest unit:** Keep persistent scheduler/handler/broker gates disabled until separately authorized; use the explicit UTC schedule when reviewing activation.

## Completed Build Unit — Phase 6.82

- **User story:** As the authenticated operator, I can see the same daily UTC schedule in the dashboard that the worker reports privately.
- **Implemented:** Added validated `cron` and `timezone:"UTC"` scheduler metadata to API operations health and rendered it in the dashboard health card.
- **Verification:** 203 tests, typecheck, lint, production build, secret-surface audit, and diff checks passed. No activation or external side effect was added.
- **Hosted verification:** API deployment `e80538d6-637e-4df4-82da-700dddab04db` succeeded and private `/health` returned healthy. Vercel preview `https://papertrader-jqdkttgif-altafrs-projects.vercel.app` completed; unauthenticated `/dashboard` returned deployment-protection HTTP 302. Scheduler gates remain disabled.
- **Next smallest unit:** Keep scheduler gates disabled until separately authorized; the dashboard schedule is informational only.

## Completed Build Unit — Phase 6.83

- **User story:** As the operator, I can rely on one validated schedule definition across worker, API, and dashboard.
- **Implemented:** Centralized the default cron and UTC timezone in `@momentum/config`; worker scheduling and API health consume the shared helper/constants.
- **Verification:** 204 tests, build, typecheck, lint, secret-surface audit, and diff checks passed. Invalid empty/oversized cron values are rejected; no scheduler or external side effect occurred.
- **Hosted verification:** Worker deployment `d30ac49d-9846-42c2-b146-5f8cf9dd0fec` and API deployment `640a2429-d1c0-4b78-9687-5be739ab798e` succeeded. Worker/API health is healthy; worker reports the shared `0 0 * * *` UTC schedule, queues are present and drained, and Vercel preview `https://papertrader-3th8iyjvs-altafrs-projects.vercel.app` returns deployment-protection HTTP 302.
- **Next smallest unit:** Keep scheduler and broker gates disabled until separately authorized.

## Completed Build Unit — Phase 6.84

- **User story:** As the operator, I can distinguish an enabled daily scheduler from an enabled daily preparation handler.
- **Implemented:** Added the daily handler gate to the dashboard operations-health card; parsing and the API contract remain read-only and fail closed.
- **Verification:** 204 tests, build, typecheck, lint, secret-surface audit, and diff checks passed. No scheduler or external side effect occurred.
- **Hosted verification:** Vercel preview `https://papertrader-93lkx2zng-altafrs-projects.vercel.app` completed successfully; unauthenticated `/dashboard` returns deployment-protection HTTP 302. Scheduler, handler, and broker gates remain disabled.
- **Next smallest unit:** Keep all activation gates disabled until separately authorized; the handler indicator is observational only.

## Completed Build Unit — Phase 6.85

- **User story:** As the operator, I can see whether the no-send Telegram test preflight is ready without exposing the approval reference or a send control.
- **Implemented:** Added bounded Telegram test-preflight metadata to API operations health, strict browser parsing, and the dashboard health card.
- **Verification:** 204 tests, build, typecheck, lint, secret-surface audit, and diff checks passed. No Telegram request or state mutation occurred.
- **Hosted verification:** API deployment `c148935e-7ac7-4b73-811b-9eb3ffa334ff` succeeded and private `/health` returned healthy. Vercel preview `https://papertrader-2h7vwewgb-altafrs-projects.vercel.app` completed; unauthenticated `/dashboard` returned deployment-protection HTTP 302. No Telegram request occurred.
- **Next smallest unit:** Obtain explicit authorization before any real channel test; the dashboard preflight indicator has no send authority.

## Completed Build Unit — Phase 6.86

- **User story:** As the operator, I see the same no-send Telegram test-preflight state from private worker health and authenticated API health.
- **Implemented:** Added bounded `telegramAlertTest` metadata to the shared worker health contract and worker projection, with no approval-reference value returned.
- **Verification:** 205 tests, build, typecheck, lint, secret-surface audit, and diff checks passed. No Telegram request or state mutation occurred.
- **Hosted verification:** Worker deployment `54a1858e-0c36-409a-a7a1-806bbd0532d6` succeeded. Private health reports `telegramAlertTest:{approvalReferencePresent:false,status:"blocked"}`, healthy observe mode, disabled scheduler gates, and both queues present and drained. No Telegram request occurred.
- **Next smallest unit:** Obtain explicit authorization before any real channel test; the worker health field has no send authority.

## Completed Build Unit — Phase 6.75

- **User story:** As the operator, I receive a bounded critical alert if an explicitly enabled daily scheduler fails to start or processes a failed job, without leaking internal errors.
- **Implemented:** Added scheduler alert callbacks for startup/runtime failure paths and wired them to the disabled-by-default Telegram adapter; notification failures cannot alter scheduler state.
- **Verification:** 199 tests passed; typecheck, lint, production build, secret-surface audit, and diff checks passed. Telegram remains unconfigured and disabled; no alert or scheduler action occurred.
- **Next smallest unit:** Deploy the alert wiring and verify the worker remains healthy with Telegram absent and all scheduler/trading gates disabled.
- **Hosted verification:** Deployment `19d282d4-cf94-4d93-9f48-e5a6ecdc7340` succeeded; worker health is healthy observe mode, queues are present and drained, Telegram variables are absent, and broker/scheduler/handler/Paper Autopilot gates remain disabled.

## Completed Build Unit — Phase 6.74

- **User story:** As the operator, I can configure a primary critical-alert channel server-side and test it once without exposing credentials or enabling unrelated trading behavior.
- **Implemented:** Added `@momentum/notifications`, Telegram configuration/formatting/redaction/transport boundaries, `.env.example`/README guidance, and the guarded worker `telegram-alert-test` command with a non-secret test reference.
- **Verification:** 199 tests passed; typecheck, lint, production build, secret-surface audit, and diff checks passed. Telegram remains disabled and no message was sent from this workspace.
- **Next smallest unit:** Configure the Railway worker Telegram secrets and obtain explicit approval for the guarded channel test; do not enable alerts persistently until the channel is verified.
- **Hosted verification:** Worker deployment `c83e71c6-4885-4d8b-8858-b3f592a35391` succeeded; health is healthy observe mode, queues are present and drained, Telegram variables are absent, and broker/scheduler/Paper Autopilot gates remain disabled.

## Completed Build Unit — Phase 6.73

- **User story:** As the paper-trading operator, I can run Paper Autopilot without a human confirmation prompt for each order while retaining deterministic server-side risk approval.
- **Implemented:** Added the explicit `executePaperAutopilotOrder` entry point and documented the deterministic `PaperOrderApproval` contract; retained the compatibility alias without adding a human-approval field.
- **Verification:** 198 tests passed; typecheck, lint, production build, secret-surface audit, and diff checks passed. No broker request, paper order, scheduler activation, or persistent variable change occurred.
- **Next smallest unit:** Deploy the semantic contract if needed by runtime callers, then continue with controlled paper account verification before any Paper Autopilot activation.
- **Hosted verification:** Worker deployment `1c0b43a2-fbe0-4d86-9fd0-3a22720a0945` succeeded; hosted Paper Autopilot readiness is `disabled`, health is healthy observe mode, queues are present and drained, and persistent execution gates remain disabled.

## Completed Build Unit — Phase 6.72

- **User story:** As the paper-autopilot readiness gate, I cannot report `ready` when the required durable scheduler lacks its activation reference.
- **Implemented:** Added scheduler activation-reference presence to Paper Autopilot readiness checks and blocked reasons; updated ready/missing-reference coverage.
- **Verification:** 194 tests passed; typecheck, lint, production build, secret-surface audit, and diff checks passed. No paper order, scheduler, or persistent variable action occurred.
- **Next smallest unit:** Deploy the readiness alignment and verify hosted default-disabled state; keep Paper Autopilot and scheduler gates disabled.
- **Hosted verification:** Deployment `e940dae6-7cf3-4559-98c0-b472bfc3b33e` succeeded. Hosted Paper Autopilot readiness returned `disabled`, `paperRiskPolicyValid:true`, and the explicit scheduler-reference check; worker health is healthy observe mode and persistent gates remain disabled.

## Completed Build Unit — Phase 6.71

- **User story:** As an operator, I can compare private worker health with API/dashboard scheduler activation readiness without exposing the reference value.
- **Implemented:** Added `activationApprovalReferencePresent` to the shared WorkerHealth contract and worker health response, with default-safe coverage.
- **Verification:** 194 tests passed; typecheck, lint, production build, secret-surface audit, and diff checks passed. No runtime gate or persistent Railway setting changed.
- **Next smallest unit:** Deploy the worker contract alignment and verify health, queue state, and disabled gates.
- **Hosted verification:** Deployment `72f7fc06-3d19-4b3d-833c-3cfc30f3c67d` succeeded; worker health includes the boolean activation-reference state, remains healthy observe mode, queues are present and drained, and persistent broker/scheduler/handler/autopilot gates remain disabled.

## Completed Build Unit — Phase 6.70

- **User story:** As the authenticated operator, I can see whether scheduler activation review is configured without seeing the approval reference itself.
- **Implemented:** Added the boolean activation-reference state to the Railway API operations-health response, strict dashboard parser, and protected dashboard card.
- **Verification:** 194 tests passed; typecheck, lint, production build, secret-surface audit, and diff checks passed. No browser authority or persistent runtime gate changed.
- **Next smallest unit:** Deploy API and dashboard changes, then verify the protected route/health contract while keeping scheduler gates disabled.
- **Hosted verification:** API deployment `e96f4386-5570-4eaf-a490-42f182dc70bf` reached `SUCCESS` with private health `status:"healthy"`; durable queues remain present and drained and Railway broker gate remains false. Vercel deployment was rejected by the free-tier daily limit, so the previous protected preview remains the latest deployed dashboard.
- **Frontend verification:** Latest Ready preview `https://papertrader-l6s6eyyvu-altafrs-projects.vercel.app` returned HTTP `302` for unauthenticated `/dashboard`, confirming deployment protection.

## Completed Build Unit — Phase 6.69

- **User story:** As the operator, I can see whether the scheduler activation reference gate is satisfied without exposing the reference value.
- **Implemented:** Added `activationApprovalReferencePresent` to durable scheduler readiness checks and covered both valid and missing-reference paths.
- **Verification:** 194 tests passed; typecheck, lint, production build, secret-surface audit, and diff checks passed. No persistent Railway setting or scheduler behavior changed.
- **Next smallest unit:** Deploy the explicit readiness check and verify hosted output remains safe and disabled by default.
- **Hosted verification:** Deployment `25318526-4866-45ad-969e-55ef885aecdf` succeeded. Default readiness is `disabled` with the explicit boolean check true-by-default while scheduling is off; command-scoped rehearsal is `ready`, and worker health remains healthy observe mode.

## Completed Build Unit — Phase 6.68

- **User story:** As the operator, I can rehearse daily scheduler activation against the hosted migration state without changing persistent gates or starting a queue.
- **Implemented:** Added `DAILY_RECONCILIATION_ACTIVATION_PREFLIGHT=true` support through `daily-reconciliation-activation-preflight`; it overlays broker/handler/scheduler gates in memory and requires the activation reference.
- **Verification:** 194 tests passed; typecheck, lint, production build, secret-surface audit, and diff checks passed. No queue, broker, scheduler, or reconciliation side effect occurred locally.
- **Next smallest unit:** Deploy the rehearsal and run it once over Railway's private network, then record the bounded result and confirm persistent defaults remain disabled.
- **Hosted verification:** Deployment `c586472f-32f6-4297-89e5-3196c678d688` succeeded. The command-scoped rehearsal returned `status:"ready"`; the normal readiness check returned `disabled`, health remained healthy observe mode, and persistent broker/handler/scheduler/autopilot gates stayed disabled.

## Completed Build Unit — Phase 6.67

- **User story:** As the operator, I can require explicit review before enabling the persistent daily scheduler without adding approval per paper order.
- **Implemented:** Added `DURABLE_SCHEDULER_ACTIVATION_APPROVAL_REFERENCE` validation for enabled scheduling; readiness reports a bounded missing-reference reason and startup fails closed on invalid configuration.
- **Verification:** 193 tests passed; typecheck, lint, production build, secret-surface audit, and diff checks passed. Railway persistent scheduler, handler, and broker gates remain disabled.
- **Next smallest unit:** Deploy the activation guard, rerun hosted readiness, and only then review a separately authorized scheduler activation.
- **Hosted verification:** Worker deployment `f0fd4349-c156-4548-ad3d-4660882c432a` reached `SUCCESS`; combined readiness remains `disabled`, health is healthy observe mode, and persistent broker/handler/scheduler/autopilot gates plus the activation reference remain unset/disabled.

## Completed Verification Unit — Phase 6.66

- **User story:** As the operator, I can confirm the deployed daily reconciliation path is migration-ready while remaining disabled until explicitly activated.
- **Hosted verification:** `DAILY_RECONCILIATION_READINESS=true pnpm --filter @momentum/worker daily-reconciliation-readiness` returned `status:"disabled"` with migration readiness `ready`, paper mode true, configured database/credentials, and broker/handler/scheduler gates false. Health remained healthy observe mode; both queues were present and drained.
- **Safety boundary:** This was read-only. No queue enqueue, Alpaca request, reconciliation write, scheduler activation, Paper Autopilot activation, or persistent variable change occurred.
- **Next smallest unit:** Review the explicit activation procedure and obtain operator authorization before changing persistent scheduler/handler/broker gates.

## Completed Build Unit — Phase 6.65

- **User story:** As the daily reconciliation worker, I can reject malformed or unexpected persisted queue payloads before any account read or database write.
- **Implemented:** Added runtime validation for the exact daily-preparation kind/version and bounded optional run/provenance fields; wired it into both recurring and one-run handlers.
- **Verification:** 192 tests passed; typecheck, lint, production build, secret-surface audit, and diff checks passed. No hosted queue, broker, database-write, scheduler, or Paper Autopilot action occurred.
- **Next smallest unit:** Deploy the validation boundary and verify worker health/queue state; obtain fresh approval before any one-run execution.
- **Hosted verification:** Worker deployment `cd9dab8d-cc3a-41c8-8517-c2c8d25dcefd` reached `SUCCESS`; private health is healthy observe mode, queues are present and drained, and persistent broker/scheduler/autopilot gates remain disabled.

## Completed Build Unit — Phase 6.64

- **User story:** As the guarded one-run command, I can use an idempotent pg-boss job identifier without conflating it with the operator-facing audit run ID.
- **Implemented:** Added a deterministic UUID mapping for bounded run IDs and used it only for the pg-boss `id` option; the original run ID remains the provenance field checked by the worker handler.
- **Verification:** 191 tests passed; typecheck, lint, production build, secret-surface audit, and diff checks passed. No hosted one-run retry or persistent gate change occurred.
- **Next smallest unit:** Deploy this correction and verify worker health/queue state; obtain a new approval before any hosted one-run attempt.
- **Hosted verification:** Worker deployment `fcc3c0ac-7bbd-4261-8e39-3e6f6f2f9b71` reached `SUCCESS`; health is healthy observe mode, queues are present and drained, and persistent `BROKER_CONNECTION_ENABLED=false` remains unchanged.

## Completed Operations Unit — Phase 6.63

- **User story:** As the operator, I can run one newly approved paper reconciliation attempt and receive a bounded lifecycle-stage diagnosis when it fails.
- **Execution evidence:** Approval reference `PAPER-RECONCILIATION-RETRY-123` and unique run ID `paper-reconciliation-retry-20260823-01` were used exactly once. The command returned `failure_code=one_run_failed failure_stage=job_enqueue` without raw provider/database details.
- **Post-run evidence:** The read-only verifier found both queues present and drained, no persisted audit provenance for the retry ID, and the existing reconciliation read model fresh. Worker health remained healthy observe mode; persistent broker, scheduler, handler, and Paper Autopilot gates remained disabled.
- **Implemented:** Added a bounded `queue_enqueue_error` fallback category for future opaque failures at the enqueue boundary, with focused coverage.
- **Verification:** 190 tests passed; typecheck, lint, production build, secret-surface audit, and diff checks passed. No further retry is authorized by this unit.
- **Hosted verification:** Worker deployment `458e21a5-f6c5-4d28-8e26-1b085de888bd` reached `SUCCESS`; private health returned `status:"healthy"`, `operatingMode:"observe"`, configured paper/database surfaces, and disabled broker/scheduler gates.
- **Next smallest unit:** Inspect the enqueue boundary implementation and deployment/runtime evidence, then obtain a new approval/reference before any additional one-run attempt.

## Completed Design Artifact — Interactive Architecture Simulation

- **User-visible outcome:** Added a standalone interactive architecture explainer that steps through an approved paper trade, stale-data rejection, global kill-switch block, and ambiguous broker retry/reconciliation flow.
- **Architecture fidelity:** The explainer keeps the Vercel dashboard separate from Railway runtime authority, distinguishes AI proposal services from deterministic risk/execution gates, treats Alpaca as broker truth, and shows PostgreSQL as the canonical audit/state boundary.
- **Safety boundary:** The artifact is a local, inline simulation outside the deployed application. It contains no credentials, network requests, broker calls, database writes, controls, or claims of live operation.
- **Verification:** The fragment rendered successfully with the visualization renderer, remained below 1 MB, used a responsive single-column layout below 680px, and passed literal-markup/readback checks.

## Completed Design Artifact — Excalidraw Data-Flow Map

- **User-visible outcome:** Added an importable Excalidraw architecture map showing Vercel/browser, Clerk, Railway API/worker, research agents, strategies, trade intents, deterministic risk/execution, Alpaca, PostgreSQL, reconciliation, and alerting.
- **Data-flow coverage:** Arrows distinguish identity/session, structured evidence, normalized signals, immutable intents, freshness-checked inputs, risk decisions, idempotent paper orders, broker events, reconciliation, and audit persistence.
- **Safety boundary:** The diagram represents the current paper-only design and does not add runtime behavior, credentials, external calls, or live-trading capability.
- **Verification:** JSON parses successfully; element IDs are unique; bindings resolve to existing elements; the file is saved outside the checked-out application as an editable `.excalidraw` artifact.

## Completed Build Unit — Telegram Alert Channel Boundary

- **User-visible outcome:** Telegram Bot API is now the selected primary notification provider, with a server-only Railway worker adapter and a guarded one-shot channel test command.
- **Implemented:** Added `@momentum/notifications`, strict enablement/configuration checks, numeric chat-ID validation, 4,096-character message bounds, URL/credential-like text redaction, injected-transport tests, and `telegram-alert-test` requiring a command-scoped non-secret approval reference.
- **Safety boundary:** The adapter is disabled by default, never runs in browser code, never logs bot tokens/chat IDs/provider responses, and does not alter Alpaca, risk, scheduler, or Paper Autopilot behavior. No Telegram message was sent from this workspace because the Railway secret boundary is not accessible here.
- **Verification:** 198 tests passed; typecheck, lint, and production build passed. Worker deployment `1c0b43a2-fbe0-4d86-9fd0-3a22720a0945` reached `SUCCESS`; Railway confirmed token/chat variables are configured without printing values, Telegram `getMe` returned HTTP 200, and the guarded send attempt returned HTTP 403 (no alert delivered), indicating bot access/target-chat permission needs correction.

## Completed Hosted Verification — Telegram Destination Correction

- **Root cause:** Railway's `TELEGRAM_CHAT_ID` pointed to a private chat belonging to another bot. Telegram `getChat` succeeded, while `sendMessage` returned HTTP 403 with `Forbidden: the bot can't send messages to the bot`.
- **Fix:** Read the configured bot's pending update metadata without exposing message text or credentials, identified the operator's private chat, set the Railway worker `TELEGRAM_CHAT_ID` to that verified destination, and redeployed the local worker build so the guarded test command remained available.
- **Verification:** Worker deployment `92a03701-6ae4-43f3-8e3b-114ecbe71d63` reached `SUCCESS` and `RUNNING`; the guarded command returned `Telegram alert channel test sent.` No credential or provider response body was logged.

## Session Handoff

- **What exists:** Verified hosted foundation, authenticated read-only account/dashboard surfaces, protected market-data and stream boundaries, deterministic strategies/replay/risk/execution contracts, research-agent tooling, guarded paper execution wiring, durable queue and scheduler boundaries, migration `0008` and `0009` applied, API and dashboard migration-readiness visibility, bounded browser/API reason contracts, and fresh hosted daily-reconciliation readiness. Railway API deployment `0be9a305-3ce5-4031-8fee-4c922fb46899` and Vercel preview `dpl_4NrANzRza3rdLjSc86NxuxQnv9gG` are ready. Migration readiness is `ready`; combined daily readiness is `disabled`; broker access, recurring scheduler, research scheduling, and Paper Autopilot remain disabled.
- **Where to resume:** Diagnose the `job_enqueue` boundary using code/runtime evidence; any additional guarded one-run requires a new separate explicit non-secret approval reference and unique run ID.
- **Important context:** Keep Alpaca paper mode, broker access, recurring scheduling, and Paper Autopilot disabled until migration readiness is `ready` and the one-run paper procedure is explicitly approved.
- **Recommended next prompt:** `Inspect the queue enqueue boundary` (no broker retry or recurring scheduling until separately approved).

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

### 2026-08-24 — Phase 6.87 unique retry-provenance preflight complete

- Added `durable-one-run-retry-readiness`, a guarded read-only worker command that checks a proposed retry approval reference and run ID against persisted one-run audit provenance.
- Added repository lookup by approval reference and pure tests covering a fresh pair and reuse of the previously consumed retry identifiers.
- Verified 207 tests, full build, typecheck, lint, secret-surface audit, and diff checks. No queue, broker, Telegram, database-write, scheduler, or Paper Autopilot action was performed.

### 2026-08-24 — Phase 6.88 idempotent queue reuse for guarded reconciliation complete

- Updated the guarded one-run command to require and reuse both existing durable queues; queue creation remains exclusively in the separately guarded migration command.
- Observed the prior hosted failure at `queue_provision` while the queues were already present and drained; added a regression test for the reuse path.
- Verified 208 tests and worker build. The retry remains pending a fresh deployment; no second reconciliation attempt was made.

### 2026-08-24 — Phase 6.89 first verified paper end-to-end slice complete

- Deployed Worker `9de48837-8d37-464f-b729-1cc59f91ac85` successfully and reran the fresh guarded one-run after the queue-boundary fix.
- The command completed with approval reference `PAPER-RECONCILIATION-RETRY-124` and run ID `paper-reconciliation-retry-20260824-01`; the verifier returned `status:"verified"`, persisted provenance, `reconciliation.status:"fresh"`, and zero queued/active/failed jobs.
- API `https://api-production-e0a6.up.railway.app/health` returned healthy. No persistent flag was changed; no order, Telegram, scheduler, or live action occurred.

### 2026-08-24 — Phase 6.90 daily-run result visibility complete

- Added the latest durable one-run audit read model to authenticated Operations Health and strict dashboard parsing/rendering for completed/unavailable daily-run status.
- Verified 208 tests, lint, typecheck, secret-surface audit, and diff checks. API deployment `6037be24-09de-489a-a3e7-2edf05dec855` is successful; Vercel production deployment `dpl_Ch1McJGMxPc8NzCBdQjRwFYrfmbJ` is Ready. No broker or queue side effect was introduced by this unit.

### 2026-08-24 — Phase 6.91 daily activation rehearsal verified

- Railway guarded activation preflight returned `status:"ready"` with migration and scheduler blocked-reason lists empty under command-scoped rehearsal values.
- Persistent scheduler, handler, and broker variables were not changed; no queue, Alpaca, Telegram, order, or Paper Autopilot action occurred.

### 2026-08-24 — Phase 6.92 activation/rollback runbook hardened

- Corrected the runbook's queue behavior and added explicit recurring activation and rollback checklists with required persistent variables and verification evidence.
- Documentation-only change; no hosted state changed.

### 2026-08-24 — Phase 6.93 read-only scheduler queue activation guard complete

- Recurring scheduler and one-run startup now require existing migrated queues and never mutate queue schema during activation.
- Worker deployment `0712ec60-a46f-438c-958a-5eaa6193466f` succeeded; hosted durable status returned both queues present with zero queued/active/failed jobs. No persistent gate or trading behavior changed.

### 2026-08-24 — Phase 6.94 recovery runbook added

- Added [`docs/railway-recovery-runbook.md`](docs/railway-recovery-runbook.md) with backup/PITR setup, logical dump, isolated restore drill, production recovery, and rollback evidence requirements.
- Documentation-only change; scheduled backups, restore drills, and persistent runtime activation remain unverified and unperformed.

### 2026-08-24 — Phase 6.95 Railway PITR audit

- Read-only Railway PostgreSQL inspection found volume `postgres-volume` `Ready`, but PITR `enabled:false` and `bucketWired:false`.
- No infrastructure setting changed. Enabling PITR and recording a restore drill remain explicit operator tasks.

### 2026-08-24 — Phase 6.96 recovery verification visibility complete

- Added `RECOVERY_DRILL_VERIFIED` default-safe configuration and strict API/dashboard recovery status rendering.
- Verified 209 tests, build, typecheck, lint, secret-surface audit, and diff checks. The status remains `unverified` in hosted configuration until PITR and restore evidence are recorded.
- API deployment `392decbc-015d-4fd0-a75b-a6f6fb4aef72` succeeded and Vercel deployment `dpl_NAt8esJQUk5aNxiQapUBx2s7TmTw` is Ready. The operator-recorded recovery flag remains unset; no infrastructure or runtime gate changed.

### 2026-08-24 — Phase 6.97 auditable recovery verification contract complete

- Recovery verification now requires the explicit boolean, bounded evidence reference, and UTC verification timestamp; incomplete evidence remains unverified.
- Verified 209 tests, typecheck, lint, build, secret-surface audit, and diff checks. No hosted state changed.

### 2026-08-24 — Phase 6.98 guarded recovery readiness command complete

- Added the guarded Worker `recovery-readiness` command for no-side-effect validation of the recovery evidence contract.
- Verified 209 tests, typecheck, lint, build, secret-surface audit, and diff checks. No hosted variable, PITR, queue, broker, scheduler, or trading state changed.
- Worker deployment `02b6a8bd-7f6e-4ff3-988f-9f365958889b` succeeded; hosted recovery readiness returned the expected safe `unverified` result with all evidence checks false.
- API deployment `471f72e5-8c1a-4b94-9370-b4d3732c7f39` succeeded; hosted recovery remains unverified with the evidence variables unset.

### 2026-08-24 — Phase 6.99 Railway PITR enabled

- Enabled Railway PostgreSQL point-in-time recovery for production. PITR status now reports `enabled:true`, `bucketWired:true`, one backup, and a healthy WAL archiver; the PostgreSQL deployment `ccd145f6-7e4f-4a02-bc7f-d9436f462073` reached `SUCCESS`.
- The recovery evidence contract remains unverified because no isolated restore drill has been completed and no `RECOVERY_DRILL_*` evidence variables were set.

### 2026-08-24 — Phase 6.100 daily paper scheduler activated

- Ran the command-scoped activation rehearsal successfully, then enabled the Worker flags with bounded operator reference `USER-REQUEST-20260824`: durable scheduler, daily preparation handler, and broker connection enabled; Paper Autopilot remains explicitly disabled.
- Railway deployment `8be0f606-d5f0-423d-bd15-802dee009ec7` reached `SUCCESS`. Hosted `daily-reconciliation-readiness` returned `status:"ready"` with migration and scheduler blocked-reason lists empty.
- Deployment was uploaded from the verified workspace because the GitHub-linked `main` source predates the scheduler command. No live mode, live credentials, or Paper Autopilot setting was enabled.

### 2026-08-24 — Phase 6.101 scheduler runtime health verified

- Private Worker Health returned `healthy` with durable scheduler `scheduled`, UTC cron `0 0 * * *`, next run `2026-08-25T00:00:00.000Z`, broker connection enabled, and the global kill switch inactive.
- Guarded queue status confirmed both durable queues present and drained with zero queued, active, or failed jobs. The first naturally scheduled cycle has not yet occurred; no one-run trigger was issued in this phase.
- Next smallest unit: observe the first scheduled cycle and verify queue drain, persisted audit provenance, reconciliation freshness, and the dashboard result, or obtain explicit approval for a bounded immediate paper reconciliation if earlier evidence is required.

### 2026-08-24 — Phase 6.102 pre-cycle scheduler and recovery audit complete

- Rechecked private Worker Health: `healthy`, durable scheduler `scheduled`, cron `0 0 * * *` UTC, next run `2026-08-25T00:00:00.000Z`, and global kill switch inactive.
- Rechecked guarded queue status: work and dead-letter queues are present and drained. The known paper reconciliation run `paper-reconciliation-retry-20260824-01` still verifies with persisted provenance and fresh reconciliation; this does not substitute for observing the recurring cycle.
- PITR restore syntax and recovery evidence requirements were reviewed without creating a restored service. No restore, scheduler trigger, broker request, or Paper Autopilot action was issued in this phase.
- Next smallest unit: observe the first scheduled cycle, then perform an explicitly reviewed isolated PITR restore drill before setting recovery verification evidence.

### 2026-08-24 — Phase 6.105 read-only scheduled-cycle verifier ready

- Added `DAILY_CYCLE_VERIFY=true pnpm --filter @momentum/worker daily-cycle-verify`, which validates a cycle start timestamp against the latest persisted reconciliation capture and confirms both durable queues are present and fully drained.
- The verifier is read-only and fail-closed; it does not call Alpaca, write PostgreSQL, enqueue work, start scheduling, or enable Paper Autopilot. Tests cover a fresh post-cycle capture, a pre-cycle capture, and non-drained queues.
- Verification: 212 tests, full typecheck, lint, production build, and secret-surface audit pass. No hosted cycle trigger or recovery restore was performed.
- Next smallest unit: deploy the verifier, run it after the first natural scheduler cycle, and record the evidence before proceeding to the isolated PITR restore drill.

### 2026-08-24 — Phase 6.106 read-only scheduled-cycle verifier deployed

- Worker deployment `110d2323-36ec-4700-a2bc-655488b8728a` reached `SUCCESS`.
- Hosted `DAILY_CYCLE_VERIFY=true` with cycle start `2026-08-25T00:00:00Z` returned the expected fail-closed `status:"incomplete"`: the latest persisted capture predates the cycle, while both queues were present and drained. No broker request, database write, queue enqueue, or scheduler trigger occurred.
- Next smallest unit: run the verifier after the first naturally scheduled cycle and record a verified post-cycle capture, then obtain approval for the isolated PITR restore drill.

### 2026-08-24 — Phase 6.112 durable scheduler-run audit contract prepared

- Added reviewed migration `0010_durable_schedule_runs.sql` with running/completed/failed status constraints, timestamp fields, optional account snapshot linkage, and bounded failure codes.
- Added the typed `createDurableScheduleRunRepository` contract and focused tests for start, completion, failure, and latest-run retrieval.
- Verification: 214 tests, full typecheck, lint, production build, and secret-surface audit pass. Migration `0010` was not applied, the hosted Worker was not redeployed, and no scheduler, broker, or trading behavior changed.
- Next smallest unit: obtain explicit approval to apply migration `0010`, then wire runtime audit writes behind a guarded activation flag.

### 2026-08-24 — Phase 6.113 guarded durable scheduler-run audit wiring prepared

- Added optional scheduler audit callbacks for start, completed snapshot linkage, and bounded failure recording. The `DURABLE_SCHEDULER_AUDIT_ENABLED` gate is strict; enabling it fails closed unless migration `0010` and its required table/columns are present.
- Added scheduler tests for audit transitions and preserved the default-disabled path. Hosted variables were not changed, migration `0010` was not applied, and no Worker deployment or scheduler behavior changed.
- Verification: 215 tests, full typecheck, lint, production build, and secret-surface audit pass.
- Next smallest unit: obtain explicit approval to apply migration `0010`, then deploy and enable the audit gate for one observed cycle.

### 2026-08-24 — Phase 6.114 guarded durable scheduler-run audit wiring deployed

- Worker deployment `a7047f5d-1f2c-4b4b-8319-113a8b2c1698` reached `SUCCESS`.
- Private Worker Health remains `healthy` with durable scheduler `scheduled`, cron `0 0 * * *` UTC, and the global kill switch inactive. `DURABLE_SCHEDULER_AUDIT_ENABLED` remains unset, so no new database table is accessed.
- No migration application, scheduler trigger, broker request, or trading behavior changed.

### 2026-08-24 — Phase 6.115 scheduler-run audit migration approval guard added

- Extended the read-only migration plan contract so `0010_durable_schedule_runs.sql` is explicitly marked `approvalRequired:true`.
- Kept the guarded migration writer restricted to the already reviewed `0009`, preventing accidental application of `0010` before a separate review.
- Verification: 216 tests, full typecheck, lint, production build, and secret-surface audit pass. No database mutation or hosted scheduler behavior changed.

### 2026-08-24 — Phase 6.116 hosted scheduler-run audit migration plan verified

- Worker deployment `673d1964-9ed0-429a-ab7f-b3e32b37346a` reached `SUCCESS`.
- Hosted `DATABASE_MIGRATION_PLAN=true pnpm --filter @momentum/worker database-migration-plan` returned exactly one pending migration: `0010_durable_schedule_runs.sql` with `approvalRequired:true` and a present schema migration ledger.
- No SQL mutation, scheduler trigger, broker request, or trading behavior occurred. Applying `0010` remains a separately approved action.

### 2026-08-24 — Phase 6.117 read-only scheduler-audit migration readiness deployed

- Added the guarded `durable-schedule-audit-readiness` Worker command, which checks migration `0010`, the `durable_schedule_runs` table, and its required columns without writing SQL.
- Added focused complete/blocked migration-guard tests. Verification: 218 tests, full typecheck, lint, production build, and secret-surface audit pass.
- No hosted migration, scheduler trigger, broker request, or trading behavior changed.

### 2026-08-24 — Phase 6.118 hosted scheduler-audit migration readiness verified blocked

- Worker deployment `3131b4a4-31d8-4d69-81a7-eb39b3188296` reached `SUCCESS`.
- Hosted `DURABLE_SCHEDULE_AUDIT_READINESS=true pnpm --filter @momentum/worker durable-schedule-audit-readiness` returned the expected fail-closed result: `migration_not_recorded`, `schedule_runs_table_missing`, and `schedule_runs_columns_missing`.
- No SQL mutation, scheduler trigger, broker request, or trading behavior occurred. Applying `0010` remains separately approved.

### 2026-08-24 — Phase 6.119 approval-gated scheduler-audit migration command prepared

- Added `durable-schedule-audit-migrate`, requiring the explicit migration gate, exact target `0010`, and bounded non-secret approval reference. It refuses unexpected pending versions and runs the SQL transactionally when explicitly invoked.
- Added focused tests for missing gate, wrong target, missing approval reference, unexpected pending versions, and the valid approval path.
- Verification: 220 tests, full typecheck, lint, production build, and secret-surface audit pass. The command was not executed; migration `0010` remains unapplied.

### 2026-08-24 — Phase 6.120 approval-gated scheduler-audit migration command deployed

- Worker deployment `d4f8adcb-9caa-45a9-bf00-9fab909b854e` reached `SUCCESS`.
- The dedicated `durable-schedule-audit-migrate` command is now available on the Worker. It was not invoked; migration `0010`, scheduler audit activation, and all trading behavior remain unchanged.

### 2026-08-24 — Phase 6.121 scheduler-audit migration command guard verified

- Hosted invocation with `DURABLE_SCHEDULE_AUDIT_MIGRATE=false` failed closed at the explicit gate before database access, as designed.
- No migration, scheduler, broker, or trading behavior changed. Migration `0010` remains pending explicit approval.

### 2026-08-24 — Phase 6.122 scheduler-audit migration `0010` applied and readiness verified

- Applied `0010_durable_schedule_runs.sql` through the dedicated approval-gated Worker command using bounded reference `SCHEDULER-AUDIT-0010-123`.
- Hosted `DURABLE_SCHEDULE_AUDIT_READINESS=true` returned `{"blockedReasons":[],"ready":true}` and the migration planner returned `pending:[]` with the schema ledger present.
- `DURABLE_SCHEDULER_AUDIT_ENABLED` remains unset; scheduler audit writes are not active and existing scheduler behavior is unchanged. No broker request, order submission, Paper Autopilot activation, or restore drill occurred.
- **Next smallest unit:** Obtain separate explicit authorization to enable the scheduler audit gate, observe one guarded cycle, and verify its persisted run record before proceeding to the isolated PITR restore drill.

### 2026-08-24 — Phase 6.123 post-migration scheduler health verified

- Hosted scheduler-audit readiness remains `ready:true` with no blocked reasons; the migration planner reports `pending:[]` and `schemaMigrationsTablePresent:true`.
- Private Worker Health remains `healthy`; the durable scheduler is `scheduled` on `0 0 * * *` UTC with the global kill switch inactive, operating mode `observe`, and Paper Autopilot still disabled.
- No scheduler trigger, broker request, order submission, or audit activation occurred. The migration is ready for runtime use, but `DURABLE_SCHEDULER_AUDIT_ENABLED` still requires a separate explicit activation reference.
- **Next smallest unit:** Obtain an explicit bounded reference to enable the scheduler audit gate, then deploy and verify one audited daily cycle.

### 2026-08-24 — Phase 6.124 scheduler-audit activation preflight deployed and verified

- Added the read-only `durable-schedule-audit-activation-readiness` command, which checks the applied `0010` migration, paper-only runtime, scheduler prerequisites, kill switch, Paper Autopilot state, and a separate bounded audit activation reference.
- Added a runtime guard requiring `DURABLE_SCHEDULER_AUDIT_ACTIVATION_APPROVAL_REFERENCE` whenever `DURABLE_SCHEDULER_AUDIT_ENABLED=true`; the reference is validated without being logged or returned.
- Worker deployment `ac1e43c3-586b-4f32-ac47-069abb763efd` reached `SUCCESS`. A command-scoped rehearsal returned `status:"ready"`; a missing-reference rehearsal failed closed. Worker Health remains `healthy` with the daily scheduler scheduled.
- No persistent variable, scheduler cycle, broker request, order submission, or Paper Autopilot state changed.
- **Next smallest unit:** Obtain an explicit bounded activation reference, set the audit gate and reference together, then verify one persisted completed/failed scheduler-run record.

### 2026-08-25 — Phase 6.125 scheduler-run audit observability deployed to API

- Added the authenticated Operations Health scheduler-audit read model and strict dashboard parsing/rendering for the latest recurring run: completed, failed, running, or unavailable.
- The API redacts database/provider details and exposes only bounded status, run ID, UTC timestamps, and generic failure code. Missing schema/rows fail soft to `unavailable` so legacy/default-disabled operation remains safe.
- Verification: 224 tests, full typecheck, lint, and production build pass. API deployment `2efb3330-8ee5-4b59-a169-834cf11432cd` reached `SUCCESS`; public health is healthy and unauthenticated Operations Health returns `401`.
- Vercel production deployment `https://papertrader-j3idgz4ns-altafrs-projects.vercel.app` is `Ready` after a bounded retry, so the dashboard observability change is confirmed live.
- No scheduler audit activation, scheduler trigger, broker request, order submission, or Paper Autopilot state changed.
- **Next smallest unit:** Obtain an explicit bounded audit activation reference before enabling runtime audit writes.

### 2026-08-25 — Phase 6.126 first natural daily paper cycle verified

- Read-only `DAILY_CYCLE_VERIFY=true` with start `2026-08-25T00:00:00Z` returned `status:"verified"`; reconciliation was captured at `2026-08-25T00:00:32.065Z` and classified `fresh`.
- Both durable queues were present and drained: work and dead-letter queues each reported zero queued, active, and failed jobs. No trigger, enqueue, database write, or broker request was issued by the verifier.
- The runtime scheduler audit gate remains disabled, so the dashboard correctly reports scheduler audit as unavailable until a separately authorized activation.
- **Next smallest unit:** Obtain an explicit bounded audit activation reference, enable the audit gate and reference together, then verify the first persisted scheduler-run record.

### 2026-08-25 — Phase 6.127 bounded secret-surface and hosted-log audit verified

- `pnpm audit:secret-surfaces` passed: no credential-like values were found in source or browser output.
- A bounded 200-line JSON log scan for both Railway Worker and API found no Alpaca API/secret key labels, private-key markers, or credentialed PostgreSQL URL patterns.
- This is scoped evidence only; it does not claim a full PostgreSQL data-content audit. No runtime flags, scheduler behavior, broker request, order submission, or Paper Autopilot state changed.
- **Next smallest unit:** Obtain an explicit bounded scheduler-audit activation reference, then enable and verify the first persisted scheduler-run record.

### 2026-08-25 — Phase 6.128 bounded credential-surface audit completed

- Read-only hosted PostgreSQL scan examined 63 public text/varchar columns and found zero credential-like matches; no values were printed.
- Live Vercel production root returned HTTP 200 with no credential-like pattern. Combined with the passing source/browser secret-surface script and bounded Worker/API log scan, the current credential-surface audit is complete.
- No runtime flag, scheduler behavior, broker request, order submission, or Paper Autopilot state changed.
- **Next smallest unit:** Obtain an explicit bounded scheduler-audit activation reference, then enable and verify the first persisted scheduler-run record.

### 2026-08-25 — Phase 6.129 repeatable database credential-surface audit deployed and verified

- Added the guarded `database-credential-surface-audit` Worker command. It scans aggregate pattern counts across PostgreSQL text/varchar columns and never prints values.
- Worker deployment `39aa5a9f-4e0a-4cd1-9d69-578b85bdfbe1` reached `SUCCESS`; hosted execution returned `status:"passed"`, `columnsScanned:63`, `matchingColumns:0`, and `matchingRows:0`.
- The `DATABASE_CREDENTIAL_SURFACE_AUDIT=false` guard test failed closed before database access. No persistent runtime variable, scheduler behavior, broker request, order submission, or Paper Autopilot state changed.
- **Next smallest unit:** Obtain an explicit bounded scheduler-audit activation reference, then enable and verify the first persisted scheduler-run record.

### 2026-08-25 — Phase 6.130 scheduler-audit gate visibility deployed

- Added a redacted API/dashboard read model that distinguishes the scheduler-audit write gate (`disabled`, `blocked`, or `enabled`) from the latest persisted run status. It exposes only booleans and bounded status values; activation references are never returned.
- Verification: 227 tests, full typecheck, lint, and production build pass. API deployment `a62ace4e-caff-40a7-ab2e-c5654ded16e9` reached `SUCCESS`; Vercel production deployment `https://papertrader-7xv59tusl-altafrs-projects.vercel.app` reached `Ready`; `/health` returned healthy and unauthenticated Operations Health returned `401`.
- The production dashboard continues to show the audit write gate as disabled, with migration `0010` ready and no runtime audit writes. No scheduler trigger, broker request, order submission, or Paper Autopilot state changed.
- **Next smallest unit:** Obtain an explicit bounded scheduler-audit activation reference, then enable and verify the first persisted scheduler-run record.

### 2026-08-25 — Phase 6.131 scheduler-audit activation and Telegram delivery verified

- Activated `DURABLE_SCHEDULER_AUDIT_ENABLED=true` with operator reference `SCHEDULER-AUDIT-ACTIVATE-001` on the Worker and mirrored the two non-secret gate variables to the API. No Paper Autopilot or live-trading setting changed.
- Worker deployment `90444c76-e1e0-4a04-ba59-5de61f30777b` and API deployment `55f63d2f-7b04-4e01-8b11-6f1ee0173fec` reached `SUCCESS`. Guarded activation readiness returned `status:"ready"`; queue status showed both queues present and drained; API health was healthy and unauthenticated Operations Health returned `401`.
- The explicitly requested Telegram channel test sent successfully from the Railway Worker with command-scoped reference `USER-REQUEST-TELEGRAM-20260825`. Credentials and provider response data were not logged.
- No manual scheduler trigger was issued. The first `durable_schedule_runs` record will be verified after the next natural UTC daily cycle. PITR restore-drill evidence remains unverified.
- **Next smallest unit:** Observe the next natural daily cycle and verify its persisted scheduler-run status, reconciliation freshness, and drained queues.

### 2026-08-25 — Phase 6.132 scheduler-audit cycle verifier deployed

- Added guarded read-only `DURABLE_SCHEDULE_AUDIT_VERIFY=true pnpm --filter @momentum/worker durable-schedule-audit-verify`. It checks the latest persisted scheduler-run status, scheduled time, reconciliation freshness, and both durable queues without triggering or writing anything.
- Verification: 229 tests, full typecheck, lint, and production build pass. Worker deployment `1cc4bee8-ee98-48e4-9e37-22196cfee7c8` reached `SUCCESS`.
- Hosted pre-cycle verification for `2026-08-26T00:00:00Z` returned `status:"incomplete"` with `scheduler_audit_run_unavailable` and `reconciliation_before_cycle`; both queues were present and drained. No manual trigger, broker request, order submission, or Paper Autopilot change occurred.
- **Next smallest unit:** Run the verifier after the next natural UTC daily cycle and record the first persisted scheduler-run evidence.

### 2026-08-25 — Phase 6.133 Worker Health scheduler-audit visibility deployed

- Added redacted private Worker Health fields for scheduler-audit enablement and bounded-reference presence. No approval reference or migration/provider detail is returned.
- Verification: 229 tests, full typecheck, lint, and production build pass. Worker deployment `b27c8db6-1134-47c6-8f33-a991ef38e39a` reached `SUCCESS`.
- Hosted Worker Health returned `healthy`, durable scheduler `scheduled`, audit enabled, audit reference present, next run `2026-08-26T00:00:00Z`, global kill switch inactive, paper mode observe, and Telegram configuration ready. Queues remain drained.
- **Next smallest unit:** Run the deployed audit verifier after the natural `2026-08-26T00:00:00Z` cycle, then record the first persisted run evidence.

### 2026-08-25 — Phase 6.134 isolated PITR restore drill

- Executed the approved faster-path restore to bounded target `2026-08-25T11:30:00Z` using Railway PITR, creating isolated sibling service `Postgres-restored-20260825-1130` (`aa11412e-345e-4a43-aab4-a7e6c7c2b67f`). Production remained untouched; no scheduler trigger, broker request, order submission, or Paper Autopilot change occurred.
- Restore deployment `485a3d57-9a08-4a7f-ad90-34f02ca23d11` reached `SUCCESS`. It was created at `2026-08-25T11:40:39.400Z`; recovery logs reported readiness at `2026-08-25T11:44:15.650Z`, an observed deployment-to-ready interval of approximately 3m36s. A read-only query confirmed migration `0010`, `durable_schedule_runs`, and `pgboss.job` are present; restored audit row count was `0`.
- The isolated sibling is retained for review; it was not attached to API/Worker and no post-restore reconciliation was run. `RECOVERY_DRILL_VERIFIED` remains unset because the full runbook evidence package and bounded approval/timestamp record are still pending.
- **Next smallest unit:** After the natural `2026-08-26T00:00:00Z` cycle, run the read-only scheduler-audit verifier; then decide whether to complete the separate post-restore reconciliation/evidence gate or proceed directly to Paper Autopilot validation.

### 2026-08-25 — Phase 6.135 pre-cycle Paper Autopilot readiness

- Hosted `PAPER_AUTOPILOT_READINESS=true` returned `status:"disabled"` with paper mode, paper credentials, broker/database/scheduler/handler gates, inactive global kill switch, and risk policy checks passing. The policy reported the fixed `USD 1,000` baseline, `0.25%` planned-risk cap, and `USD 100` absolute cap.
- Hosted `PAPER_AUTOPILOT_RUNTIME_READINESS=true` reported a fresh persisted reconciliation captured at `2026-08-25T00:00:32.065Z` (age `42,808` seconds at capture) and overall `status:"disabled"` because Paper Autopilot and operating mode remain intentionally off.
- This was read-only: no broker request, order submission, queue trigger, database write, or persistent Railway variable change occurred.
- **Next smallest unit:** After `2026-08-26T00:00:00Z`, run the deployed scheduler-audit verifier and record the first persisted scheduler run before any Paper Autopilot activation review.

### 2026-08-25 — Phase 6.136 Paper Autopilot activation rehearsal

- A command-scoped hosted rehearsal with `PAPER_AUTOPILOT_ENABLED=true` and `OPERATING_MODE=paper_autopilot` returned `status:"ready"`; all paper-mode, credentials, broker/database, scheduler/handler, kill-switch, risk-policy, and freshness checks passed.
- The rehearsal was read-only and ephemeral. No Railway variable was changed, no Worker restart or queue trigger occurred, and no Alpaca request or order submission was made.
- **Next smallest unit:** Verify the first natural scheduler-audit record after `2026-08-26T00:00:00Z`; then review explicit persistent Paper Autopilot activation with the operator.

### 2026-08-25 — Phase 6.137 Telegram provider-level delivery validation

- Hardened `sendTelegramAlert` to require a valid JSON response with `ok:true`; an HTTP-200 response containing `ok:false` or malformed JSON is now treated as delivery failure without exposing provider details.
- Added regression tests for success and provider-level failure. Notifications package tests (8) and typecheck pass.
- No hosted runtime, secret, scheduler, broker, queue, or trading state changed.
- **Next smallest unit:** Verify the first natural scheduler-audit record after `2026-08-26T00:00:00Z`, then review persistent Paper Autopilot activation.

### 2026-08-25 — Phase 6.138 Telegram validation deployed

- Worker deployment `bc805397-2995-4f7d-bf01-5ae609c5980e` reached `SUCCESS` with the Telegram provider-level response check included. Private Worker Health remained healthy; the daily scheduler is scheduled for `2026-08-26T00:00:00Z`, global kill switch is inactive, operating mode is observe, and Paper Autopilot is disabled.
- This was a code-only deployment. No secret, persistent variable, queue, scheduler trigger, broker request, or order state changed.
- **Next smallest unit:** Verify the first natural scheduler-audit record after `2026-08-26T00:00:00Z`, then review persistent Paper Autopilot activation.

### 2026-08-25 — Phase 6.139 isolated PITR schema checksum

- Read-only schema-only dump of the isolated restored sibling hashed to `72ceb28d6cfb15199263962f483689b778c2c52e3a15f40c8712d498f7496c8f`.
- The checksum is schema evidence only; no account values, credentials, broker request, queue trigger, or production state were exposed or changed.
- **Next smallest unit:** Verify the first natural scheduler-audit record after `2026-08-26T00:00:00Z`, then complete separately approved post-restore reconciliation evidence.

### 2026-08-25 — Phase 6.140 startup reconciliation recovery gate

- Worker startup now reconciles the paper Alpaca account before registering the durable daily schedule. A failed startup reconciliation leaves scheduling paused, marks scheduler health degraded, and attempts a generic critical Telegram alert.
- This is paper-only and restart-safe: no live endpoint, order submission, or AI/risk bypass was added. Local verification passed: 230 tests, typecheck, lint, and production build.
- **Next smallest unit:** Deploy the recovery gate, verify Worker health and fresh reconciliation, then observe the natural scheduler-audit cycle.

### 2026-08-25 — Phase 6.141 startup reconciliation recovery gate deployed

- Worker deployment `43119259-7ec4-4d90-97ac-4b276228cada` reached `SUCCESS`. Worker Health is healthy with the durable scheduler scheduled for `2026-08-26T00:00:00Z`, observe mode, inactive kill switch, and Paper Autopilot disabled.
- Hosted runtime readiness confirmed a fresh reconciliation captured at `2026-08-25T12:07:59.337Z` (age 38 seconds at check), demonstrating startup reconciliation completed before scheduling resumed.
- No manual scheduler trigger or order action occurred.
- **Next smallest unit:** Verify the first natural scheduler-audit record after `2026-08-26T00:00:00Z`.

### 2026-08-25 — Phase 6.142 recovery gate source published

- Pushed the completed recovery-gate implementation and evidence commits to GitHub branch `phase-6-10-operator-health` at commit `47b0632`.
- Source publication did not change hosted variables, scheduler state, queues, broker state, or trading behavior.
- **Next smallest unit:** Verify the first natural scheduler-audit record after `2026-08-26T00:00:00Z`.

### 2026-08-25 — Phase 6.143 startup recovery invariant tests

- Added focused startup recovery tests: scheduling starts after successful reconciliation, and a failed reconciliation invokes failure handling without starting the scheduler.
- Verification passed: 232 tests, typecheck, lint, and production build. No hosted state changed in this test-only refinement.
- **Next smallest unit:** Verify the first natural scheduler-audit record after `2026-08-26T00:00:00Z`.

### 2026-08-25 — Phase 6.144 startup recovery tests deployed

- Worker deployment `75287072-b5d4-473c-997d-1b9e3f7974e3` reached `SUCCESS`; Worker Health remains healthy with the daily scheduler scheduled for `2026-08-26T00:00:00Z`, observe mode, inactive kill switch, and Paper Autopilot disabled.
- No manual scheduler trigger or order action occurred.
- **Next smallest unit:** Verify the first natural scheduler-audit record after `2026-08-26T00:00:00Z`.

### 2026-08-25 — Phase 6.145 post-deployment secret-surface audit

- `pnpm audit:secret-surfaces` passed with no credential-like values in source or browser output.
- This was read-only; no hosted variables, scheduler, queue, broker, or trading state changed.
- **Next smallest unit:** Verify the first natural scheduler-audit record after `2026-08-26T00:00:00Z`.

### 2026-08-25 — Phase 6.146 Paper Autopilot activation runbook

- Added [`docs/paper-autopilot-activation-runbook.md`](docs/paper-autopilot-activation-runbook.md), documenting the exact paper-only preconditions, read-only rehearsal, persistent activation sequence, rollback, and evidence requirements.
- No Railway variable, scheduler, queue, broker, or trading state changed.
- **Next smallest unit:** Verify the first natural scheduler-audit record, then use the runbook for the explicit activation review.

### 2026-08-26 — Phase 6.147 guarded paper end-to-end evidence run

- Added `paper-e2e-run-once`, a single command-scoped workflow that reconciles the Alpaca paper account, reads bounded market bars, runs the typed research agent, and persists both reconciliation provenance and research evidence for the dashboard.
- The command is explicitly paper-only, requires broker/database gates and a bounded non-secret run reference, refuses to run while Paper Autopilot is enabled, submits no orders, and never prints provider data or credentials.
- Verification passed: 257 tests, Worker typecheck, lint, and full workspace build. No hosted state changed yet.
- Worker deployment `caf894b9-fa02-4d46-908e-3544e8c68ef9` reached `SUCCESS`. The bounded run `paper-e2e-20260826-001` completed against Alpaca paper with fresh capture `2026-08-25T23:27:43.224Z`; durable one-run verification returned `status:"verified"` with both queues drained and persisted provenance, and research verification returned a succeeded stock agent artifact.
- No order was submitted, Paper Autopilot was not enabled, and no persistent runtime flag changed. The authenticated dashboard can now display the new reconciliation and research evidence through the existing protected overview path.
- **Next smallest unit:** add a deterministic candidate-to-risk-decision dry run (still no order submission), then use the resulting evidence to decide whether to activate Paper Autopilot for a first paper order.

### 2026-08-26 — Phase 6.148 candidate-to-risk dry run

- Added a guarded candidate-to-risk step to the paper end-to-end command. It converts the top persisted research candidate into an immutable long signal with a 5% planned stop, runs the existing deterministic paper-risk engine, and persists an explicit `risk_dry_run_approved` or `risk_dry_run_rejected` decision with the market snapshot and risk reasons.
- The dry run requires fresh account/data state, verified USD 100,000 paper baseline, inactive kill switch, and all existing exposure/entry limits. It never calls an order submitter and refuses to run with Paper Autopilot enabled.
- Verification passed: 259 tests, Worker typecheck, lint, and full workspace build. Hosted deployment and one dry-run execution remain next.
- **Next smallest unit:** deploy the Worker, run one bounded risk dry run, and verify the persisted decision through the protected dashboard read model.

### 2026-08-26 — Phase 6.149 one-shot paper order path

- Added an explicit command-scoped order mode to the paper end-to-end runner. With `PAPER_E2E_ORDER_ONCE=true`, `PAPER_AUTOPILOT_ENABLED=true`, and `OPERATING_MODE=paper_autopilot` supplied only to that SSH process, the runner uses the existing deterministic approval and `executePaperAutopilotOrder`, submits one paper market order, and immediately reconciles the paper account.
- The command defaults to one share, remains hard-gated to paper mode/broker/database/freshness/baseline/kill-switch/risk checks, uses an idempotent client order ID, and never changes persistent Railway flags. Evidence-only runs still cannot submit orders.
- Local verification passed: 260 tests, Worker typecheck and lint. Hosted deployment and the single paper order remain to be executed.
- **Next smallest unit:** deploy and run the one-shot paper order, then verify its broker order ID/status and dashboard row.

### 2026-08-26 — Phase 6.150 hosted order attempt remains safely blocked at baseline verification

- Worker deployment `aac93862-2050-4d6e-8400-5d201d924c03` reached `SUCCESS` with explicit fresh-baseline verification enabled only for the command-scoped attempt.
- The bounded one-share AAPL paper-order attempt failed closed at the deterministic risk gate with `Starting paper-equity baseline has not been verified.` No Alpaca order was submitted, no persistent Paper Autopilot flag changed, and no credentials or account values were exposed.
- Local verification passed: 261 tests, worker typecheck, lint, and workspace build. The remaining blocker is to establish an approved USD 100,000 paper-account baseline evidence record (or reset/confirm the Alpaca paper account to that baseline); bypassing this gate is not permitted.
- **Next smallest unit:** inspect the persisted baseline evidence state, then either record a valid bounded USD 100,000 baseline verification or obtain the operator decision to reset the paper account before retrying the one-share order.

### 2026-08-26 — Phase 6.151 baseline readiness diagnostic verified in production

- Added guarded `PAPER_BASELINE_READINESS=true` verification. It reports only baseline classifications and overall readiness; it never prints account balances, credentials, or provider responses.
- Production result: `currentBaseline:"outside_tolerance"`, `initialBaseline:"outside_tolerance"`, `status:"blocked"`. This confirms the deterministic rejection is caused by missing USD 100,000 baseline evidence, not by a market-data, broker-connectivity, or order-submission error.
- Worker runtime remains healthy in paper-autopilot mode, with broker/database configured, kill switch inactive, and the daily UTC scheduler scheduled. No order was submitted.
- **Next smallest unit:** reset/confirm the Alpaca paper account at USD 100,000 or provide an approved baseline-evidence decision; then rerun the guarded one-share order.

### 2026-08-26 — Phase 6.152 paper-account reset runbook

- Added [`docs/paper-account-baseline-reset-runbook.md`](docs/paper-account-baseline-reset-runbook.md) with the supported Alpaca dashboard flow, secret-rotation requirements, read-only verification command, and evidence required before retrying the first order.
- Alpaca's documented current workflow creates a new paper account rather than changing the existing account balance through this application. The trading system remains fail-closed until the new account reports a verified USD 100,000 baseline.
- **Next smallest unit:** operator creates the new Alpaca paper account, rotates the two Railway Worker secrets, and runs the baseline-readiness command.

### 2026-08-26 — Phase 6.153 live baseline visibility deployed

- Added a redacted baseline classification to authenticated Operations Health: current snapshot, initial snapshot, and overall status are shown as classifications only (`within_tolerance`, `below_baseline`, `above_baseline`, or `unavailable`). No account values are exposed through the health contract.
- Updated the dashboard to show **Baseline verification** alongside the USD 100,000 policy target, so the operator can distinguish the configured policy from verified broker state.
- Verification passed: 265 tests, domain/database/API/Worker/web typechecks. Railway API deployment `318c9527-5b74-4031-a409-53c0857640a5` and Worker deployment `484f043d-8abc-4c83-bc58-fe5d4a047cb7` are `SUCCESS` and running; API health and Worker health are healthy.
- The live account remains below baseline, so order submission remains blocked as designed.
- **Next smallest unit:** after the paper-account reset and secret rotation, confirm the dashboard changes to `Baseline verification: Verified`, then execute and reconcile the first one-share paper order.

### 2026-08-26 — Phase 6.154 daily scheduler cycle verified

- Hosted read-only scheduler-audit verification confirmed the `2026-08-26` UTC cycle completed successfully (`scheduled-daily-preparation-2026-08-26`).
- Reconciliation was fresh at capture, the audit status was completed, and both durable work/dead-letter queues were present with zero queued, active, or failed jobs.
- This proves the daily server loop and recovery/audit path are operating end to end. It did not submit an order or alter the paper baseline gate.
- **Next smallest unit:** after the Alpaca paper-account reset and credential rotation, run baseline readiness, then execute the guarded one-share order and verify its broker reconciliation.

### 2026-08-26 — Phase 6.155 daily research preparation enabled

- Research scheduler preflight passed with paper mode, broker connection, database, paper credentials, and handler gates all ready.
- Enabled `RESEARCH_SCHEDULER_ENABLED=true` and `RESEARCH_HANDLER_ENABLED=true` in Railway production. This schedules the daily research-preparation artifact workflow; it does not submit orders.
- The variable update triggered an automatic deployment from an old GitHub commit, which was detected because Worker health regressed to the legacy minimal contract. The current branch was immediately redeployed from the workspace as `ce74cc34-7dc5-491f-8648-6e478b5e425d`.
- Current Worker health is restored: Alpaca/database configured, durable scheduler scheduled, research scheduler scheduled, paper-autopilot mode, kill switch inactive. No order was submitted.
- **Next smallest unit:** verify the first scheduled research-preparation run and its persisted agent artifact, then complete the Alpaca baseline reset before attempting the first paper order.

### 2026-08-26 — Phase 6.156 research scheduler runtime correction and guard check

- The immediate guarded market-research attempt failed closed without submitting an order; no new provider data or credentials were exposed. Existing persisted research artifacts remain intact and the Worker stayed healthy.
- A production deployment regression caused by Railway's automatic variable-triggered deploy was detected and corrected by redeploying the current workspace branch. The corrected Worker health contract now reports the full scheduler/research runtime state.
- **Next smallest unit:** verify the first naturally scheduled research-preparation job and persisted artifact from the enabled research scheduler.

### 2026-08-26 — Phase 6.157 research universe configured and deployed

- The enabled research queue had no symbol configuration, which would have caused a fail-closed preparation job. Added the explicitly bounded, previously validated universe: stocks `AAPL,MSFT`; crypto `BTC/USD`; timeframe `1Day`; limit `100`; maximum candidates `10`.
- The configuration preflight returned `status:"ready"`. Worker deployment `1ea2488c-0ea7-4de4-b9f4-7f148bd447f1` reached `SUCCESS`; Worker health reports both durable and research schedulers scheduled, with paper broker/database gates healthy.
- No order was submitted. The chosen universe is recorded here rather than left implicit so it can be reviewed or changed deliberately.
- **Next smallest unit:** verify the first scheduled research-preparation job and its persisted stock/crypto artifacts.

### 2026-08-26 — Phase 6.158 guarded research preparation verified with partial-feed resilience

- Added and deployed the guarded `research-preparation-once` command, which invokes the same queue handler used by the daily scheduler and remains strictly non-trading.
- Production execution completed with a fresh persisted stock research artifact. The crypto plan failed closed because Alpaca returned fewer than two usable bars; the handler retained the successful stock result instead of failing the entire daily queue.
- The command now returns per-asset result statuses, making partial success explicit in operator evidence. Verification: 266 tests, Worker typecheck/build, deployment `1becf05e-37eb-4def-8243-0697c15bda73` healthy.
- **Next smallest unit:** allow the next natural scheduler cycle to persist the same per-asset outcomes, then use the fresh stock artifact for the baseline-gated one-share order once Alpaca is reset.

### 2026-08-26 — Phase 6.159 fresh research-to-risk path verified

- The fresh stock research artifact persisted successfully but contained zero actionable candidates. The guarded order command therefore used its explicit AAPL snapshot fallback.
- The pipeline reached the deterministic `risk_gate` stage and rejected the one-share attempt solely because the USD 100,000 starting baseline remains unverified. The broker submitter was never called.
- This verifies the complete pre-order path: persisted research artifact → bounded market snapshot fallback → deterministic 5% risk calculation → fail-closed baseline gate. No order or persistent mode change occurred.
- **Next smallest unit:** after the Alpaca reset and credential rotation, rerun the same command with snapshot fallback; it is ready to submit one paper share only if all gates pass.

### 2026-08-26 — Phase 6.160 live baseline readiness reconciliation

- Extended the guarded baseline-readiness command with `PAPER_BASELINE_READINESS_LIVE=true`. It now reads and reconciles the live paper account before classifying the current and initial snapshots, eliminating stale database evidence after credential rotation.
- Deployment `afb01261-d8ad-4177-aa76-63bb9315db4b` reached `SUCCESS`; live verification returned `currentBaseline:"outside_tolerance"`, `initialBaseline:"outside_tolerance"`, `status:"blocked"` without exposing account values or submitting an order.
- **Next smallest unit:** create the new USD 100,000 paper account and rotate Railway credentials, then rerun the live readiness command; a `ready` result will unlock the guarded order attempt.

### 2026-08-26 — Phase 6.161 guarded paper-order preflight

- Added and deployed `PAPER_ORDER_PREFLIGHT=true`, which reconciles the live account, discovers the latest successful stock research artifact, counts candidates, and checks snapshot-fallback availability without submitting an order.
- Production preflight returned: baseline blocked, latest stock artifact succeeded, candidate count `0`, AAPL snapshot fallback available, overall status blocked. This gives the post-reset order procedure a single deterministic readiness check.
- Worker deployment `b9161dc4-692c-4a81-9b68-f87350ad6c30` reached `SUCCESS`; no trading or persistent mode change occurred.
- **Next smallest unit:** after credential rotation, run the preflight until `status:"ready"`, then run the guarded one-share order with snapshot fallback.

### 2026-08-27 — Phase 6.162 post-trade baseline confirmation path

- Confirmed through the paper broker that the connected account is active and has a historical filled PFD order; current equity is below USD 100,000 because of that prior paper activity.
- Added an append-only `paper_baseline_confirmations` table, repository methods, and guarded `paper-baseline-confirm` command. An operator can record the factual USD 100,000 starting baseline against the live reconciled account without fabricating a current balance or bypassing deterministic risk checks.
- Baseline readiness, order preflight, and one-shot order execution now recognize only a persisted confirmation for the same broker account (or an exact baseline snapshot). No order has been submitted in this phase.
- **Next smallest unit:** deploy and migrate `0013`, record the operator baseline confirmation, rerun preflight, then execute and reconcile the bounded one-share paper order.

### 2026-08-27 — Phase 6.163 first end-to-end paper order completed

- Deployed Worker commit `37af5fd` and applied application migration `0013` for baseline confirmations.
- Recorded operator confirmation `PAPER-BASELINE-CONFIRM-20260827` against the reconciled active Alpaca paper account. Readiness and order preflight both returned `status:"ready"` while correctly redacting account values.
- Submitted the bounded one-share AAPL market order using the persisted research run and snapshot fallback. Alpaca reconciliation confirmed the broker order as `filled` with quantity `1`; broker order ID is retained in the audit/read model but is not a credential.
- Updated the authenticated Operations Health baseline status to recognize the same persisted confirmation. No live endpoint or live credential was used.
- **Next smallest unit:** deploy the API visibility change, verify the authenticated dashboard shows baseline verified and the filled order, then continue daily paper-forward monitoring.

### 2026-08-27 — Phase 6.164 broker reconciliation projection corrected

- Production Worker deployment `176545f0-5b2b-4ac5-9c83-840b3f6fbf3b` reached `SUCCESS` with the PostgreSQL order upsert fix.
- A read-only reconciliation rerun updated the persisted AAPL order projection from the initial acknowledgement to `filled` with filled quantity `1`, matching Alpaca broker truth.
- Focused repository and risk tests passed (17 tests). No new order was submitted.
- **Next smallest unit:** verify the authenticated dashboard’s order row, then continue monitoring the next natural daily research/reconciliation cycle.

### 2026-08-27 — Phase 6.165 deterministic position-exit evaluator

- Added the domain-level position-management contract and evaluator for long-position stop-loss, profit-target, and time-stop exits.
- The evaluator is pure and decimal-safe: it produces a structured exit decision and never accesses Alpaca or submits an order. Stop-loss takes precedence over a target when the current mark satisfies both thresholds.
- Added focused tests for stop, target, time-stop, and hold outcomes. The next unit is wiring this evaluator to reconciled positions and an idempotent paper sell-order path.

### 2026-08-27 — Phase 6.166 deterministic paper exit adapter

- Added a server-only Alpaca paper sell adapter that accepts only a `shouldExit:true` decision with a deterministic stop, target, or time-stop reason.
- The adapter uses client-order-id idempotency and the paper endpoint; it has no AI, browser, or live endpoint authority.
- Added mocked tests covering deterministic-exit enforcement and one-time sell submission. Position metadata and a Worker polling command remain to be wired next.

### 2026-08-27 — Phase 6.167 persisted entry/exit metadata

- Added migration `0014_paper_order_exit_metadata.sql` and typed fields for entry price, planned stop, planned target, time-stop, and strategy identity on paper-order submissions.
- Approved and rejected research-driven entries now persist the original exit plan, allowing future position management to evaluate broker positions against immutable trade intent data.
- No broker behavior or order authority changed in this unit; the Worker polling/exit orchestration remains the next phase.

### 2026-08-27 — Phase 6.168 exit-plan propagation

- Paper order requests now carry the normalized entry price, planned stop, target, time-stop, and strategy identity into the persistent submission record.
- This metadata is captured for approved and rejected research intents and is available to a future position manager without inferring intent from broker state.
- Typechecks and focused broker/domain tests pass. Migration `0014` and the Worker orchestration remain to deploy and wire in the next unit.

### 2026-08-27 — Phase 6.169 exit-plan metadata deployed

- Worker deployment `41cee59c-03f6-4ceb-bb4a-117604927e67` reached `SUCCESS` with the exit-plan persistence changes.
- Application migration `0014` applied successfully (`migrationCount:14`). Worker Health remains healthy in `paper_autopilot` mode with durable and research schedulers scheduled.
- No new order was submitted. The next unit is the guarded position polling loop that consumes this metadata and submits/reconciles deterministic exits.

### 2026-08-27 — Phase 6.170 position-management runner

- Added a Worker runner that evaluates reconciled positions against their persisted entry/stop/target/time-stop plans and submits only deterministic paper exits.
- Exit client IDs are derived from the originating intent and exit reason, providing idempotent retry behavior. The runner is dependency-injected and has tests for stop submission, hold behavior, and fail-closed broker errors.
- This unit does not start a scheduler or mutate production state. Next: wire the runner to reconciled Alpaca positions, persisted plan metadata, market snapshots, and a guarded recurring Worker job.

### 2026-08-27 — Phase 6.171 guarded position-management command

- Added `POSITION_MANAGEMENT_ONCE=true`, a paper-autopilot-only Worker command that reconciles Alpaca, joins open positions to persisted exit plans, reads current paper marks, evaluates deterministic exits, and submits idempotent sell orders when required.
- The command fails closed on missing credentials/database, disabled broker, observe mode, or global kill switch; it is not connected to the recurring scheduler yet.
- Added a bounded repository query for exit-plan metadata. Next: deploy migration/command, verify the current account has no unmanaged exit plan, then activate a recurring guarded position-management schedule.

### 2026-08-27 — Phase 6.172 position-management command deployed

- Worker deployment `357a39c6-4cac-4415-a94f-e860729bdb20` reached `SUCCESS`; migration target `0014` is applied and Worker Health remains healthy.
- Production one-shot execution completed safely with `status:"no_managed_positions"` and zero submissions. The existing AAPL position predates exit-plan metadata, so it was intentionally skipped rather than given an inferred stop or target.
- **Next smallest unit:** add an explicit operator-reviewed metadata backfill/close path for legacy positions, then activate recurring position management for newly created managed positions.

### 2026-08-27 — Phase 6.173 recurring position-management scheduler primitive

- Added a guarded recurring scheduler primitive for position-management passes with a minimum 30-second interval, immediate first run, clean shutdown, non-overlap protection, and bounded degraded error state.
- Added health accessors and tests for successful and failed runs. It is not wired into production startup yet; this prevents accidental exit submissions before legacy position metadata is reviewed.
- **Next smallest unit:** add the explicit legacy-position plan review/backfill path, then compose this scheduler with the live Alpaca position runner.

### 2026-08-27 — Phase 6.174 legacy exit-plan backfill path

- Added guarded `exit-plan-backfill`, requiring a bounded operator reference and exact entry/stop/target/strategy metadata for a legacy paper order.
- The repository refuses to backfill a submission that already has plan metadata, preventing silent overwrites. The reference is retained with the record for audit provenance.
- No production backfill or broker mutation was performed. The operator must supply the exact legacy entry and exit plan before the AAPL position can be managed automatically.

### 2026-08-27 — Phase 6.175 legacy backfill guard deployed

- Worker deployment `de45fd52-e203-404e-96b1-7007f29aeaa3` reached `SUCCESS`; migration `0015` applied successfully.
- The explicit legacy backfill command is available in production but was not executed. Existing AAPL metadata remains untouched until exact operator-reviewed plan values are supplied.

### 2026-08-27 — Phase 6.176 legacy position runbook

- Added [`docs/legacy-position-exit-plan-runbook.md`](docs/legacy-position-exit-plan-runbook.md) with the recorded AAPL entry snapshot, documented 5% stop/4% target proposal, guarded command template, and no-order mutation warning.
- The runbook keeps operator approval explicit; no metadata backfill, exit order, or recurring schedule activation occurred.

### 2026-08-27 — Phase 6.177 AAPL exit plan applied and always-on objective recorded

- Applied the operator-confirmed reference `AAPL-EXIT-PLAN-001` to the legacy AAPL position: entry `314.39`, stop `298.67` (5% adverse distance), target `326.97`, strategy `research-watchlist@1.0.0`.
- Read-only database verification confirms the immutable exit metadata and reference are persisted. The guarded position-management pass evaluated AAPL at mark `314.66`, returned `shouldExit:false`, and submitted zero sell orders.
- Updated the authoritative product and architecture documents to state that the intended system is self-running and always-on on the server, with coordinated specialist agents optimizing measured risk-adjusted performance while deterministic safety gates remain mandatory.
- **Next smallest unit:** wire the recurring position-management scheduler into Worker startup, expose its last-run/next-run health, and verify restart/idempotency behavior before relying on it for unattended paper exits.

### 2026-08-27 — Phase 6.178 continuous position management and Telegram lifecycle alerts

- Wired the guarded position-management scheduler into Worker startup with a 60-second interval. It reconciles broker truth, reads persisted exit plans, evaluates deterministic stop/target/time-stop rules, and submits only idempotent paper exits.
- Railway Worker deployment `34b90424-d36b-4ab3-a471-a4677be63c60` reached `SUCCESS`. Hosted health confirms `paper_autopilot`, position-management `enabled:true`, readiness `ready`, and a completed recurring pass; no exit was triggered during the observed pass.
- Added centralized redacted Telegram event notifications for research recommendations, paper entries and failures, managed positions, deterministic exit reasons, position-management failures, and daily portfolio summaries after reconciliation. Telegram configuration is ready; provider delivery remains separately `unverified` until an explicitly authorized channel test is recorded.
- **Next smallest unit:** run the authorized Telegram delivery test, then add durable alert-delivery provenance/deduplication and expose the new event categories in the dashboard timeline.

### 2026-08-28 — Phase 6.179 durable Telegram alert provenance

- Added migration `0016_telegram_alert_events.sql` and a PostgreSQL repository for deduplicated alert events with `pending`, `sent`, and `failed` delivery states, attempt counts, and redacted error codes.
- Updated Worker lifecycle notifications to persist before delivery and await completion at database-owning boundaries, eliminating a shutdown race that could lose events. Duplicate events with the same key are skipped safely.
- Railway migration `0016` applied successfully. Worker deployment `3968606f-537f-4f6c-9095-0ed789080af0` reached `SUCCESS`; hosted health remains healthy with position management enabled and Telegram configured.
- Read-only production verification found `daily_portfolio_summary` and `position_detected` events persisted with status `sent` and one attempt each. Provider delivery verification remains separately gated by the explicit Telegram test reference.
- **Next smallest unit:** add the persisted alert events to the authenticated operator-overview timeline, then run the explicitly authorized Telegram channel test.

### 2026-08-28 — Phase 6.180 Telegram alert history in operator overview

- Added persisted Telegram alert events to the authenticated `/v1/operator-overview` response, unified audit timeline, filtered history totals, and CSV export.
- Updated the dashboard contract and audit coverage summary to display Telegram alert counts and include alert events alongside agent, execution, lifecycle, and scheduler records.
- Verified API/web typechecks and 14 focused operator-overview/dashboard tests; no credentials or broker behavior changed.
- **Next smallest unit:** run the explicitly authorized Telegram provider test, then verify the authenticated dashboard and CSV against the deployed API.

### 2026-08-28 — Phase 6.181 bounded Telegram delivery retry

- Added a bounded retry query for pending/failed Telegram events with a five-attempt ceiling and oldest-first ordering.
- Worker startup now performs an immediate retry pass and checks for retryable alert events every 60 seconds when Telegram and PostgreSQL are configured; retry failures remain isolated from trading decisions.
- Added notifier retry coverage; database/worker typechecks, lint, and Telegram tests pass.
- **Next smallest unit:** run the explicitly authorized Telegram provider test, then verify the authenticated dashboard and CSV against the deployed API.

### 2026-08-28 — Phase 6.182 Telegram delivery dashboard panel

- Added a dedicated authenticated dashboard panel listing persisted Telegram alerts, severity, delivery status, attempt count, delivery timestamp, and redacted message text.
- Added a direct Telegram section link and preserved the unified audit timeline as the cross-system view.
- Verified the web typecheck, lint, and diff checks; no trading or risk behavior changed.
- **Next smallest unit:** run the explicitly authorized Telegram provider test, then verify the authenticated dashboard and CSV against the deployed API.

### 2026-08-28 — Phase 6.183 hosted dashboard propagation check

- Vercel preview `https://papertrader-6gtpmpkz8-altafrs-projects.vercel.app` reached `Ready` for the Telegram delivery panel commit.
- The protected `/dashboard` route returns the expected unauthenticated `302`; authenticated inspection remains intentionally session-bound.
- Railway API and Worker deployments remain successful; repository working tree is clean.
- **Next smallest unit:** run the explicitly authorized Telegram provider test, then verify the authenticated dashboard and CSV against the deployed API.

### 2026-08-28 — Phase 6.184 full regression verification

- Verified all seven TypeScript projects (domain, config, Alpaca, database, API, Worker, and web) with no errors.
- Full Vitest suite passed: 74 files and 278 tests.
- Repository ESLint passed for API, Worker, database, dashboard, and verification scripts.
- **Next smallest unit:** run the explicitly authorized Telegram provider test, then verify the authenticated dashboard and CSV against the deployed API.

### 2026-08-28 — Phase 6.185 Telegram contract validation

- Extended the operator-overview verifier to validate Telegram event IDs, codes, severity, delivery status, attempts, message, and occurrence timestamps.
- Added malformed-alert regression coverage; focused contract tests and lint pass.
- **Next smallest unit:** run the explicitly authorized Telegram provider test, then verify the authenticated dashboard and CSV against the deployed API.

### 2026-08-28 — Phase 6.186 layered architecture reference

- Added [`docs/architecture-block-diagram.md`](docs/architecture-block-diagram.md), a box-and-layer Mermaid diagram covering operator surfaces, Clerk/API, Railway Worker agents, PostgreSQL, Alpaca, market data, and Telegram.
- Documented the engineer-facing decision path and the deterministic risk-engine boundary.
- Linked the diagram from the repository README; documentation-only change.
- **Next smallest unit:** run the explicitly authorized Telegram provider test, then verify the authenticated dashboard and CSV against the deployed API.

### 2026-08-28 — Phase 6.187 dashboard alert parser coverage

- Added dashboard parser coverage proving a persisted Telegram event retains delivery status and remains available to the delivery panel.
- Focused dashboard and overview contract tests passed: 14 tests.
- **Next smallest unit:** run the explicitly authorized Telegram provider test, then verify the authenticated dashboard and CSV against the deployed API.

### 2026-08-28 — Phase 6.188 durable scheduler alert outbox coverage

- Routed durable-scheduler runtime and startup-failure notifications through the persisted Telegram notifier instead of the raw provider sender.
- Scheduler failures now receive the same deduplication, delivery-state, and bounded retry behavior as trade and reconciliation alerts.
- Worker typecheck, focused scheduler/Telegram tests (18 tests), ESLint, and diff checks pass.
- **Next smallest unit:** deploy and verify the Worker, then run the explicitly authorized Telegram provider test and authenticated hosted verification.

### 2026-08-28 — Phase 6.189 scheduler alert persistence deployed

- Railway Worker deployment `24bceb5e-69f6-4f16-9c06-3b4071b0b0e8` reached `SUCCESS` from the current branch.
- Scheduler runtime and startup-failure alerts now run through the durable Telegram outbox in production.
- **Next smallest unit:** run the explicitly authorized Telegram provider test, then verify the authenticated dashboard and CSV against the deployed API.

### 2026-08-28 — Phase 6.190 richer daily Telegram portfolio summary

- Extended the end-of-session Telegram summary with day P/L, unrealized P/L, and gross exposure, while retaining equity, cash, buying power, open positions, and tracked orders.
- Values are derived from the persisted reconciliation snapshot and positions; unavailable/non-finite values are reported as `not reported`.
- Worker typecheck, lint, focused Telegram tests, and diff checks pass.
- **Next smallest unit:** deploy and verify the Worker, then run the explicitly authorized Telegram provider test and authenticated hosted verification.

### 2026-08-28 — Phase 6.191 daily summary deployed

- Railway Worker deployment `9468bfa3-2d34-4ec3-a0cb-e845467b682e` reached `SUCCESS` from the current branch.
- The production end-of-session summary now includes equity, cash, buying power, day P/L, unrealized P/L, gross exposure, open positions, and tracked orders.
- **Next smallest unit:** run the explicitly authorized Telegram provider test, then verify the authenticated dashboard and CSV against the deployed API.

### 2026-08-28 — Phase 6.192 daily summary calculation contract

- Extracted daily portfolio-summary formatting into a pure Worker module using persisted account and position values.
- Added boundary tests for normal P/L/exposure and unavailable/non-finite metrics; Worker typecheck, lint, focused tests, and diff checks pass.
- **Next smallest unit:** deploy and verify the Worker, then run the explicitly authorized Telegram provider test and authenticated hosted verification.

### 2026-08-28 — Phase 6.193 daily summary contract deployed

- Railway Worker deployment `48333184-5ddb-4372-b2f6-6222b4a4d10f` reached `SUCCESS` from the current branch.
- Production daily-summary formatting now runs through the tested pure calculation module.
- **Next smallest unit:** run the explicitly authorized Telegram provider test, then verify the authenticated dashboard and CSV against the deployed API.

### 2026-08-28 — Phase 6.194 Worker production smoke verification

- Railway reports Worker deployment `48333184-5ddb-4372-b2f6-6222b4a4d10f` as `SUCCESS` with a `RUNNING` instance.
- Latest runtime logs show normal container startup; no additional failure output was emitted.
- This was a read-only smoke check; no scheduler mutation, broker call, order, or Telegram provider test was initiated.
- **Next smallest unit:** run the explicitly authorized Telegram provider test, then verify the authenticated dashboard and CSV against the deployed API.

### 2026-08-28 — Phase 6.195 hosted Telegram gate audit

- Read-only Railway variable-name audit confirms paper Alpaca credentials, PostgreSQL, broker/scheduler controls, and Telegram bot/chat configuration are present on the Worker.
- `TELEGRAM_ALERT_TEST_APPROVAL_REFERENCE` is not configured, so the provider test remains correctly blocked; no secret values were read or exposed.
- **Next smallest unit:** add a bounded `TELEGRAM_ALERT_TEST_APPROVAL_REFERENCE`, then run the guarded provider test and authenticated dashboard/CSV verification.

### 2026-08-28 — Phase 6.196 Telegram test runbook

- Added [`docs/telegram-alert-test-runbook.md`](docs/telegram-alert-test-runbook.md) with the exact bounded variables, command, post-test checks, and secret-handling rules for the one-message provider test.
- Linked the runbook from the repository README; documentation-only change.
- **Next smallest unit:** configure an operator-approved bounded reference, run the guarded provider test, and verify the authenticated dashboard/CSV.

### 2026-08-28 — Phase 6.197 explicit Telegram test gate messaging

- Updated the dashboard operations-health card to explain that the Telegram test is blocked because an approval reference is required, and that no message has been sent.
- When ready, the same field states that one guarded message may be sent; web typecheck, lint, and diff checks pass.
- **Next smallest unit:** configure an operator-approved bounded reference, run the guarded provider test, and verify the authenticated dashboard/CSV.

### 2026-08-28 — Phase 6.198 dashboard gate messaging deployed

- Vercel preview `https://papertrader-a3kq7z6bc-altafrs-projects.vercel.app` reached `Ready` with the explicit Telegram test-gate messaging.
- The protected dashboard remains session-bound; unauthenticated access continues to redirect as designed.
- **Next smallest unit:** configure an operator-approved bounded reference, run the guarded provider test, and verify the authenticated dashboard/CSV.

### 2026-08-28 — Phase 6.199 recommendation evidence in Telegram alerts

- Research recommendation alerts now include concise per-candidate momentum return, average volume, RSI14, and relative-volume context when available.
- The evidence is derived from the persisted research artifact and remains informational; it cannot approve or submit an order.
- Worker typecheck, research-preparation tests (6 tests), lint, and diff checks pass.
- **Next smallest unit:** deploy and verify the Worker, then run the explicitly authorized Telegram provider test and authenticated dashboard/CSV verification.

### 2026-08-28 — Phase 6.200 research alert evidence deployed

- Railway Worker deployment `ebe5bc9e-b089-4a87-95e4-99300f021511` reached `SUCCESS` from the current branch.
- Production recommendation notifications now include the tested evidence summary while preserving paper-only, risk-gated behavior.
- **Next smallest unit:** run the explicitly authorized Telegram provider test, then verify the authenticated dashboard and CSV against the deployed API.

### 2026-08-28 — Phase 6.201 auditable Telegram provider test path

- Updated the guarded Telegram provider-test command to require PostgreSQL, enqueue a deduplicated `telegram_channel_test` event, mark it `sent` only after a successful provider response, and mark it failed on delivery error.
- Duplicate approval references are rejected; the command closes its database pool and prints only generic success/failure output.
- Worker typecheck, lint, and diff checks pass without sending a provider message.
- **Next smallest unit:** configure an operator-approved bounded reference, run the auditable provider test, and verify the authenticated dashboard/CSV.

### 2026-08-28 — Phase 6.202 auditable provider test deployed

- Railway Worker deployment `8a3a1418-bb71-467c-ac91-6ae791e5f215` reached `SUCCESS` from the current branch.
- The guarded Telegram provider test now persists its outcome in production while remaining disabled until an approved reference is configured.
- **Next smallest unit:** configure an operator-approved bounded reference, run the provider test, and verify the authenticated dashboard/CSV.

### 2026-08-28 — Phase 6.203 hosted paper runtime flag audit

- Read-only Railway Worker configuration confirms `TRADING_MODE=paper`, `ALPACA_PAPER_TRADE=true`, broker/database access, durable daily scheduler, research scheduler/handler, position management, Paper Autopilot, and Telegram alerts are enabled.
- `MARKET_STREAM_ENABLED` is not configured; streaming remains intentionally off while scheduled finalized-bar workflows and reconciliation continue.
- No credential values were read or exposed; latest Worker logs show normal startup and no emitted runtime failure.
- **Next smallest unit:** configure an operator-approved bounded Telegram test reference, run the provider test, and verify the authenticated dashboard/CSV.

### 2026-08-28 — Phase 6.204 durable scheduler runtime evidence

- Added redacted Worker startup and post-recovery scheduler result events to Railway logs.
- Production deployment `2119d549-d97c-4915-9310-aefed647f5d5` reached `SUCCESS`; logs confirm `started=true`, scheduler `status=scheduled`, cron `0 0 * * *` UTC, and next run timestamp.
- This proves the durable daily scheduler starts after reconciliation, not merely that its flag is enabled.
- **Next smallest unit:** configure an operator-approved bounded Telegram test reference, run the provider test, and verify the authenticated dashboard/CSV.

### 2026-08-28 — Phase 6.205 hosted Telegram no-send preflight

- Ran the hosted Worker no-send preflight with `TELEGRAM_ALERT_TEST_READINESS=true`.
- Telegram configuration is `ready` with token/chat formatting checks passing, while the overall test remains `blocked` solely because `TELEGRAM_ALERT_TEST_APPROVAL_REFERENCE` is missing.
- No Telegram request, database write, broker call, or order action occurred.
- **Next smallest unit:** configure an operator-approved bounded reference, run the provider test, and verify the authenticated dashboard/CSV.

### 2026-08-28 — Phase 6.206 market-stream failure alerting

- Added redacted Telegram events for supervised market-stream disconnects and message-processing failures when the stream is enabled.
- Events use the durable notifier, so they are persisted, deduplicated, retried, and visible in the operator audit history; stream recovery remains independent of alert delivery.
- Worker typecheck, lint, and diff checks pass. Market streaming remains disabled in production until its explicit feed configuration is supplied.
- **Next smallest unit:** configure an operator-approved bounded Telegram test reference, run the provider test, and verify the authenticated dashboard/CSV.

### 2026-08-28 — Phase 6.207 market-stream alerting deployed

- Railway Worker deployment `8a42004a-aeca-4e36-b7c9-9c7b7ff485f9` reached `SUCCESS` from the current branch.
- Production now records supervised market-stream disconnect and processing-failure alerts when streaming is explicitly enabled; the current production stream flag remains off.
- **Next smallest unit:** configure an operator-approved bounded Telegram test reference, run the provider test, and verify the authenticated dashboard/CSV.

### 2026-08-28 — Phase 6.208 post-deployment runtime check

- Latest Railway Worker logs show healthy paper mode, broker/database configured, position management `running`, research schedule `ready`, Telegram alerts `ready`, and durable scheduler start result `started=true` with `status=scheduled`.
- Telegram provider test remains blocked only by its missing approval reference; no provider request was made during this check.
- **Next smallest unit:** configure an operator-approved bounded reference, run the provider test, and verify the authenticated dashboard/CSV.

### 2026-08-28 — Phase 6.209 full repository regression after alerting changes

- Vitest: 282 tests passed.
- TypeScript no-emit checks passed for API, web dashboard, Worker, Alpaca, config, database, domain, and notifications packages.
- ESLint passed with `--max-warnings=0`.
- The two initially attempted non-existent tsconfig paths (`apps/dashboard`, `packages/shared`) were corrected to the repository's actual `apps/web` and package project paths; no code failure was found.
- **Next smallest unit:** configure an operator-approved bounded Telegram test reference, run the provider test, and verify the authenticated dashboard/CSV.

### 2026-08-28 — Phase 6.210 scheduled candidate-to-risk boundary

- Research preparation now returns validated watchlist candidates to the Worker runtime instead of exposing only symbol summaries.
- In Paper Autopilot mode, scheduled candidates are evaluated through the existing deterministic risk engine using the latest account read model, freshness checks, baseline verification, exposure limits, loss policy, and kill-switch state.
- Each decision is persisted as `risk_dry_run_approved` or `risk_dry_run_rejected` with strategy metadata, risk evidence, and point-in-time market indicators; Telegram receives a concise decision notification when enabled.
- Broker submission remains a separate gated boundary; this change cannot place an order merely because research produced a candidate.
- Verification: 75 test files / 282 tests passed, all eight TypeScript projects passed, ESLint passed with zero warnings, secret-surface audit passed, and the web production build passed.
- Railway Worker deployment `3b92a9a4-64c3-41bd-adcb-d680dbed2a16` reached `SUCCESS`; startup logs confirm paper mode, scheduler scheduled, research ready, position management running, and Telegram ready.
- **Next smallest unit:** exercise one scheduled risk cycle against a persisted paper account, then implement the separately gated broker-submission handoff.

### 2026-08-28 — Phase 6.211 hosted scheduled risk-cycle exercise

- Railway Worker deployment `2f5de86a-22ee-4803-8350-f48d14438654` reached `SUCCESS` with the guarded `paper-autopilot-risk-cycle-once` command available.
- Ran guarded research preparation with reference `PAPER-RISK-CYCLE-0211`; the hosted paper runtime persisted fresh stock/crypto research runs, including a BTC/USD candidate with point-in-time indicators.
- Ran the risk cycle with the same bounded reference. It persisted one deterministic decision for `BTC/USD` as `rejected`; no Alpaca order submission was attempted.
- This confirms the scheduled research-to-risk path fails closed on a real hosted paper account and leaves auditable decision evidence for dashboard/Telegram history.
- **Next smallest unit:** expose the persisted risk-cycle decision reason in the authenticated operator view, then implement the separately gated broker-submission handoff.

### 2026-08-28 — Phase 6.212 risk-decision reason visibility

- The dashboard execution-decision table now renders persisted deterministic risk reasons alongside estimated loss, invested-notional percentage, and policy version.
- Rejected and approved scheduled risk decisions therefore expose why the gate passed or failed without exposing private model reasoning or adding order authority to the UI.
- Web production build, web typecheck, and web lint passed.
- **Next smallest unit:** verify the hosted authenticated view contains the `BTC/USD` rejection and reason, then implement the separately gated broker-submission handoff.

### 2026-08-28 — Phase 6.213 separately gated paper order handoff

- Added `PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED`, absent/off by default, as the explicit server-side gate before scheduled approved candidates can reach the paper order executor.
- The enabled path reuses deterministic approval, idempotent client order IDs, durable persistence, broker reconciliation, and Telegram lifecycle notifications; the UI exposes the gate as `Dry-run only` or `Enabled`.
- Railway deployments succeeded: Worker `da762565-56d1-4d2e-8a70-35e7bc9ad34a`; API `76d4a94c-0c2c-45ef-811e-0f8a35163cae`.
- Production order-submission gate remains absent/off, so no new broker order authority was activated by this phase.
- Verification: 282 tests passed, all TypeScript projects passed, ESLint passed, and the web production build passed.
- **Next smallest unit:** review the hosted risk-cycle evidence and explicitly decide whether to enable one bounded paper order submission for end-to-end execution verification.

### 2026-08-28 — Phase 6.214 order-gate readiness contract

- Added the paper order-submission gate to the Worker health/readiness contract and tests.
- Readiness now reports `executionStatus: "dry_run" | "enabled"`; this is descriptive and does not activate or disable production execution.
- Invalid gate values fail closed; credentials and secret values are never included in the health payload.
- Verification: readiness tests, Worker typecheck, and lint passed.
- **Next smallest unit:** verify the hosted API/dashboard displays the redacted gate, then decide whether to enable one bounded paper order for end-to-end execution.

### 2026-08-28 — Phase 6.215 pre-cycle broker reconciliation

- Scheduled research-to-risk processing now refreshes the persisted Alpaca paper account, positions, and orders immediately before evaluating candidates.
- This protects the optional order handoff from stale account state while preserving the dry-run default and all deterministic risk gates.
- Verification: 283 tests passed, Worker typecheck passed, and Worker lint passed.
- Railway Worker deployment `5c2c53fc-78ef-4f75-92b3-9113321318f9` reached `SUCCESS`; startup logs show `paperAutopilotOrderSubmissionEnabled:false` and the durable scheduler started as `scheduled`.
- **Next smallest unit:** verify the hosted dashboard/API displays the refreshed gate and risk decision, then decide whether to enable one bounded paper order for execution verification.

### 2026-08-28 — Phase 6.216 execution runbook synchronization

- Updated the Paper Autopilot activation runbook for the two-stage model: risk dry-run first, then the explicit `PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED=true` handoff.
- Documented one-share bounded execution verification, required reconciliation/Telegram evidence, and a rollback that disables both submission and Paper Autopilot.
- Documentation-only change; no Railway variables or broker state were changed.
- **Next smallest unit:** obtain the operator's explicit activation reference, run one bounded paper order through the guarded path, and verify broker/Telegram/dashboard evidence.

### 2026-08-28 — Phase 6.217 unified broker-write gate

- Updated the guarded one-shot paper-order and paper end-to-end order validators to require `PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED=true` in addition to Paper Autopilot mode.
- Every broker-writing path now shares the same explicit server-side submission gate; dry-run and risk-only paths remain unaffected.
- Verification: targeted gate tests (9 passed), Worker typecheck, and lint passed.
- Railway Worker deployment `1db2b20e-e9f5-4ffa-ae99-69955d7ddf10` reached `SUCCESS`; production submission remains disabled.
- **Next smallest unit:** obtain an operator-approved activation reference and run one bounded paper order through the now-unified gate.

### 2026-08-28 — Phase 6.218 no-write execution preflight

- Extended `paper-order-preflight` to report the explicit submission-gate state and bounded reasons for any remaining blocker.
- A preflight is `ready` only when baseline, persisted research, fresh market data, and `PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED=true` are all present; the command itself has no order authority.
- Updated the activation runbook with the preflight contract and no-write guarantee.
- Verification: 283 tests passed, Worker typecheck and lint passed.
- Railway Worker deployment `8fc0e2e3-e935-443e-a2f8-e3f5e463b084` reached `SUCCESS`.
- **Next smallest unit:** obtain an operator-approved activation reference, run the preflight in Railway, and only then decide whether to submit one bounded paper order.

### 2026-08-28 — Phase 6.219 hosted no-write preflight exercise

- Ran the deployed preflight for `AAPL` inside Railway using the paper Worker environment.
- Result: `status:"blocked"`, `orderSubmissionEnabled:false`, and the sole blocker was `paper_order_submission_gate_disabled`; a fresh account reconciliation and market snapshot were available.
- No Alpaca order submission occurred. This confirms the production safety gate is functioning as designed before any execution activation.
- **Next smallest unit:** obtain an explicit operator activation reference and decide whether to enable one bounded paper order.

### 2026-08-28 — Phase 6.220 command-scoped ready preflight

- Re-ran the Railway preflight with `PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED=true` supplied only to the command process.
- Result: `status:"ready"`, no blocked reasons, fresh AAPL market snapshot available, and baseline evidence recognized.
- The persistent Worker configuration was not changed and no broker order was submitted; this proves all execution prerequisites can pass without activating continuous order writes.
- **Next smallest unit:** use an explicit operator activation reference to run one bounded paper order and verify Alpaca reconciliation, Telegram delivery, and dashboard history.

### 2026-08-28 — Phase 6.221 bounded execution command documentation

- Added the exact command-scoped variables for the one-shot paper-order handoff, including the unified submission gate, bounded approval reference, fresh research run ID, and one-share quantity.
- Documented that the command reconciles before/after submission, emits redacted outcome metadata, and must not be used to silently activate continuous scheduled submissions.
- Documentation-only change; no persistent Railway variables or broker state changed.
- **Next smallest unit:** provide an explicit activation reference and run the one-shot paper order through the guarded command.

### 2026-08-28 — Phase 6.222 activation-reference gate

- Added a required bounded `PAPER_AUTOPILOT_ORDER_SUBMISSION_APPROVAL_REFERENCE` whenever the server-side submission flag is enabled.
- Worker readiness now distinguishes `blocked`, `dry_run`, and `enabled` execution status; missing or malformed references fail closed.
- Worker health exposes only redacted presence booleans, never the reference or credentials.
- Verification: targeted readiness/app health tests (12 passed), Worker typecheck, and lint passed.
- Railway Worker deployment `166b15e5-235d-45fd-b32e-c73678085b5f` reached `SUCCESS`; persistent submission remains disabled.
- **Next smallest unit:** run the no-write preflight with the activation reference, then execute one bounded paper order only with explicit operator authorization.

### 2026-08-28 — Phase 6.223 final activation preflight

- Ran the Railway no-write preflight with `PAPER_AUTOPILOT_ORDER_SUBMISSION_ENABLED=true` and bounded reference `PAPER-EXECUTION-BOUNDARY-001` supplied only to the command.
- Result: `status:"ready"`, `blockedReasons:[]`, market snapshot available, and baseline evidence recognized.
- Persistent Railway variables remain unchanged and no Alpaca order was submitted.
- **Next smallest unit:** execute one bounded paper order through the unified gate with explicit operator authorization, then verify broker reconciliation, Telegram delivery, and dashboard history.

### 2026-08-28 — Phase 6.224 activation-reference visibility

- Added a redacted API/dashboard health field for execution-approval-reference presence.
- The dashboard now distinguishes a missing reference from a disabled submission flag without displaying the reference value or any credential.
- Verification: dashboard contract tests (10 passed), API/web typechecks, lint, and web production build passed.
- Railway API deployment `3c9cb976-e7a9-4ece-9682-828aa6d77c10` reached `SUCCESS`; the persistent submission gate remains off.
- **Next smallest unit:** verify the hosted authenticated view, then execute one bounded paper order only with explicit operator authorization.

### 2026-08-28 — Phase 6.225 hosted runtime-readiness evidence

- Ran the guarded runtime-readiness command in Railway with command-scoped submission flag and reference `PAPER-EXECUTION-BOUNDARY-001`.
- Result: `status:"ready"`, `blockedReasons:[]`, configuration `executionStatus:"enabled"`, global kill switch inactive, paper credentials/broker/database configured, and reconciliation fresh (30 seconds old at capture).
- No persistent variables changed and no order was submitted.
- **Next smallest unit:** execute one bounded paper order with explicit operator authorization, then verify Alpaca reconciliation, Telegram delivery, and dashboard history.

### 2026-08-28 — Phase 6.226 bounded broker-enabled cycle

- Broker-enabled scheduled risk cycles now process at most one candidate per cycle; the next cycle re-reconciles account, positions, and orders before considering another entry.
- Dry-run cycles may still evaluate up to ten candidates for research visibility, while broker submission cannot batch multiple approvals against one stale portfolio snapshot.
- Updated the activation runbook with the bound; no production submission flag or broker state changed.
- Verification: 283 tests passed, Worker TypeScript and lint passed; Railway Worker deployment `50b83fcf-45cf-45f8-a6ad-c5d37f5cdd12` reached `SUCCESS`.
- **Next smallest unit:** execute one bounded paper order with explicit operator authorization, then verify reconciliation, Telegram delivery, and dashboard history.

### 2026-08-28 — Phase 6.227 bounded-cycle regression evidence

- Extracted the broker-cycle candidate selector as a pure function and added regression coverage: broker-enabled execution selects one candidate; dry-run analysis remains capped at ten.
- Verification: focused Worker test (2 passed), Worker TypeScript, and lint passed.
- A local `railway run` rehearsal could not reach Railway's private PostgreSQL hostname (`ENOTFOUND`); no application failure, Railway variable, or broker state was inferred from that tooling limitation.
- Worker deployment `b360b55a-cf7a-498f-bd04-ccf1a38b2318` reached `SUCCESS` with the regression coverage included.
- **Next smallest unit:** run the bounded paper order from inside a Railway runtime (or provide a public database connection path) with explicit operator authorization, then verify Alpaca reconciliation, Telegram delivery, and dashboard history.

### 2026-08-28 — Phase 6.228 hosted API liveness

- Confirmed the deployed Railway API responds healthy at `https://api-production-e0a6.up.railway.app/health`.
- Confirmed the protected operations endpoint returns `401 unauthorized` without an operator token, preserving the authentication boundary.
- No secrets were requested or printed; no Railway variables or broker state changed.
- **Next smallest unit:** run the bounded paper order from inside a Railway runtime with explicit operator authorization, then verify Alpaca reconciliation, Telegram delivery, and dashboard history.

### 2026-08-28 — Phase 6.229 Worker observability endpoint

- Added a Railway service domain for the Worker: `https://worker-production-b362.up.railway.app`.
- Verified the live Worker `/health` response: `healthy`, Paper Autopilot active, research scheduler scheduled, position management ready, Telegram enabled, and paper order submission disabled.
- Railway auto-detected the Worker port; the endpoint is now independently monitorable without exposing credentials or execution controls.
- **Next smallest unit:** run the bounded paper order from inside this healthy Railway Worker with explicit operator authorization, then verify Alpaca reconciliation, Telegram delivery, and dashboard history.

### 2026-08-28 — Phase 6.231 live scheduler and safety-gate audit

- Rechecked the public Worker health endpoint after domain provisioning: durable scheduler is `scheduled` on UTC cron `0 0 * * *`, research scheduling is `scheduled`, and the global kill switch is inactive.
- Position management reports `ready` with a 60-second interval; Telegram alerts are enabled and ready.
- Confirmed `paperAutopilotOrderSubmissionEnabled:false`; no broker write path is active.
- **Next smallest unit:** run the bounded paper order from inside this healthy Railway Worker with explicit operator authorization, then verify Alpaca reconciliation, Telegram delivery, and dashboard history.

### 2026-08-28 — Phase 6.232 bounded paper-order verification

- Used operator reference `PAPER-ORDER-ACTIVATE-001` to run one AAPL research-to-order handoff inside the Railway Worker, with quantity `1` and command-scoped submission enabled only for that run.
- Research completed as `research-market-1787871000382`; deterministic risk approval passed and Alpaca accepted order `edcda79a-1c58-4b95-a908-07ca229ca6d8`.
- PostgreSQL reconciliation persisted the order as `accepted`, quantity `1.00000000`, filled quantity `0.00000000`; the order remains open for broker fill processing.
- Telegram `paper_entry_submitted` was persisted and delivered (`status: sent`, one attempt). The dashboard reads the same persisted order and alert history after authenticated login.
- Continuous scheduled order submission remains disabled; no additional order was submitted.
- **Next smallest unit:** monitor this accepted order through the next market session, verify fill/reconciliation and exit-plan handling, then decide whether continuous paper submission should be enabled separately.

### 2026-08-28 — Phase 6.233 post-order reconciliation audit

- Ran the guarded paper reconciliation inside Railway after the handoff.
- The new order `edcda79a-1c58-4b95-a908-07ca229ca6d8` remains `accepted` with zero filled quantity; no fill should be reported yet.
- The one-share AAPL position currently visible in Alpaca is tied to a separate earlier filled order, not the new handoff. This prevents false attribution in portfolio history.
- Telegram alert history still shows the new `paper_entry_submitted` event as `sent`; no additional order was created.
- **Next smallest unit:** observe the accepted order through the next market session and reconcile its eventual fill/cancellation and position attribution.

### 2026-08-28 — Phase 6.234 pending-order monitoring

- Ran another Railway-hosted reconciliation and queried Alpaca for order `edcda79a-1c58-4b95-a908-07ca229ca6d8`.
- The order remains `accepted`, quantity `1`, filled quantity `0`, with no fill timestamp; no new order or position attribution was created.
- The reconciliation path completed successfully. The order remains pending for broker lifecycle monitoring rather than being canceled automatically.
- **Next smallest unit:** observe the order during the next active market window and verify a terminal fill/cancel state plus any position-management response.

### 2026-08-28 — Phase 6.238 recurring reconciliation confirmation

- Ran another Railway-hosted reconciliation and checked the Alpaca paper clock; the market remains closed and the AAPL order remains `accepted` with zero fills.
- Worker health confirms the recurring position-management/reconciliation loop is still `ready` with a recent run at `2026-08-27T22:56:28.377Z`.
- No new order, configuration change, or position attribution occurred.
- **Next smallest unit:** recheck after Alpaca's next market open and verify the order's terminal state.

### 2026-08-28 — Phase 6.239 broker status-transition alerts

- Added a deduplicated Telegram alert at the recurring reconciliation boundary for broker order status transitions (filled, canceled, expired, rejected, or other changes).
- Added a pure transition detector with regression coverage; full suite now passes 286 tests across 77 files, with lint and Worker typecheck clean.
- Railway Worker deployment `7c58b2a9-044b-46fd-a7c0-7a17810e4cc0` reached `SUCCESS`.
- The existing AAPL order remains accepted/unfilled; no additional broker write occurred during this change.
- **Next smallest unit:** verify the new lifecycle alert when the pending order reaches a terminal state during an active market session.

### 2026-08-28 — Phase 6.235 market-closed pending state

- Reconciled again from Railway and queried Alpaca's paper clock.
- Alpaca reports the market closed (`nextOpen: 2026-08-28T09:30:00-04:00`); the AAPL day order remains `accepted` with zero fills and is queued for the next session.
- Account equity remains `99390.29`; no new position was attributed to the pending order during this check.
- **Next smallest unit:** reconcile after the next market open and verify whether the order fills, expires, or is canceled, then validate position-management and Telegram lifecycle events.

### 2026-08-28 — Phase 6.237 recurring pending-order monitoring

- Confirmed the live Worker position-management loop continues to reconcile broker truth every 60 seconds (`lastRunAt: 2026-08-27T22:55:27.884Z`).
- The pending AAPL order remains under recurring monitoring without enabling another submission path; order submission remains disabled outside the bounded handoff.
- **Next smallest unit:** verify the order after the next market open and record its terminal broker state and any resulting exit-plan event.

### 2026-08-28 — Phase 6.236 paper-performance report

- Generated the read-only performance report from the Railway Worker after reconciliation.
- Persisted history contains 100 snapshots across 1 calendar day; current equity is `99390.29`, total P/L is `0.16`, and maximum drawdown is `0.00026160%`.
- Performance metrics are available, while stability remains blocked until the required 30 consecutive calendar days are observed (`minimum_30_consecutive_calendar_days_not_met`).
- No order or configuration state changed.
- **Next smallest unit:** continue daily snapshots and monitor the pending AAPL order through the next active market window.

### 2026-08-28 — Phase 6.240 hosted research-to-risk cycle acceleration

- Ran fresh stock and crypto research inside the deployed Railway Worker using the paper broker and a bounded command-scoped reference.
- The deterministic risk cycle evaluated the latest persisted candidate (`BTC/USD`) and persisted a `risk_dry_run_rejected` decision; reasons were `position cap` and `gross-exposure cap` violations, with estimated loss and policy version recorded.
- A redacted `paper_risk_decision` Telegram event was persisted as a warning. Continuous broker submission remains disabled, and no new Alpaca order or position was created.
- This confirms the always-on research-to-risk safety path can be exercised quickly on hosted infrastructure while preserving fail-closed execution boundaries.
- **Next smallest unit:** verify the pending AAPL order during the next active market session; then add a bounded operator-facing cycle status summary so hosted progress and blockers are visible without log access.

### 2026-08-28 — Phase 6.241 operator cycle-status summary

- Added a read-only dashboard card that joins the newest persisted research run, deterministic risk decision, and Telegram delivery event into one hosted cycle hand-off view.
- The card displays status, timestamps, identifiers, and bounded risk reasons without exposing credentials, private model reasoning, or any order controls.
- Verification: dashboard state tests passed (10 tests), web TypeScript and ESLint passed, and the production Next.js build completed successfully.
- Change pushed to branch `phase-6-10-operator-health` as commit `c428579`; no broker or Railway configuration changed.
- **Next smallest unit:** verify the new card on the authenticated Vercel deployment, then continue market-session reconciliation for the pending AAPL order.

### 2026-08-28 — Phase 6.242 hosted status and navigation verification

- Confirmed the latest Vercel previews protect `/dashboard` with the expected authentication redirect and confirmed the Railway Worker remains healthy.
- Confirmed the durable daily scheduler and research schedule are scheduled, position management is ready, Telegram alerts are configured, and continuous order submission remains disabled.
- Alpaca still reports the market closed; the authorized AAPL order remains `accepted` with zero fills and no position attribution.
- Added a direct `Cycle` dashboard navigation link and reverified dashboard tests, TypeScript, ESLint, and the production Next.js build.
- **Next smallest unit:** verify the Cycle card after authenticated sign-in, then reconcile the AAPL order after Alpaca's next market open.

### 2026-08-28 — Phase 6.243 hosted position-management exercise

- Exercised the deployed position-management cycle inside Railway; it managed one persisted position and submitted zero exits.
- The latest Telegram outbox remains delivered, including the risk rejection and prior paper-entry lifecycle event; no duplicate broker write was created.
- The authorized AAPL order remains `accepted` with zero fills while Alpaca reports the market closed.
- **Next smallest unit:** verify the Cycle card in an authenticated browser session and reconcile the AAPL order after the next active market window.

### 2026-08-28 — Phase 6.244 crypto position-management coverage

- Removed the equity-only filter from persisted exit-plan reads so crypto plans are eligible for management.
- Position management now groups symbols by asset class and requests equity and crypto snapshots through their respective Alpaca market-data routes, preserving the originating asset class for deterministic exits.
- Added regression coverage for asset-class grouping and duplicate-symbol handling.
- Verification: full suite passed with 287 tests across 77 files; Worker typecheck and lint passed; Railway Worker deployment `f17d5398-5414-4659-9ebb-bf733397a0a1` reached `SUCCESS` and live health remains `healthy`.
- Continuous entry submission remains disabled; this change only expands read/reconcile/exit coverage.
- **Next smallest unit:** verify the authenticated Cycle card, then reconcile the authorized AAPL order after Alpaca's next active market window.

### 2026-08-28 — Phase 6.245 durable position-alert deduplication

- Added stable dedupe keys for managed-position, deterministic-exit-decision, and paper-exit-submitted Telegram events.
- Repeated 60-second passes and Worker restarts can now re-enqueue the same operational fact without producing duplicate Telegram deliveries; broker idempotency remains unchanged.
- Verification: full suite passed with 288 tests across 77 files; Railway Worker deployment `a1dd0040-99d1-46a5-b77e-9fdae012d641` reached `SUCCESS`; live health is `healthy`, position management is `ready`, and continuous entry submission remains disabled.
- **Next smallest unit:** verify the authenticated Cycle card, then reconcile the authorized AAPL order after Alpaca's next active market window.

### 2026-08-28 — Phase 6.246 persisted deterministic exit lifecycle

- Position-management exits now create a durable pending exit record before the broker call, reconcile the returned Alpaca status into that record, and mark the record failed if the broker call errors.
- Exit records retain the originating intent relationship and strategy metadata, so the dashboard and audit history can distinguish entries from deterministic exits and recover safely after a Worker restart.
- Verification: full suite passed with 288 tests across 77 files; Railway Worker deployment `8d009ed3-5eae-4bc1-bca8-f13784486fd7` reached `SUCCESS`; live health is `healthy`; hosted position-management exercised with `managed:1, submitted:0`.
- Continuous entry submission remains disabled and no new broker order was created by this phase.
- **Next smallest unit:** verify persisted exit records and terminal status alerts when a managed position reaches an exit threshold during an active paper session.

### 2026-08-28 — Phase 6.247 complete exit-plan selection

- Tightened the exit-plan repository query to return every actionable plan with entry, stop, and strategy metadata, instead of limiting the result to the latest 100 orders.
- The query remains asset-class agnostic, so older open equity or crypto positions cannot be silently dropped as order history grows.
- Verification: 288 tests across 77 files passed; Worker and database TypeScript checks plus lint passed; Railway deployment `aef2ad2b-f25f-4c2e-9d8e-2e27f047a964` reached `SUCCESS`; live Worker health remains `healthy` and position management `ready`.
- **Next smallest unit:** verify persisted exit records and terminal status alerts when a managed position reaches an exit threshold during an active paper session.

### 2026-08-28 — Phase 6.248 broker-to-ledger status synchronization

- Each position-management reconciliation now matches persisted submissions to broker orders by client order ID and updates the durable submission ledger when status, fill quantity, or broker ID changes.
- This keeps entry and deterministic-exit history aligned with Alpaca after fills, cancellations, expirations, or Worker restarts; unmatched broker orders are ignored safely.
- Verification: 288 tests across 77 files passed; Worker/database TypeScript checks and lint passed; Railway Worker deployment `2b9e7175-f625-47ae-8676-da797c2c3b8c` reached `SUCCESS`; live Worker health remains `healthy` and position management `ready`.
- **Next smallest unit:** verify a terminal broker transition updates the persisted ledger and emits the deduplicated Telegram status alert during an active paper session.

### 2026-08-28 — Phase 6.249 hosted ledger-sync verification

- Ran the deployed position-management command after the broker-to-ledger sync release; it completed with `managed:1, submitted:0` and no unexpected broker write.
- Railway health remains `healthy`, position management is `ready`, and continuous entry submission remains disabled.
- A direct database check shows the authorized AAPL entry remains `accepted` with zero fills; no exit record was fabricated while no exit threshold was reached.
- **Next smallest unit:** verify a terminal broker transition updates the persisted ledger and emits the deduplicated Telegram status alert during an active paper session.

### 2026-08-28 — Phase 6.250 intent-scoped position lifecycle alerts

- Managed-position Telegram deduplication now keys on asset class, symbol, and originating intent rather than symbol alone.
- A close-and-reenter lifecycle for the same symbol can therefore produce a fresh detection alert while repeated scheduler passes remain deduplicated.
- Verification: full suite passed with 288 tests across 77 files; Railway Worker deployment `958ece38-c0d4-4692-81eb-14840edf5664` reached `SUCCESS`; live Worker health remains `healthy` and position management `ready`.
- **Next smallest unit:** verify a terminal broker transition updates the persisted ledger and emits the deduplicated Telegram status alert during an active paper session.

### 2026-08-28 — Phase 6.251 run-scoped research notifications

- Research recommendation alerts now use the persisted research run ID as their dedupe key, and research failures use a unique failed-run key.
- Identical recommendations on separate scheduled runs are therefore reported independently, while retries within one run remain deduplicated.
- Added regression coverage for the run-scoped recommendation keys; full suite passed with 288 tests across 77 files.
- Railway Worker deployment `cfb077a0-6855-46f2-842a-32e3b104e73b` reached `SUCCESS`; live health remains `healthy`, research scheduling is `scheduled`, and Telegram alerts are `ready`.
- **Next smallest unit:** verify a terminal broker transition updates the persisted ledger and emits the deduplicated Telegram status alert during an active paper session.

### 2026-08-28 — Phase 6.252 centralized reconciliation ledger sync

- Moved broker-to-submission-ledger synchronization into the transactional account reconciliation repository, covering daily scheduler runs, one-shot commands, and position-management passes.
- Matching client-order IDs now update status, fill quantity, broker ID, and timestamps atomically with the account snapshot; unmatched broker orders remain ignored.
- Verification: full suite passed with 288 tests across 77 files; Worker/database TypeScript checks and lint passed; Railway deployment `904be044-b636-41b8-8a9b-30ecf5ec2c06` reached `SUCCESS`; hosted reconciliation completed successfully and live health remains `healthy`.
- **Next smallest unit:** verify a terminal broker transition updates the persisted ledger and emits the deduplicated Telegram status alert during an active paper session.

### 2026-08-28 — Phase 6.253 reconciliation ledger regression coverage

- Added a repository-level regression test proving a normal account reconciliation updates a matching persisted submission with broker ID, status, and fill quantity.
- Verification: full suite passed with 289 tests across 77 files; Worker/database TypeScript checks and lint passed; Railway deployment `df36e1ff-24a6-47a4-bf5b-7eaa985687cb` reached `SUCCESS`; live Worker health remains `healthy`.
- **Next smallest unit:** verify a terminal broker transition updates the persisted ledger and emits the deduplicated Telegram status alert during an active paper session.

### 2026-08-28 — Phase 6.254 risk-cycle failure observability

- Scheduled research-to-risk hand-offs now emit a dedicated, run-scoped `paper_risk_cycle_failed` critical Telegram event when reconciliation or deterministic risk processing fails after research succeeds.
- The scheduler still fails closed and retries through its existing bounded job path; the new alert clarifies that no additional order decision was authorized.
- Added regression coverage for the alert contract; full suite passed with 290 tests across 77 files.
- Railway Worker deployment `28673fe4-f882-4199-8434-3863e2817bef` reached `SUCCESS`; live health remains `healthy`, research scheduling is `scheduled`, and continuous entry submission remains disabled.
- **Next smallest unit:** verify a terminal broker transition updates the persisted ledger and emits the deduplicated Telegram status alert during an active paper session.
