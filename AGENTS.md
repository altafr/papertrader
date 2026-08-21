# Momentum Autopilot Instructions

Read these six files before every material change:

1. `project-overview.md`
2. `architecture.md`
3. `ui-context.md`
4. `code-standards.md`
5. `ai-workflow-rules.md`
6. `progress-tracker.md`

## Authority

- Product behavior and scope: `project-overview.md`
- System design, agent boundaries, data, integrations, permissions, and risk invariants: `architecture.md`
- Visual and interaction behavior: `ui-context.md`
- Engineering quality: `code-standards.md`
- Delivery process: `ai-workflow-rules.md`
- Current state and next unit: `progress-tracker.md`

## Non-negotiable rules

- Paper trading is the default and only permitted mode until every live-readiness gate is recorded as passed.
- Never paste, print, commit, or expose Alpaca credentials. Access them only through server-side secret storage.
- Never place Alpaca Trading API or MCP credentials in browser code.
- No AI agent may bypass the deterministic risk engine, global kill switch, stale-data checks, or market-mode gate.
- Separate proposal, approval, execution, and reconciliation into auditable steps.
- An LLM recommendation alone is never sufficient to place an order; every order requires a versioned strategy signal plus deterministic validation.
- Do not claim or imply guaranteed returns.
- Do not silently change risk thresholds, enabled strategies, live/paper mode, asset universe, or order behavior.
- Update `progress-tracker.md` after every meaningful verified change.
- If context files conflict, stop, record the conflict under Open Questions, and request resolution.
