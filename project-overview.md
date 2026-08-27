# Momentum Autopilot

## Product Summary

Momentum Autopilot is a continuously running trading operations platform for US stocks and Alpaca-supported crypto assets. A coordinated group of specialized agents researches markets, prepares trading sessions, monitors live data, scores momentum opportunities, proposes and executes risk-approved trades, reconciles fills, and reports real-time and historical performance in a live dashboard.

The production runtime operates on server infrastructure every calendar day, including when the operator's browser is closed. Daily preparation, health checks, reconciliation, and scheduled evaluations must be durable and observable; crypto monitoring may operate continuously because the market trades 24/7.

The product is designed for a single operator initially. It launches in Alpaca paper-trading mode and supports live trading only after explicit operational, security, and strategy-validation gates are passed.

## Primary User

- **Who:** An experienced self-directed trader or system operator.
- **Need:** Run systematic momentum workflows continuously without manually scanning every market or managing each order.
- **Success:** The operator can understand what the system is doing, why a trade was proposed or rejected, current exposure and P/L, data freshness, and whether all safeguards are healthy.

## Product Goals

1. Automate the full paper-trading lifecycle from research through reconciliation with a complete audit trail.
2. Surface live account equity, realized and unrealized P/L, exposure, risk utilization, positions, orders, and agent health.
3. Make strategies plug-in modules with versioned parameters, validation, replay, enable/disable controls, and rollback.
4. Maintain safe operation through deterministic risk gates, bounded exposure, stale-data protection, idempotent execution, and global/strategy/asset kill switches.
5. Produce evidence for or against strategy quality using reproducible historical replay and paper-forward performance, without promising returns.

### Always-on multi-agent operating objective

The production system is intended to be self-running and server-resident: specialist research, macro context, strategy evaluation, deterministic risk validation, execution, reconciliation, position management, and alerting must continue when the browser is closed. The agents cooperate through durable, versioned artifacts and auditable hand-offs; no agent may bypass the deterministic risk engine or safety gates. “Optimize profits” means continuously improve measured, risk-adjusted portfolio performance within the configured paper-risk policy, never a guarantee of returns or permission to loosen controls.

## Non-Goals for Version 1

- Options, futures, forex, short selling, margin, or leveraged crypto.
- High-frequency, market-making, latency-arbitrage, or co-located trading.
- Managing other users' money, copy trading, social signals, or public investment advice.
- Multiple brokerages or exchanges.
- Unsupervised self-modification of strategy code or risk limits.
- Training foundation models or allowing agents to create and deploy strategies directly to live trading.

## Operating Modes

1. **Observe:** Read-only market/account data; no order proposals or submissions.
2. **Recommend:** Generate ranked opportunities and proposed orders; no submission.
3. **Paper autopilot:** Automatically submit deterministically risk-approved orders to Alpaca paper trading. No per-order human approval is required in this mode.
4. **Live confirm:** Live credentials are present, but every order requires operator confirmation.
5. **Live autopilot:** Automatically submit risk-approved live orders. This mode remains disabled until all live-readiness gates pass and the operator explicitly activates it.

The current mode must be visible on every page. Mode changes require re-authentication, a clear consequence summary, and an immutable audit event.

In Paper Autopilot, “no approval required” means no operator confirmation is required for each order. It does not remove deterministic risk approval, freshness checks, kill switches, mode gates, or reconciliation.

## Multi-Agent Responsibilities

- **Orchestrator:** Owns the schedule and state machine; delegates work but cannot approve risk exceptions.
- **US Stock Research Agent:** Builds and ranks the eligible stock universe using price, volume, volatility, liquidity, and news context.
- **Crypto Research Agent:** Builds and ranks the eligible crypto universe while accounting for 24/7 sessions and asset-specific liquidity.
- **Macro Advisory Agent:** Summarizes scheduled macro events, market regime, volatility, rates, and risk-on/risk-off context. Advisory only; it cannot submit orders.
- **Strategy Agents:** Run enabled, versioned momentum strategies and return normalized signal candidates with evidence.
- **Risk Agent:** Explains risk outcomes, but the actual pass/fail decision comes from deterministic risk-policy code.
- **Execution Agent:** Converts approved intents to valid orders, submits them once, and never alters strategy or risk parameters.
- **Monitoring/Reconciliation Agent:** Tracks acknowledgements, partial fills, fills, cancellations, positions, P/L, data freshness, and discrepancies.

