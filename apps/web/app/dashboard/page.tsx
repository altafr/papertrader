import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

import { formatUtc, getFreshnessLabel, getFreshnessState, parseAgentRuns, parseOperationsHealth, type AgentRunSummary, type OperationsHealth } from "./dashboard-state";

type ReadModel = {
  activities: Array<Record<string, unknown>>;
  freshness: { ageSeconds: number; capturedAt: string };
  orders: Array<Record<string, unknown>>;
  positions: Array<Record<string, unknown>>;
  snapshot: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseReadModel(value: unknown): ReadModel | undefined {
  if (!isRecord(value) || !isRecord(value.model)) return undefined;
  const model = value.model;
  if (
    !Array.isArray(model.activities) ||
    !Array.isArray(model.orders) ||
    !Array.isArray(model.positions) ||
    !isRecord(model.snapshot) ||
    !isRecord(model.freshness) ||
    typeof model.freshness.ageSeconds !== "number" ||
    typeof model.freshness.capturedAt !== "string"
  ) return undefined;
  return {
    activities: model.activities.filter(isRecord),
    freshness: { ageSeconds: model.freshness.ageSeconds, capturedAt: model.freshness.capturedAt },
    orders: model.orders.filter(isRecord),
    positions: model.positions.filter(isRecord),
    snapshot: model.snapshot,
  };
}

async function loadReadModel(getToken: () => Promise<string | null>) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) return { kind: "unavailable", message: "API URL is not configured." } as const;
  const token = await getToken();
  if (!token) return { kind: "unavailable", message: "Authenticated API session is unavailable." } as const;
  try {
    const response = await fetch(`${apiBaseUrl}/v1/read-model`, {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
    });
    const body: unknown = await response.json();
    if (!response.ok) {
      if (isRecord(body) && body.error === "read_model_not_available") {
        return { kind: "unavailable", message: "No reconciled paper snapshot is available yet." } as const;
      }
      return { kind: "unavailable", message: "Persisted account data is currently unavailable." } as const;
    }
    const model = parseReadModel(body);
    return model
      ? ({ kind: "ready", model } as const)
      : ({ kind: "unavailable", message: "Persisted account data failed validation." } as const);
  } catch {
    return { kind: "unavailable", message: "The authenticated API could not be reached." } as const;
  }
}

async function loadOperationsHealth(getToken: () => Promise<string | null>) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) return undefined;
  const token = await getToken();
  if (!token) return undefined;
  try {
    const response = await fetch(`${apiBaseUrl}/v1/operations-health`, { cache: "no-store", headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) return undefined;
    return parseOperationsHealth(await response.json());
  } catch {
    return undefined;
  }
}

async function loadAgentRuns(getToken: () => Promise<string | null>) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) return undefined;
  const token = await getToken();
  if (!token) return undefined;
  try {
    const response = await fetch(`${apiBaseUrl}/v1/agent-runs?limit=20`, { cache: "no-store", headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) return undefined;
    return parseAgentRuns(await response.json());
  } catch {
    return undefined;
  }
}

function value(row: Record<string, unknown>, key: string) {
  const result = row[key];
  return typeof result === "string" || typeof result === "number" ? String(result) : "—";
}

function StatusBadge({ state }: { readonly state: "degraded" | "delayed" | "fresh" | "stale" }) {
  const label = state === "fresh" ? "Healthy" : state === "delayed" ? "Delayed" : state === "stale" ? "Stale" : "Degraded";
  return <span className={`state-badge ${state}`}>{label}</span>;
}

