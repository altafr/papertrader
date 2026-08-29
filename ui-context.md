# UI Context

## Design Direction

Momentum Autopilot is an operational control room, not a casino-style trading interface. It should feel precise, calm, information-dense, and trustworthy. Prioritize system state, risk, provenance, and legibility over visual excitement.

- **Theme:** Dark-first with a complete accessible light theme if supported by the generated project.
- **Mood:** Institutional, composed, technical, transparent.
- **Avoid:** Neon overload, gamified confetti, profit promises, flashing prices, excessive gradients, glass effects that reduce legibility, and green/red as the only state cue.
- **Copy:** Use factual labels such as “Unrealized P/L” and “Estimated slippage.” Never use “guaranteed,” “safe profit,” or “AI winner.”

## Semantic Color Tokens

Use the existing component library token names where possible. Final values should meet WCAG AA contrast.

| Role | Token | Suggested dark value |
| --- | --- | --- |
| Page background | `--background` | `#081018` |
| Raised surface | `--card` | `#101A24` |
| Elevated surface | `--popover` | `#172330` |
| Primary text | `--foreground` | `#E8EEF5` |
| Muted text | `--muted-foreground` | `#95A6B8` |
| Border | `--border` | `#29394A` |
| Primary action | `--primary` | `#4F8EF7` |
| Positive P/L | `--positive` | `#36C78C` |
| Negative P/L | `--negative` | `#F16D76` |
| Warning/degraded | `--warning` | `#E6AD42` |
| Informational | `--info` | `#62B8F6` |
| Live mode | `--live` | `#F16D76` |
| Paper mode | `--paper` | `#62B8F6` |

Positive/negative values must also include a sign, label, shape, or icon.

## Typography and Numbers

- UI font: use the project's existing legible sans-serif.
- Numeric/data font: use the existing tabular or monospace font with `font-variant-numeric: tabular-nums`.
- Right-align comparable numeric table columns.
- Show currency symbols and thousand separators.
- Use consistent precision per asset/metric; do not imply precision the source does not provide.
- Every time-sensitive panel displays timezone and “last updated” status.

## Global Shell

### Public runtime heartbeat

The informational landing page includes a read-only server heartbeat so the operator can see whether the Railway runtime is online before signing in. It prefers the public Worker health URL (`NEXT_PUBLIC_WORKER_HEALTH_URL`) and falls back to the API health URL when that variable is not configured. It may show paper mode, research scheduler state, position-management readiness, crypto-stream state, and a shortened release identifier. It must never show account values, credentials, private payloads, or controls.

### Top Status Bar

Always visible and contains:

- Operating mode badge: Observe, Recommend, Paper Autopilot, Live Confirm, or Live Autopilot.
- System health: Healthy, Degraded, Paused, or Stopped.
- The primary dashboard health badge is degraded whenever the server Worker heartbeat is not healthy, even if the persisted account snapshot is fresh.
- The Alerts panel repeats that Worker degradation/unavailability as a critical review item so it cannot be missed from the status bar.
- The Alerts panel also repeats any review-required open positions and their fail-closed exit-management status.
- The dashboard shows a conservative “Minimal supervision” readiness result that is blocked unless paper mode, submission, baseline, freshness, Worker, schedulers, alerts, and exit-plan coverage all pass.
- Alpaca account/market-stream/trade-stream status.
- Data freshness and last reconciliation time.
- Worker heartbeat status, market-stream freshness, and next research run when the bounded public Worker health endpoint is configured.
- Market state for US equities plus crypto 24/7 indicator.
- Global Pause/Emergency Stop control.
- Daily server-runtime status, including last successful daily preparation and next scheduled run.

The live-mode badge and emergency control remain visible without scrolling.

### Primary Navigation

- Overview
- Opportunities
- Positions
- Orders & fills
- Strategies
- Agents
- Performance
- Audit & alerts
- Settings

Use a collapsible left sidebar on large screens and a drawer on small screens.

## Overview Dashboard

### First Row — Safety and Account

- Equity
- Day P/L
- Total P/L for selected period
- Cash and buying power
- Gross exposure
- Risk budget used
- Current drawdown