## Core Workflows

### Daily US Stock Preparation

1. Confirm market calendar, account health, buying power, data entitlement, and service health.
2. Load the eligible stock universe and exclude non-tradable, illiquid, halted, or policy-blocked assets.
3. Compute enabled momentum features using finalized bars only.
4. Add earnings, corporate-action, news, and macro-event context.
5. Produce a ranked watchlist, scenario plan, risk budget, and reasons for exclusions.
6. Persist the plan before the session opens.

### Continuous Crypto Preparation

1. Refresh the eligible crypto universe and liquidity filters on a configured interval.
2. Compute momentum features using finalized interval bars.
3. Apply crypto exposure, spread, volatility, and stale-data rules.
4. Persist the ranked watchlist and next evaluation time.

### Live Monitoring and Trade Lifecycle

1. Receive server-side market updates and maintain freshness status.
2. Evaluate enabled strategies only on their defined schedule or finalized bar boundary.
3. Normalize candidates into immutable trade intents containing strategy version, inputs, timestamp, rationale, and proposed order.
4. Apply deterministic eligibility, freshness, exposure, loss, duplication, liquidity, and market-state checks.
5. Reject and log failed intents; approved intents receive a unique approval record.
6. Submit an idempotent order using a unique client order ID.
7. Reconcile acknowledgement, partial fills, fills, cancel/replace activity, fees, and positions from Alpaca.
8. Manage exits strictly according to the originating strategy and risk policy.
9. Update the dashboard and append audit events throughout the lifecycle.

### Emergency Stop

1. Operator activates the global kill switch.
2. New proposals and submissions stop immediately.
3. Configured response executes: cancel open orders, then either preserve or liquidate positions according to the explicit operator choice.
4. The system records the actor, time, reason, requested action, Alpaca responses, and final reconciled state.
5. Resuming requires re-authentication and a health/risk checklist.

## Strategy Plug-In Contract

Every strategy must provide:

- Unique name, semantic version, owner, supported asset class, description, and lifecycle status.
- Typed and bounded parameter schema with defaults.
- Required data inputs and minimum lookback.
- Universe and liquidity eligibility rules.
- Deterministic evaluation schedule and signal calculation.
- Entry, sizing recommendation, exit, stop, time-stop, and cooldown logic.
- Normalized confidence/score with documented meaning; it is not a probability of profit unless calibrated and proven.
- Unit tests, historical replay results, paper-forward results, and known failure regimes.
- Enable/disable control, capital allocation cap, and rollback path.

New or changed strategies start disabled, then progress through replay, shadow, paper, and only then eligible live stages.

## Initial Momentum Strategies

These are research candidates, not assumed profitable:

1. **Cross-sectional momentum:** Rank eligible assets by multi-horizon risk-adjusted return; enter top-ranked assets with trend and liquidity confirmation.
2. **Breakout with volume confirmation:** Detect closes beyond a defined range with abnormal relative volume; reject late or overly extended entries.
3. **Intraday trend continuation:** Use finalized intraday bars, trend alignment, relative strength, and spread filters; exit before configured session boundary.

Each asset class receives separate parameters, tests, allocation caps, and performance reporting.

## Dashboard Requirements

- Live/paper mode, system status, Alpaca connectivity, last market update, last reconciliation, and active kill switches.
- Account equity, cash, buying power, day P/L, total P/L, realized/unrealized P/L, gross/net exposure, drawdown, and risk-budget use.
- Equity curve and P/L charts with selectable time range and clear timezone.
- Positions with asset class, quantity, average price, live mark, P/L, strategy, stop/exit state, and age.
- Orders and fills with status history, client order ID, Alpaca order ID, timestamps, requested versus filled price, and slippage.
- Ranked opportunities with supporting features, strategy version, macro context, rejection/approval reason, and expiry.
- Agent health and activity timeline.
- Strategy performance, allocations, enabled stage, parameters, and version history.
- Immutable audit-log viewer and CSV export.
- Prominent controls for pause, resume, cancel open orders, flatten selected position, and emergency stop.