function OperationsHealthCard({ health }: { readonly health: OperationsHealth | undefined }) {
  if (!health) return <article className="card full-width degraded-card"><p className="label">Operations health</p><h2>Unavailable</h2><p>The authenticated operations-health endpoint could not be read.</p></article>;
  const schedulerLabel = health.runtime.scheduler.status === "ready" ? "Ready" : health.runtime.scheduler.status === "blocked" ? "Blocked" : "Disabled";
  const researchScheduleLabel = health.runtime.researchSchedule.status === "ready" ? "Ready" : health.runtime.researchSchedule.status === "blocked" ? "Blocked" : "Disabled";
  const telegramLabel = health.runtime.telegramAlerts.status === "ready" ? "Ready" : health.runtime.telegramAlerts.status === "blocked" ? "Blocked" : "Disabled";
  const telegramTestLabel = health.runtime.telegramAlertTest.status === "ready" ? "Ready" : "Blocked";
  const migrationLabel = health.runtime.migration.status === "ready" ? "Ready" : "Blocked";
  const reconciliationLabel = health.reconciliation.status === "fresh" ? "Fresh" : health.reconciliation.status === "delayed" ? "Delayed" : health.reconciliation.status === "stale" ? "Stale" : "Unavailable";
  return (
    <article className="card full-width operations-health-card" aria-label="Operations health">
      <div className="card-heading"><div><p className="label">Operations health</p><h2>Server-side safeguards</h2></div><span className={`state-badge ${health.reconciliation.status === "fresh" ? "fresh" : "degraded"}`}>{reconciliationLabel}</span></div>
      <div className="operations-health-grid">
        <div><span className="label">Reconciliation</span><strong>{health.reconciliation.ageSeconds === undefined ? "Unavailable" : `${health.reconciliation.ageSeconds}s old`}</strong></div>
        <div><span className="label">Last daily run</span><strong>{health.runtime.dailyReconciliation.status === "completed" ? "Completed" : "Unavailable"}</strong><small className="provenance">{health.runtime.dailyReconciliation.capturedAt ? `Captured ${formatUtc(health.runtime.dailyReconciliation.capturedAt)}` : "No completed run"}</small></div>
        <div><span className="label">Scheduler audit</span><strong>{health.runtime.schedulerAudit.status === "completed" ? "Completed" : health.runtime.schedulerAudit.status === "failed" ? "Failed" : health.runtime.schedulerAudit.status === "running" ? "Running" : "Unavailable"}</strong><small className="provenance">{health.runtime.schedulerAudit.runId ? `${health.runtime.schedulerAudit.runId}${health.runtime.schedulerAudit.completedAt ? ` · ${formatUtc(health.runtime.schedulerAudit.completedAt)}` : ""}` : "Audit gate not producing runs"}</small></div>
        <div><span className="label">Audit write gate</span><strong>{health.runtime.schedulerAuditGate.status === "enabled" ? "Enabled" : health.runtime.schedulerAuditGate.status === "blocked" ? "Blocked" : "Disabled"}</strong><small className="provenance">{health.runtime.schedulerAuditGate.status === "blocked" ? "Reference or migration not ready" : health.runtime.schedulerAuditGate.status === "enabled" ? "Runtime may write audit rows" : "No audit writes"}</small></div>
        <div><span className="label">Recovery drill</span><strong>{health.runtime.recovery.status === "verified" ? "Verified" : "Unverified"}</strong><small className="provenance">Operator-recorded backup/PITR evidence</small></div>
        <div><span className="label">Operating mode</span><strong>{health.runtime.operatingMode === "paper_autopilot" ? "Paper Autopilot" : health.runtime.operatingMode === "recommend" ? "Recommend" : "Observe"}</strong></div>
        <div><span className="label">Scheduler</span><strong>{schedulerLabel}</strong></div>
        <div><span className="label">Daily schedule</span><strong>{health.runtime.scheduler.cron} UTC</strong></div>
        <div><span className="label">Daily handler</span><strong>{health.runtime.dailyPreparationHandlerEnabled ? "Enabled" : "Disabled"}</strong></div>
        <div><span className="label">Scheduler activation review</span><strong>{health.runtime.scheduler.activationApprovalReferencePresent ? "Recorded" : "Missing"}</strong></div>
        <div><span className="label">Research schedule</span><strong>{researchScheduleLabel}</strong></div>
        <div><span className="label">Telegram alerts</span><strong>{telegramLabel}</strong><small className="provenance">Delivery unverified</small></div>
        <div><span className="label">Telegram test preflight</span><strong>{telegramTestLabel}</strong><small className="provenance">No-send check</small></div>
        <div><span className="label">Audit migration</span><strong>{migrationLabel}</strong></div>
        <div><span className="label">Broker read gate</span><strong>{health.runtime.brokerConnectionEnabled ? "Enabled" : "Disabled"}</strong></div>
        <div><span className="label">Paper Autopilot</span><strong>{health.runtime.paperAutopilotEnabled ? "Enabled" : "Disabled"}</strong></div>
        <div><span className="label">Global kill switch</span><strong>{health.runtime.globalKillSwitchActive ? "ACTIVE" : "Inactive"}</strong></div>
        <div><span className="label">Paper baseline</span><strong>USD {health.runtime.riskPolicy.initialEquityBaseline}</strong></div>
        <div><span className="label">Max loss vs invested value</span><strong>{health.runtime.riskPolicy.maxSingleTradeRiskPercentOfNotional}%</strong></div>
        <div><span className="label">Maximum stop distance</span><strong>{health.runtime.riskPolicy.maxSingleTradeStopLossPercent}% adverse</strong></div>
      </div>
      {health.runtime.migration.status === "blocked" && <p className="provenance">Audit migration checks: {health.runtime.migration.blockedReasons.join(", ") || "unavailable"}.</p>}
      <p className="provenance">The dashboard can observe these gates but cannot change them. Continuous scheduling and Paper Autopilot remain disabled unless explicitly activated.</p>
    </article>
  );
}