Each metric includes value, as-of time, provenance, and tooltip definition.

### Main Content

- Equity and P/L chart with paper/live label and selectable range.
- Open positions table.
- Ranked live opportunities with score, expiry, strategy, and status.
- Risk-limit utilization panel using bars with numeric thresholds.
- Agent activity timeline and current task.
- Critical alerts and rejected-intent reasons.

## Opportunities

Each opportunity shows:

- Symbol, asset class, session, and tradability.
- Strategy and exact version.
- Signal time, expiry, score, momentum features, liquidity/spread, and data freshness.
- Macro/news context clearly separated from quantitative signal evidence.
- Proposed entry, size, planned stop/exit, estimated risk, and estimated slippage.
- Risk decision with every pass/fail rule.
- Lifecycle: candidate, rejected, approved, submitted, filled, expired.

The UI must not convert recommendation mode into order submission through a hidden or accidental interaction.

## Positions, Orders, and Fills

- Tables support search, filters, column controls, sorting, and CSV export.
- Sticky symbol/status columns are allowed on wide tables.
- Small screens use a card/detail pattern rather than shrinking unreadable tables.
- An order detail drawer shows the complete lifecycle, source signal, risk approval, broker IDs/request IDs, events, fills, and slippage.
- Partial fills and ambiguous/reconciling states must be visually distinct from filled/rejected states.
- Positions without a stored deterministic exit plan display `Review required` with a prominent warning; they remain fail-closed and must never be presented as actively managed.
- Position rows show bounded originating strategy/version, entry/stop/target provenance, and position age beside broker-reconciled quantity and P/L; missing provenance is explicitly `Not reported`.
- Positions with a non-terminal deterministic exit submission display `Exit in flight` until broker reconciliation reaches a terminal state; otherwise managed positions display `Monitoring`.

## Strategies

- Strategy cards show stage, enabled state, version, asset class, allocation cap, last run, health, and paper performance.
- Detail pages show documentation, parameters, changelog, replay/paper/live results, failure regimes, open positions, and recent signals.
- Strategy or parameter changes require a review diff and explicit confirmation.
- A newly added or edited strategy displays “Disabled — validation required.”

## Agents

- Display agents as specialized services with responsibilities, permissions, current task, last successful run, latency, and errors.
- Show inputs/evidence and structured outputs; do not present free-form chain-of-thought.
- Clearly distinguish AI advisory outputs from deterministic strategy/risk decisions.

## Control Interactions

- **Pause:** Stops new evaluations/submissions while preserving monitoring and reconciliation.
- **Cancel open orders:** Requires a confirmation summarizing impacted orders.
- **Flatten:** Requires symbol selection, estimated impact, re-authentication, and confirmation.
- **Emergency Stop:** Opens a high-contrast confirmation with choices: cancel orders only, or cancel and liquidate. Show progress until broker reconciliation completes.
- **Resume:** Requires healthy dependencies, fresh data, reconciled state, and re-authentication.

Paper Autopilot does not show a per-order approval prompt. The opportunity and order views must instead show the deterministic risk approval, policy version, automatic-submission status, and any rejection reason.

Never use a simple unlabeled icon for a financial or destructive command.

## State Design

Every live panel defines:

- Loading/synchronizing.
- No data/empty.
- Fresh/healthy.
- Delayed/stale.
- Degraded or partially available.
- Error with next action.
- Permission denied.

Stale values remain visible when useful but are visibly marked and never presented as live.

## Responsive Behavior

- **Small:** Single column; compact status header; metrics in two-column grid; charts full width; tables become cards; no critical action hidden in hover.
- **Medium:** Two-column dashboard; sidebar may collapse; detail drawers use most of viewport.
- **Large:** Persistent sidebar; multi-column metrics; charts and operational panels share the main grid; content max width remains readable.

## Accessibility

- Target WCAG 2.2 AA.
- Full keyboard operation with visible focus.
- Semantic headings, tables, labels, dialogs, and live-region announcements for critical status changes.
- Do not announce every price tick; summarize meaningful changes to avoid assistive-technology overload.
- Respect reduced motion; price updates may briefly tint but must not flash.
- Charts include accessible summaries or data-table alternatives.