## Initial Paper Risk Policy

These are conservative engineering defaults for validation, not recommendations. They remain server-controlled and configurable only by an authenticated operator:

- Initial paper-account equity baseline: `USD 100,000`, matching Alpaca's current default paper-account balance. Autopilot remains paused if the configured starting baseline has not been verified against the Alpaca paper account.
- Long-only; no leverage or short selling.
- Maximum planned loss at the stop per trade: `5%` of the position's invested notional, inclusive of estimated fees and slippage.
- Maximum adverse entry-to-stop distance: `5%` for long positions; the position must be exited at or before this threshold.
- Maximum single stock position: `5%` of equity.
- Maximum single crypto position: `3%` of equity.
- Maximum total crypto exposure: `15%` of equity.
- Maximum gross portfolio exposure: `50%` of equity.
- Maximum open positions: `10`.
- Maximum submitted entries per rolling 24 hours: `20`.
- Daily realized plus unrealized loss kill switch: `1.5%` from start-of-day equity.
- Peak-to-trough portfolio drawdown kill switch: `5%` from recorded high-water mark.
- Reject an entry when market data, account data, or position state is stale beyond its configured threshold.
- Reject orders that exceed configured spread, estimated slippage, or liquidity limits.
- Exit behavior must be specified before entry; an intent without a valid exit plan is rejected.

The 5% invested-notional rule aligns position sizing and the maximum adverse stop distance. Gaps, liquidity failures, and execution slippage mean no system can guarantee the final realized loss.

Changing a risk limit requires an audit entry. Loosening a limit in live modes requires re-authentication and explicit confirmation.

## Success Metrics

### Engineering and Operations

- 100% of submitted orders have a traceable signal, strategy version, risk decision, client order ID, and reconciliation record.
- Zero duplicate submissions during retries, restarts, or reconnects.
- Dashboard state reconciles to Alpaca within the defined service-level target.
- All stale-data, loss-limit, and kill-switch scenarios pass automated tests.
- At least 30 consecutive calendar days of stable paper operation before live eligibility review.

### Strategy Evaluation

- Report net return, max drawdown, volatility, Sharpe-like risk-adjusted measures, hit rate, profit factor, turnover, exposure, slippage, and sample size.
- Separate backtest, replay, shadow, paper, and live performance.
- Include fees, estimated slippage, missed fills, and delisted/unavailable symbols where data supports it.
- No strategy is promoted based only on gross return or a small sample.

## Version 1 Scope

- Single authenticated operator.
- US stocks and Alpaca-supported crypto assets.
- Observe, Recommend, and Paper Autopilot modes.
- Multi-agent research and monitoring with deterministic trade/risk state machines.
- Three plug-in momentum strategy candidates.
- Macro advisory and economic-event risk context.
- Live dashboard, audit log, alerts, historical replay, paper performance, kill switches, and reconciliation.

## Deferred Scope

- Live Confirm and Live Autopilot activation.
- Multiple operators, organizations, or managed accounts.
- Mobile-native apps.
- Tax reporting and broker statement replacement.
- Additional brokers, asset classes, or model-driven strategy generation.

## Release Acceptance Criteria

1. All Version 1 workflows operate end to end against Alpaca paper trading.
2. A browser closure or dashboard outage does not stop server-side scheduling, monitoring, or reconciliation.
3. Restart and duplicate-event tests never produce a duplicate order.
4. Disconnects, stale data, rejected orders, partial fills, and rate limits fail safely and visibly.
5. Every trade and decision is reproducible from stored inputs, versions, policies, and timestamps.
6. Risk invariants and permissions are enforced server-side.
7. Dashboard calculations reconcile to broker truth within documented tolerances.
8. No live credential is present and no live endpoint is enabled in the Version 1 release.