function operatingModeLabel(health: OperationsHealth | undefined): string {
  if (!health) return "Mode unavailable";
  if (health.runtime.operatingMode === "paper_autopilot") return "Paper Autopilot";
  if (health.runtime.operatingMode === "recommend") return "Recommend";
  return "Observe";
}

function AgentRunsCard({ runs }: { readonly runs: readonly AgentRunSummary[] | undefined }) {
  return (
    <article className="card full-width agent-runs-card" aria-label="Agent run health">
      <div className="card-heading"><div><p className="label">Research agents</p><h2>Run health &amp; provenance</h2></div><span className={`state-badge ${runs ? "fresh" : "degraded"}`}>{runs ? `${runs.length} recent` : "Unavailable"}</span></div>
      {!runs ? <p className="empty-state">Authenticated agent-run metadata is currently unavailable.</p> : runs.length === 0 ? <p className="empty-state">No agent runs have been recorded.</p> : (
        <div className="agent-runs-list">{runs.slice(0, 8).map((run) => <div className="agent-run-row" key={run.runId}><div><strong>{run.agentType}</strong><span>{run.task} · {formatUtc(run.createdAt)}</span></div><span className={`state-badge ${run.status === "succeeded" ? "fresh" : run.status === "failed" ? "degraded" : "delayed"}`}>{run.status}</span></div>)}</div>
      )}
      <p className="provenance">Metadata only: artifact payloads and rationale remain server-side. Agent output never authorizes risk or orders.</p>
    </article>
  );
}

