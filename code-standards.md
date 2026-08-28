# Code Standards

## General

- Preserve the selected Next.js framework, router, package manager, component library, and conventions unless a documented architecture decision changes them.
- Keep browser UI, orchestration, strategy logic, deterministic risk, execution, and reconciliation in separate modules.
- Prefer explicit state machines and typed domain contracts over implicit flag combinations.
- Do not hide integration failures with fake success, silent fallback data, or unlabelled mocks.
- Do not claim profitability or represent backtest output as expected future returns.

## TypeScript and Contracts

- Strict TypeScript is required; do not introduce `any`.
- Validate every external payload with the project's runtime schema library.
- Use discriminated unions for operating mode, agent run, intent, order, stream, and reconciliation states.
- Version persisted agent, signal, strategy, risk-policy, and event payload schemas.
- Normalize Alpaca responses behind an adapter; UI and strategy code must not depend directly on raw broker shapes.
- Exhaustively handle state transitions; unexpected states fail closed and create an alert.

## Financial Calculations

- Never use binary floating-point arithmetic for persisted currency, quantity, fee, P/L, exposure, or threshold comparisons.
- Use decimal-safe arithmetic and explicit rounding rules compatible with the asset/order requirements.
- Store currency, unit, precision, price source, and as-of timestamp with calculated values.
- Separate realized P/L, unrealized P/L, fees, slippage, deposits/withdrawals, and mark-to-market changes.
- Add tests around zero, negative values, fractional quantities, partial fills, rounding boundaries, and missing marks.

## Time and Market Data

- Store all timestamps as UTC instants; never persist ambiguous local timestamps.
- Display exchange/operator timezone explicitly.
- Evaluate bar-based strategies only on finalized bars unless a strategy explicitly defines intrabar logic.
- Every decision input carries source event time, received time, freshness status, and subscription/feed identity.
- Detect sequence gaps, duplicates, late data, reconnects, and clock skew.
- Do not resume signal generation after a stream gap until backfill and reconciliation complete.

## Strategies

- Implement a typed plug-in interface with metadata, parameter schema, required inputs, evaluation, sizing proposal, entry, exit, and diagnostics.
- Strategy evaluation is deterministic for the same version, parameters, and frozen inputs.
- Strategy code returns signals; it never submits, cancels, or replaces orders.
- Parameters are immutable by version. Edits create a new version.
- A strategy must include unit tests and replay fixtures before it can be enabled in paper mode.
- Avoid look-ahead bias: do not use data that was unavailable at the decision timestamp.

## Agents and Model Output

- Agents emit schema-validated structured artifacts with model/provider, prompt/template version, input references, created time, and confidence semantics.
- Treat all model output as untrusted input.
- Store concise rationale/evidence, not private chain-of-thought.
- Agent failure, timeout, malformed output, or unavailable evidence must not produce an order approval.
- Macro/news advice can adjust a documented deterministic policy input or flag review; free-form sentiment cannot directly place a trade.
- Prompts and tools are versioned and tested like code.

## Risk and Execution

- Risk approval is a pure, deterministic function of an immutable intent, account snapshot, positions/open orders, market snapshot, and versioned risk policy.
- Default-deny when required inputs are absent, stale, invalid, or inconsistent.
- The execution service accepts only an unexpired approved intent and revalidates mode, kill switches, and material account state immediately before submission.
- Paper Autopilot requires no per-order human confirmation, but it may never bypass deterministic approval or execution-time revalidation.
- Reject any intent whose estimated loss at the planned stop, including estimated fees and slippage, exceeds `5%` of invested notional; reject any long stop more than `5%` below entry; verify the configured `USD 100,000` initial paper-account baseline before enabling autopilot.
- Every broker mutation uses a unique idempotency/client order ID.
- On an ambiguous broker timeout, query existing state before retrying.
- Position-management retries must query the full submission ledger, treat an existing non-terminal deterministic exit intent as in-flight, and must not call the broker a second time for the same position lifecycle.
- Persist the outbound request intent and broker response/request ID with secret fields redacted.
- Never automatically loosen risk limits in response to losses or missed trades.

## API and Server Boundaries

- Alpaca credentials and calls that require them remain server-side.
- Browser routes call authenticated application endpoints, never Alpaca order endpoints directly.
- Validate operator commands, enforce re-authentication where required, and write an audit event.
- Apply rate limits to control endpoints and anti-CSRF protections according to the chosen auth stack.
- Use bounded timeouts and retries; do not retry non-idempotent actions blindly.
- WebSocket and background-worker code must expose health, freshness, reconnect, lag, and last-success metrics.
- Daily preparation, health, and reconciliation jobs must run on server infrastructure independently of an open browser and must expose last-run/next-run status.

## Database and Audit

- Define Railway PostgreSQL schema changes as reviewed, reversible migrations committed to source control.
- Enforce client order ID, broker event identity, and other deduplication guarantees with PostgreSQL unique constraints plus transactional application logic.
- Protect account data, configuration, commands, and audit records through authenticated Railway API endpoints and least-privilege database roles; the Vercel browser application never connects directly to PostgreSQL.
- Trade intents, risk decisions, order events, fills, and audit events are append-only; corrections create compensating records.
- Store large raw payloads outside hot transactional tables when needed, referenced by checksum.
- Never delete trading/audit history through a normal UI action.
- Persist broker-write intent transactionally, run the external side effect in the execution worker, and reconcile the result in a follow-up transaction.
- Enable and test scheduled backups, point-in-time recovery, and off-platform logical dumps before Paper Autopilot.

## UI

- Follow `ui-context.md` and existing accessible primitives.
- Show data provenance, mode, freshness, and timezone for financial values.
- Implement loading, empty, stale, degraded, reconciling, error, and success states.
- Do not optimistically display a submitted/filled state before server/broker acknowledgement.
- Destructive and financial actions require explicit labels, confirmation, and accurate pending/final states.

## Testing

### Required unit tests

- Strategy calculations and parameter boundaries.
- Risk rules individually and in combination.
- Position sizing, precision, rounding, P/L, drawdown, and exposure.
- State-machine transitions and rejection of invalid transitions.
- Idempotency-key/client-order-ID generation.
- Adapter normalization and runtime validation.

### Required integration/scenario tests

- Alpaca paper account read and order lifecycle.
- Duplicate job delivery and restart during submission.
- Timeout before and after broker acceptance.
- Rejected order, partial fill, cancel/replace, and market close.
- WebSocket disconnect, sequence gap, backfill, and safe resume.
- Stale account/market/position data rejection.
- Daily loss, drawdown, exposure, trade-count, and kill-switch activation.
- Pause, emergency stop, cancel-only, cancel-and-liquidate, and recovery.
- Dashboard versus Alpaca reconciliation.

### Required quality checks

- Typecheck, lint, tests, and production build.
- Dependency/security review before live eligibility.
- Browser verification at small and large widths.
- Keyboard navigation and accessible labels for control flows.

## Definition of Done

1. Acceptance criteria work through observable behavior in paper mode.
2. Failure paths are safe, visible, tested, and auditable.
3. No browser bundle or log exposes a credential.
4. Financial calculations and broker state reconcile within documented precision/tolerance.
5. Relevant automated checks and preview verification pass.
6. Context and `progress-tracker.md` reflect the implemented state.
