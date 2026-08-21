# AI Workflow Rules

## Development Approach

Build Momentum Autopilot as a sequence of narrow, end-to-end, paper-only increments. Prioritize trustworthy state, auditability, and failure handling before automated order submission. Do not build visual success on top of mock or unreconciled financial state.

The deployed system must execute its daily preparation, health, reconciliation, and scheduled evaluation work on server infrastructure without requiring an open browser session.

## Before Editing

1. Read all six context files and identify the current phase in `progress-tracker.md`.
2. Inspect the existing Next.js/Vercel repository and preserve its stack and patterns.
3. State the exact user-visible outcome, system boundaries touched, and failure cases.
4. Check whether the change affects credentials, operating mode, risk, order actions, persistent financial records, or external cost.
5. Resolve material ambiguity before implementing and record the decision.

## Required Build Sequence

1. Authenticated shell, database, secrets, health, and read-only paper account.
2. Broker/account reconciliation and immutable audit pipeline.
3. Read-only market data and live dashboard.
4. Historical data, replay harness, and deterministic strategy plug-in contract.
5. Research agents and macro advisory with structured, read-only outputs.
6. Trade intents and deterministic paper risk engine.
7. Paper order execution with idempotency and reconciliation.
8. Durable scheduling, WebSocket supervision, alerting, and recovery.
9. Paper Autopilot and extended validation.
10. Live readiness review; live implementation is a separate explicitly approved scope.

Do not skip ahead to order submission because a dashboard or agent demo appears functional.

## Scoping Rules

- Work on one coherent build unit at a time.
- Do not combine a feature with unrelated refactoring, dependency upgrades, or redesign.
- Separate schema, policy, backend, strategy, risk, execution, and UI changes when each cannot be verified clearly in one unit.
- Every unit must have observable acceptance criteria and a rollback or disable path.
- New strategies and agents begin disabled.

## Integration Rules

- Use Railway PostgreSQL as the Version 1 system of record. Define migrations, constraints, indexes, and least-privilege roles in source control.
- Host the Next.js dashboard on Vercel. It calls authenticated Railway API endpoints and never connects directly to Alpaca or PostgreSQL.
- Run the authenticated API, PostgreSQL-backed durable job processor, and supervised Alpaca market/trading WebSocket loop as separate Railway services.
- Use Railway cron only to trigger bounded recurring work; durable workflow state, retries, and dead-letter records live in PostgreSQL and are processed by the persistent worker.
- Use Alpaca MCP in compatible development/operator clients for authorized research and diagnostics.
- Begin with read-only MCP toolsets. Do not enable the MCP trading toolset as a shortcut around application controls.
- The deployed app uses Railway-hosted Alpaca REST/WebSocket integrations; MCP connections in development clients are not a runtime backend.
- Store credentials only in the server secret store and reference environment variable names, never values.
- Version/pin external SDK and MCP server dependencies where practical; review breaking changes before upgrading.

## Financial Safety Rules

- Work in paper trading unless the user separately authorizes a live-readiness implementation after all gates pass.
- In Paper Autopilot, do not add per-order human approval. Automatic submission is allowed only after deterministic risk approval and execution-time safety revalidation.
- Treat `USD 1,000` as the initial paper-account equity baseline. Cap estimated planned-stop loss, including estimated fees and slippage, at the lower of `0.25%` of current equity and `USD 100` unless the operator explicitly approves a documented risk-policy change.
- Never remove or weaken risk, freshness, idempotency, reconciliation, confirmation, or kill-switch controls to make a demo pass.
- Do not add “temporary” direct order calls from UI components or agents.
- Do not infer missing live-trading behavior. Record it as an open question.
- Treat any ambiguous submission outcome as reconciliation-required, not failure-ready-to-retry.
- Never represent simulations, estimates, or stale values as live broker truth.

## Handling Agent Behavior

- Require structured output schemas and reject invalid output.
- Store evidence and concise rationale, not private reasoning traces.
- Agents may propose; only deterministic code decides risk and execution eligibility.
- If agents disagree, persist their outputs and apply the documented deterministic aggregation policy. Do not let an orchestrator improvise.
- Model/provider changes require regression evaluation before enabling affected workflows.

## Protected Areas

Do not modify without explicit approval:

- Live-trading endpoints, credentials, or `ALPACA_PAPER_TRADE` default.
- Risk limits or logic that could increase exposure.
- Audit retention or append-only protections.
- Broker environment isolation.
- Emergency stop, pause, and recovery semantics.
- Authentication/authorization and server secret handling.
- Production strategy stages or capital allocations.

## Verification Loop

1. Run focused tests while implementing.
2. Exercise the happy path and the highest-impact failure path.
3. For broker mutations, verify idempotency, restart behavior, and broker reconciliation.
4. For live data, verify disconnect, stale, gap, backfill, and resume behavior.
5. For UI, verify small/large widths, keyboard use, stale data, and pending/reconciling states.
6. Run typecheck, lint, tests, and build before marking complete.
7. Record exact commands/results, skipped checks, risks, and next step in `progress-tracker.md`.

## Documentation Sync

- Product behavior, workflows, scope, or metrics → `project-overview.md`
- Agents, services, data, auth, broker integration, risk, or invariants → `architecture.md`
- Dashboard, control behavior, visual tokens, responsive states, or accessibility → `ui-context.md`
- Implementation, schemas, financial logic, or test conventions → `code-standards.md`
- Current delivery state and decisions → `progress-tracker.md`

## Completion Report

Every completed unit reports:

- User-visible outcome.
- Files and services changed.
- Data migrations or policy changes.
- Verification and paper-broker evidence.
- Known risks or unverified assumptions.
- Current operating mode.
- Next smallest build unit.