export default async function DashboardPage() {
  const { isAuthenticated, redirectToSignIn, userId, getToken } = await auth();
  if (!isAuthenticated) return redirectToSignIn();

  const operatorUserId = process.env.CLERK_OPERATOR_USER_ID;
  if (!operatorUserId || userId !== operatorUserId) {
    return <main><h1>Access denied</h1><p>This account is not the configured single operator.</p></main>;
  }

  const result = await loadReadModel(getToken);
  const operationsHealth = await loadOperationsHealth(getToken);
  const agentRuns = await loadAgentRuns(getToken);
  const freshness = result.kind === "ready" ? getFreshnessState(result.model.freshness.ageSeconds) : "stale";
  const freshnessLabel = getFreshnessLabel(freshness);

  return (
    <main>
      <header className="status-bar">
        <div className="brand">Momentum Autopilot</div>
        <div className="status-items" aria-label="Authenticated system status">
          <span className="badge paper">Paper</span>
          <span className="badge neutral">{operatingModeLabel(operationsHealth)}</span>
          <span className={`badge ${freshness === "fresh" ? "healthy" : "warning"}`}>{freshnessLabel}</span>
          <UserButton />
        </div>
      </header>

      <section className="hero dashboard-hero" aria-labelledby="dashboard-title">
        <p className="eyebrow">Phase 2 · Market data and dashboard</p>
        <div className="hero-heading">
          <div>
            <h1 id="dashboard-title">Operator dashboard.</h1>
            <p className="lede">A paper-only view of reconciled account state and data health. No controls or order authority are available here.</p>
          </div>
          <div className="health-summary" aria-label="Service health summary">
            <span className="label">System state</span>
            <StatusBadge state={result.kind === "ready" ? freshness : "degraded"} />
            <span className="health-detail">Market stream: not connected</span>
          </div>
        </div>
      </section>

      <nav className="dashboard-nav" aria-label="Dashboard sections">
        <a className="active" href="#overview">Overview</a>
        <a href="#positions">Positions</a>
        <a href="#orders">Orders &amp; fills</a>
        <a href="#performance">Performance</a>
        <a href="#alerts">Alerts</a>
      </nav>

      {result.kind === "unavailable" ? (
        <section className="grid" aria-label="Dashboard unavailable state">
          <OperationsHealthCard health={operationsHealth} />
          <AgentRunsCard runs={agentRuns} />
          <article className="card full-width alert-card degraded-card">
            <p className="label">Read model unavailable</p>
            <h2>Waiting for the first safe reconciliation.</h2>
            <p>{result.message}</p>
            <p className="provenance">Account, positions, orders, and performance values are intentionally not shown without persisted broker truth.</p>
          </article>
          <article className="card"><p className="label">Account connection</p><h2>Unavailable</h2><p>Paper broker access is not confirmed by this dashboard request.</p></article>
          <article className="card"><p className="label">Market data</p><h2>Not connected</h2><p>Streaming and historical market data remain server-side and are not displayed until a fresh read model is available.</p></article>
        </section>
      ) : (
        <section className="grid" aria-label="Paper account dashboard">
          <OperationsHealthCard health={operationsHealth} />
          <AgentRunsCard runs={agentRuns} />
          <article className="card primary-card" id="overview">
            <div className="card-heading"><div><p className="label">Account equity</p><h2>{value(result.model.snapshot, "currency")} {value(result.model.snapshot, "equity")}</h2></div><StatusBadge state={freshness} /></div>
            <dl className="facts">
              <div><dt>Cash</dt><dd>{value(result.model.snapshot, "cash")}</dd></div>
              <div><dt>Buying power</dt><dd>{value(result.model.snapshot, "buyingPower")}</dd></div>
              <div><dt>Account status</dt><dd>{value(result.model.snapshot, "status")}</dd></div>
              <div><dt>Day P/L</dt><dd className="unavailable-value">Not reported</dd></div>
            </dl>
            <p className="provenance">Source: persisted Alpaca paper reconciliation · captured {formatUtc(result.model.freshness.capturedAt)}</p>
          </article>

          <article className="card freshness-card">
            <p className="label">Data health</p>
            <div className="card-heading"><h2>{result.model.freshness.ageSeconds}s old</h2><StatusBadge state={freshness} /></div>
            <p>Last reconciliation: {formatUtc(result.model.freshness.capturedAt)}</p>
            <p>Market stream: <strong>Not connected</strong></p>
            <p>Trade stream: <strong>Not enabled</strong></p>
          </article>

          <article className="card full-width" id="positions">
            <div className="card-heading"><div><p className="label">Positions</p><h2>{result.model.positions.length} open positions</h2></div><span className="provenance">Persisted account snapshot</span></div>
            {result.model.positions.length === 0 ? <p className="empty-state">No open positions in the latest reconciled snapshot.</p> : (
              <div className="responsive-table"><table><thead><tr><th>Symbol</th><th>Class</th><th>Quantity</th><th>Avg entry</th><th>Market value</th><th>Unrealized P/L</th></tr></thead><tbody>
                {result.model.positions.map((position) => <tr key={`${value(position, "symbol")}-${value(position, "accountSnapshotId")}`}><th scope="row">{value(position, "symbol")}</th><td>{value(position, "assetClass")}</td><td>{value(position, "quantity")}</td><td>{value(position, "averageEntryPrice")}</td><td>{value(position, "marketValue")}</td><td>{value(position, "unrealizedPl")}</td></tr>)}
              </tbody></table></div>
            )}
          </article>

          <article className="card" id="orders">
            <div className="card-heading"><div><p className="label">Orders &amp; fills</p><h2>{result.model.orders.length} orders</h2></div><span className="provenance">Read-only</span></div>
            <div className="data-list">{result.model.orders.slice(0, 10).map((order) => <div className="data-row" key={value(order, "alpacaOrderId")}><strong>{value(order, "symbol")}</strong><span>{value(order, "side")} · {value(order, "status")} · filled {value(order, "filledQuantity")}</span></div>)}{result.model.orders.length === 0 && <p className="empty-state">No orders recorded.</p>}</div>
          </article>

          <article className="card" id="performance">
            <p className="label">Performance</p><h2>Not yet available</h2><p>Performance snapshots, equity curves, drawdown, and attribution will appear after the performance ledger is implemented.</p><p className="provenance">No performance values are inferred from the account snapshot.</p>
          </article>

          <article className="card" id="alerts">
            <p className="label">Alerts</p><h2>No alert feed yet</h2><p>Critical stale-data, discrepancy, and risk alerts will be shown here when the alert service is implemented.</p><p className="provenance">Current dashboard state: {freshness === "fresh" ? "No known alert from this read model." : "Review stale or degraded data before relying on values."}</p>
          </article>

          <article className="card">
            <p className="label">Recent account activity</p><h2>{result.model.activities.length} events</h2>
            <div className="data-list">{result.model.activities.slice(0, 8).map((activity) => <div className="data-row" key={value(activity, "activityId")}><strong>{value(activity, "activityType")}</strong><span>{value(activity, "symbol")} · {value(activity, "quantity")}</span></div>)}{result.model.activities.length === 0 && <p className="empty-state">No account activity recorded.</p>}</div>
          </article>
        </section>
      )}
    </main>
  );
}
