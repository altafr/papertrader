import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

import { buildDashboardHistoryParams, formatAuditDateRange, formatUtc, getFreshnessLabel, getFreshnessState, parseAgentRuns, parseOperatorOverview, parseOperationsHealth, parsePaperPerformance, type AgentRunSummary, type OperationsHealth, type OperatorOverview, type PaperPerformance } from "./dashboard-state";
import { DashboardRefresh } from "./dashboard-refresh";

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

type PerformanceRange = "7d" | "30d" | "all";

async function loadPaperPerformance(getToken: () => Promise<string | null>, range: PerformanceRange): Promise<PaperPerformance | undefined> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) return undefined;
  const token = await getToken();
  if (!token) return undefined;
  try {
    const response = await fetch(`${apiBaseUrl}/v1/paper-performance?range=${range}`, { cache: "no-store", headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) return undefined;
    return parsePaperPerformance(await response.json());
  } catch {
    return undefined;
  }
}

async function loadOperatorOverview(getToken: () => Promise<string | null>, historyQuery = ""): Promise<OperatorOverview | undefined> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) return undefined;
  const token = await getToken();
  if (!token) return undefined;
  try {
    const response = await fetch(`${apiBaseUrl}/v1/operator-overview${historyQuery}`, { cache: "no-store", headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) return undefined;
    return parseOperatorOverview(await response.json());
  } catch {
    return undefined;
  }
}

function value(row: Record<string, unknown>, key: string) {
  const result = row[key];
  return typeof result === "string" || typeof result === "number" ? String(result) : "—";
}

function numericValue(row: Record<string, unknown>, key: string): number | undefined {
  const parsed = Number(row[key]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function positionNotional(row: Record<string, unknown>): number | undefined {
  const quantity = numericValue(row, "quantity");
  const entry = numericValue(row, "averageEntryPrice");
  return quantity !== undefined && entry !== undefined ? quantity * entry : undefined;
}

function positionReturnPercent(row: Record<string, unknown>): number | undefined {
  const notional = positionNotional(row);
  const unrealized = numericValue(row, "unrealizedPl");
  return notional && unrealized !== undefined ? (unrealized / notional) * 100 : undefined;
}

function indicatorSummary(row: Record<string, unknown>) {
  if (!isRecord(row.marketSnapshot)) return "Not captured";
  const snapshot = row.marketSnapshot;
  return `RSI14 ${value(snapshot, "rsi14")} · EMA20 ${value(snapshot, "ema20")} · EMA50 ${value(snapshot, "ema50")} · ATR14 ${value(snapshot, "atr14")} · RV20 ${value(snapshot, "relativeVolume20")} · close ${value(snapshot, "close")} · volume ${value(snapshot, "volume")} · as of ${formatUtc(value(snapshot, "asOf"))}`;
}

function riskDecisionSummary(row: Record<string, unknown>) {
  if (!isRecord(row.riskDecision)) return "No structured risk evidence";
  const risk = row.riskDecision;
  const loss = value(risk, "estimatedLoss");
  const percent = value(risk, "estimatedLossPercent");
  const policy = value(risk, "policyVersion");
  return [loss !== "—" ? `loss ${loss}` : "", percent !== "—" ? `${percent}% invested value` : "", policy !== "—" ? policy : ""].filter(Boolean).join(" · ") || "Structured risk decision recorded";
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
        <div className="agent-runs-list">{runs.slice(0, 8).map((run) => <div className="agent-run-row" key={run.runId}><div><strong>{run.agentType}</strong><span>{run.task} · {formatUtc(run.createdAt)}</span>{run.artifact?.rationale && <small>{run.artifact.rationale}</small>}<small className="provenance">{run.artifact?.confidence ? `Confidence ${run.artifact.confidence}` : "Confidence not reported"}{run.artifact?.type ? ` · ${run.artifact.type}` : ""}{run.artifact?.evidenceRefs?.length ? ` · ${run.artifact.evidenceRefs.length} evidence refs` : " · No evidence refs"}</small>{run.artifact?.evidenceRefs?.length ? <small className="evidence-refs">Evidence: {run.artifact.evidenceRefs.join(" · ")}</small> : null}<a className="detail-link" href={`/dashboard/agents/${encodeURIComponent(run.runId)}`}>Open stored detail →</a></div><span className={`state-badge ${run.status === "succeeded" ? "fresh" : run.status === "failed" ? "degraded" : "delayed"}`}>{run.status}</span></div>)}</div>
      )}
      <p className="provenance">Stored rationale and evidence are shown for audit context only. Agent output never authorizes risk or orders.</p>
    </article>
  );
}

function OperatorAuditCards({ historyQuery, overview }: { readonly historyQuery: string; readonly overview: OperatorOverview | undefined }) {
  const field = (row: Record<string, unknown>, key: string) => value(row, key);
  return <>
    <article className="card full-width" id="filtered-trades"><div className="card-heading"><div><p className="label">Filtered trades</p><h2>{overview ? overview.filteredTrades.length : "—"} signal decisions</h2></div><a className="export-link" href={`/dashboard/export?${historyQuery}`}>Export this audit page</a><span className="provenance">Shadow / rejected opportunity audit</span></div>
      {!overview || overview.filteredTrades.length === 0 ? <p className="empty-state">No filtered or shadow decisions are persisted yet.</p> : <div className="responsive-table"><table><thead><tr><th>Symbol</th><th>Strategy</th><th>Score</th><th>Entry</th><th>Stop</th><th>Indicators at signal</th><th>State</th><th>Why / outcome</th></tr></thead><tbody>{overview.filteredTrades.map((row) => <tr key={field(row, "observationId")}><th scope="row">{field(row, "symbol")}</th><td>{field(row, "strategyKey")} {field(row, "strategyVersion")}</td><td>{field(row, "score")}</td><td>{field(row, "proposedEntryPrice")}</td><td>{field(row, "plannedStopPrice")}</td><td className="table-reason">{indicatorSummary(row)}</td><td>{field(row, "status")}</td><td className="table-reason">{field(row, "rationale")}{isRecord(row.outcome) ? ` · ${field(row.outcome, "reason")} ${field(row.outcome, "returnPercent")}%` : ""}</td></tr>)}</tbody></table></div>}
      <p className="provenance">RSI14, EMA20, ATR14, and relative volume are computed from finalized bars and stored with the signal. This is not a promise of execution or profitability.</p>
    </article>
    <article className="card full-width" id="decision-log"><div className="card-heading"><div><p className="label">Trade decision log</p><h2>{overview ? overview.tradeDecisions.length : "—"} execution decisions</h2></div><span className="provenance">Immutable paper submissions</span></div>
      {!overview || overview.tradeDecisions.length === 0 ? <p className="empty-state">No paper execution decisions have been submitted.</p> : <div className="responsive-table"><table><thead><tr><th>Symbol</th><th>Intent</th><th>Status</th><th>Quantity</th><th>Filled</th><th>Risk decision</th><th>Indicators at approval</th></tr></thead><tbody>{overview.tradeDecisions.map((row) => <tr key={field(row, "intentId")}><th scope="row">{field(row, "symbol")}</th><td>{field(row, "intentId")}</td><td>{field(row, "status")}</td><td>{field(row, "quantity")}</td><td>{field(row, "filledQuantity")}</td><td className="table-reason">{field(row, "reason")} · {riskDecisionSummary(row)}</td><td className="table-reason">{indicatorSummary(row)}</td></tr>)}</tbody></table></div>}
      <p className="provenance">Risk policy version, estimated loss, and deterministic rejection reasons are persisted with each submission when supplied by the approval engine.</p>
    </article>
  </>;
}

type StrategySummary = { readonly averageReturn: number | undefined; readonly closed: number; readonly losses: number; readonly open: number; readonly strategy: string; readonly total: number; readonly wins: number };

function summarizeStrategies(overview: OperatorOverview | undefined): readonly StrategySummary[] {
  const byStrategy = new Map<string, { returns: number[]; closed: number; open: number; wins: number; losses: number; total: number }>();
  for (const row of overview?.filteredTrades ?? []) {
    const strategy = `${value(row, "strategyKey")} ${value(row, "strategyVersion")}`.trim() || "Unknown strategy";
    const current = byStrategy.get(strategy) ?? { returns: [], closed: 0, open: 0, wins: 0, losses: 0, total: 0 };
    current.total += 1;
    if (value(row, "status") === "closed") {
      current.closed += 1;
      const outcome = isRecord(row.outcome) ? Number(outcomeValue(row.outcome, "returnPercent")) : Number.NaN;
      if (Number.isFinite(outcome)) {
        current.returns.push(outcome);
        if (outcome > 0) current.wins += 1;
        if (outcome < 0) current.losses += 1;
      }
    } else current.open += 1;
    byStrategy.set(strategy, current);
  }
  return [...byStrategy.entries()].map(([strategy, current]) => ({ averageReturn: current.returns.length ? current.returns.reduce((sum, item) => sum + item, 0) / current.returns.length : undefined, closed: current.closed, losses: current.losses, open: current.open, strategy, total: current.total, wins: current.wins })).sort((left, right) => right.total - left.total);
}

function outcomeValue(row: Record<string, unknown>, key: string) {
  const result = row[key];
  return typeof result === "string" || typeof result === "number" ? String(result) : "";
}

function StrategyPerformanceCard({ overview }: { readonly overview: OperatorOverview | undefined }) {
  const summaries = summarizeStrategies(overview);
  return <article className="card full-width" id="strategy-performance"><div className="card-heading"><div><p className="label">Strategy performance</p><h2>{summaries.length ? `${summaries.length} strategies observed` : "No strategy outcomes yet"}</h2></div><span className="provenance">Shadow observations only</span></div>{summaries.length === 0 ? <p className="empty-state">Strategy-level metrics will appear after persisted signal outcomes are available.</p> : <div className="responsive-table"><table><thead><tr><th>Strategy</th><th>Total signals</th><th>Open</th><th>Closed</th><th>Wins</th><th>Losses</th><th>Avg observed return</th></tr></thead><tbody>{summaries.map((summary) => <tr key={summary.strategy}><th scope="row">{summary.strategy}</th><td>{summary.total}</td><td>{summary.open}</td><td>{summary.closed}</td><td>{summary.wins}</td><td>{summary.losses}</td><td>{summary.averageReturn === undefined ? "Not available" : `${summary.averageReturn.toFixed(4)}%`}</td></tr>)}</tbody></table></div>}<p className="provenance">These are descriptive shadow/research observations, not live-trade returns or a profitability claim.</p></article>;
}

function StrategyLifecycleCard({ overview }: { readonly overview: OperatorOverview | undefined }) {
  const events = overview?.strategyLifecycle ?? [];
  return <article className="card full-width" id="strategy-lifecycle"><div className="card-heading"><div><p className="label">Strategy lifecycle</p><h2>{events.length ? `${events.length} version events` : "No lifecycle events"}</h2></div><span className="provenance">Read-only approvals</span></div>{events.length === 0 ? <p className="empty-state">No persisted strategy stage transitions are available.</p> : <div className="responsive-table"><table><thead><tr><th>Strategy</th><th>Version</th><th>Transition</th><th>Revision</th><th>Reason</th><th>Evidence</th><th>Approved</th></tr></thead><tbody>{events.map((event) => <tr key={value(event, "eventId")}><th scope="row">{value(event, "strategyKey")}</th><td>{value(event, "strategyVersion")}</td><td>{value(event, "fromStage")} → {value(event, "toStage")}</td><td>{value(event, "revision")}</td><td className="table-reason">{value(event, "reason")}</td><td>{value(event, "evidenceKey")}</td><td>{formatUtc(value(event, "approvedAt"))}</td></tr>)}</tbody></table></div>}<p className="provenance">Lifecycle history records reviewed stage transitions; it does not itself enable trading or override deterministic gates.</p></article>;
}

function StrategyCatalogCard({ overview }: { readonly overview: OperatorOverview | undefined }) {
  const strategies = overview?.strategyCatalog ?? [];
  return <article className="card full-width" id="strategy-catalog"><div className="card-heading"><div><p className="label">Strategy catalog</p><h2>{strategies.length ? `${strategies.length} registered strategies` : "No strategy metadata"}</h2></div><span className="provenance">Versioned defaults</span></div>{strategies.length === 0 ? <p className="empty-state">No registered strategy metadata is available.</p> : <div className="responsive-table"><table><thead><tr><th>Strategy</th><th>Version</th><th>Asset class</th><th>Stage</th><th>Lookback</th><th>Description</th><th>Default parameters</th></tr></thead><tbody>{strategies.map((strategy) => <tr key={`${value(strategy, "key")}-${value(strategy, "version")}`}><th scope="row">{value(strategy, "key")}</th><td>{value(strategy, "version")}</td><td>{value(strategy, "assetClass")}</td><td>{value(strategy, "stage")}</td><td>{value(strategy, "requiredLookbackBars")} bars</td><td className="table-reason">{value(strategy, "description")}</td><td className="table-reason">{isRecord(strategy.defaultParameters) ? JSON.stringify(strategy.defaultParameters) : "Not reported"}</td></tr>)}</tbody></table></div>}<p className="provenance">Catalog metadata is descriptive and read-only; lifecycle approvals and deterministic gates remain authoritative.</p></article>;
}

function AuditTimelineCard({ overview }: { readonly overview: OperatorOverview | undefined }) {
  const events = overview?.auditTimeline ?? [];
  return <article className="card full-width" id="audit-timeline"><div className="card-heading"><div><p className="label">Audit timeline</p><h2>{events.length ? `${events.length} persisted events` : "No persisted events"}</h2></div><span className="provenance">Read-only unified view</span></div>{events.length === 0 ? <p className="empty-state">No agent, lifecycle, scheduler, or execution events are available.</p> : <div className="audit-timeline-list">{events.map((event) => <div className="audit-timeline-row" key={`${value(event, "category")}-${value(event, "reference")}`}><span className="audit-timeline-time">{formatUtc(value(event, "capturedAt"))}</span><strong>{value(event, "title")}</strong><span>{value(event, "detail")}</span><small>{value(event, "category")}</small></div>)}</div>}<p className="provenance">This view combines immutable persisted records for orientation; it does not replace source records or authorize actions.</p></article>;
}

function PaperPerformanceCard({ performance }: { readonly performance: PaperPerformance | undefined }) {
  if (!performance) return <article className="card" id="performance"><p className="label">Performance</p><h2>Unavailable</h2><p>Authenticated performance data is currently unavailable.</p></article>;
  const metrics = performance.metrics;
  const curve = performance.equityCurve ?? [];
  const numeric = curve.map((point) => Number(point.equity)).filter(Number.isFinite);
  const minimum = Math.min(...numeric);
  const maximum = Math.max(...numeric);
  const span = maximum - minimum || 1;
  const points = curve.map((point, index) => `${(index / Math.max(curve.length - 1, 1)) * 100},${100 - ((Number(point.equity) - minimum) / span) * 88 - 6}`).join(" ");
  return <article className="card" id="performance"><div className="card-heading"><div><p className="label">Paper performance</p><h2>{metrics ? `${metrics.totalReturnPercent}% return` : "Insufficient history"}</h2></div><div className="range-links" aria-label="Performance time range">{(["7d", "30d", "all"] as const).map((range) => <a className={performance.performanceRange === range ? "active" : ""} href={`/dashboard?range=${range}#performance`} key={range}>{range === "all" ? "All" : range}</a>)}</div></div><p>{performance.snapshotCount} snapshots · {performance.calendarDays} calendar days · {performance.consecutiveCalendarDays} consecutive days</p>{metrics && <p>Max drawdown {metrics.maxDrawdownPercent}% · P/L {metrics.totalPnl}</p>}{points && <div className="equity-chart" aria-label="Paper equity curve"><svg viewBox="0 0 100 100" role="img" aria-label="Equity curve"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg><span className="chart-caption">{performance.performanceRange === "all" ? "All history" : performance.performanceRange} · latest {formatUtc(curve[curve.length - 1]!.capturedAt)}</span></div>}{curve.length > 0 && <details className="snapshot-details"><summary>Show capture rows</summary><div className="responsive-table"><table><thead><tr><th>Captured</th><th>Equity</th><th>Return</th><th>Drawdown</th></tr></thead><tbody>{curve.map((point) => <tr key={point.capturedAt}><th scope="row">{formatUtc(point.capturedAt)}</th><td>{point.equity}</td><td>{point.returnPercent}%</td><td>{point.drawdownPercent}%</td></tr>)}</tbody></table></div></details>}<p className="provenance">Stability gate: {performance.stability.status === "ready" ? "Ready" : `Blocked · ${performance.stability.blockedReasons.join(", ")}`}</p></article>;
}

type AlertItem = { readonly detail: string; readonly severity: "critical" | "info" | "warning"; readonly title: string };

function buildHealthAlerts(health: OperationsHealth | undefined, freshness: "delayed" | "fresh" | "stale", performance: PaperPerformance | undefined): readonly AlertItem[] {
  const alerts: AlertItem[] = [];
  if (!health) return [{ detail: "The authenticated operations-health contract could not be read.", severity: "critical", title: "Operations health unavailable" }];
  if (health.runtime.globalKillSwitchActive) alerts.push({ detail: "New proposals and submissions should remain stopped until the operator completes the safe-resume checklist.", severity: "critical", title: "Global kill switch is active" });
  if (freshness === "stale") alerts.push({ detail: "The latest reconciled account snapshot is outside the trusted freshness window.", severity: "critical", title: "Account data is stale" });
  else if (freshness === "delayed") alerts.push({ detail: "The latest reconciled account snapshot is delayed; review freshness before relying on values.", severity: "warning", title: "Account data is delayed" });
  if (health.runtime.migration.status === "blocked") alerts.push({ detail: health.runtime.migration.blockedReasons.join(", ") || "Migration readiness is not confirmed.", severity: "critical", title: "Database migration gate is blocked" });
  if (health.runtime.recovery.status !== "verified") alerts.push({ detail: "The latest backup/PITR recovery evidence is not verified in the runtime contract.", severity: "warning", title: "Recovery verification is missing" });
  if (health.runtime.telegramAlerts.enabled && health.runtime.telegramAlerts.status !== "ready") alerts.push({ detail: "Critical alert configuration is not ready for delivery.", severity: "warning", title: "Telegram alerts are not ready" });
  if (performance?.stability.status === "blocked") alerts.push({ detail: performance.stability.blockedReasons.join(", "), severity: "info", title: "Paper stability gate remains blocked" });
  return alerts;
}

function AlertsCard({ health, freshness, performance }: { readonly health: OperationsHealth | undefined; readonly freshness: "delayed" | "fresh" | "stale"; readonly performance: PaperPerformance | undefined }) {
  const alerts = buildHealthAlerts(health, freshness, performance);
  return <article className="card full-width" id="alerts"><div className="card-heading"><div><p className="label">Alerts</p><h2>{alerts.length === 0 ? "No active health alerts" : `${alerts.length} health alert${alerts.length === 1 ? "" : "s"}`}</h2></div><span className={`state-badge ${alerts.some((alert) => alert.severity === "critical") ? "degraded" : alerts.some((alert) => alert.severity === "warning") ? "delayed" : "fresh"}`}>{alerts.some((alert) => alert.severity === "critical") ? "Review now" : alerts.length === 0 ? "Healthy" : "Review"}</span></div><div className="alert-list">{alerts.length === 0 ? <p className="empty-state">No active alert is derived from the current persisted health contracts.</p> : alerts.map((alert) => <div className={`alert-row ${alert.severity}`} key={alert.title}><strong>{alert.title}</strong><span>{alert.detail}</span></div>)}</div><p className="provenance">These are current-state health notices, not a replacement for the immutable audit log. They do not change risk or order behavior.</p></article>;
}

export default async function DashboardPage({ searchParams }: { readonly searchParams?: Promise<{ readonly from?: string | string[]; readonly page?: string | string[]; readonly range?: string | string[]; readonly to?: string | string[] }> }) {
  const { isAuthenticated, redirectToSignIn, userId, getToken } = await auth();
  if (!isAuthenticated) return redirectToSignIn();

  const operatorUserId = process.env.CLERK_OPERATOR_USER_ID;
  if (!operatorUserId || userId !== operatorUserId) {
    return <main><h1>Access denied</h1><p>This account is not the configured single operator.</p></main>;
  }

  const requestedParams = await searchParams;
  const requestedRange = requestedParams?.range;
  const performanceRange: PerformanceRange = requestedRange === "7d" || (Array.isArray(requestedRange) && requestedRange[0] === "7d") ? "7d" : requestedRange === "30d" || (Array.isArray(requestedRange) && requestedRange[0] === "30d") ? "30d" : "all";
  const historyPageValue = requestedParams?.page;
  const historyPage = Number(Array.isArray(historyPageValue) ? historyPageValue[0] : historyPageValue ?? "1");
  const safeHistoryPage = Number.isSafeInteger(historyPage) && historyPage > 0 && historyPage <= 1_000 ? historyPage : 1;
  const historyFrom = Array.isArray(requestedParams?.from) ? requestedParams?.from[0] : requestedParams?.from;
  const historyTo = Array.isArray(requestedParams?.to) ? requestedParams?.to[0] : requestedParams?.to;
  const historyQuery = new URLSearchParams({ limit: "100", page: String(safeHistoryPage), ...(historyFrom ? { from: historyFrom } : {}), ...(historyTo ? { to: historyTo } : {}) }).toString();
  const result = await loadReadModel(getToken);
  const operationsHealth = await loadOperationsHealth(getToken);
  const agentRuns = await loadAgentRuns(getToken);
  const paperPerformance = await loadPaperPerformance(getToken, performanceRange);
  const operatorOverview = await loadOperatorOverview(getToken, `?${historyQuery}`);
  const freshness = result.kind === "ready" ? getFreshnessState(result.model.freshness.ageSeconds) : "stale";
  const freshnessLabel = getFreshnessLabel(freshness);
  const portfolioMarketValue = result.kind === "ready" ? result.model.positions.reduce((sum, position) => sum + (numericValue(position, "marketValue") ?? 0), 0) : undefined;
  const portfolioUnrealizedPl = result.kind === "ready" ? result.model.positions.reduce((sum, position) => sum + (numericValue(position, "unrealizedPl") ?? 0), 0) : undefined;
  const equity = result.kind === "ready" ? numericValue(result.model.snapshot, "equity") : undefined;
  const lastEquity = result.kind === "ready" ? numericValue(result.model.snapshot, "lastEquity") : undefined;
  const dayPnl = equity !== undefined && lastEquity !== undefined ? equity - lastEquity : undefined;
  const grossExposurePercent = equity && portfolioMarketValue !== undefined ? (portfolioMarketValue / equity) * 100 : undefined;
  const today = new Date();
  const toDate = today.toISOString().slice(0, 10);
  const presetDate = (days: number) => { const from = new Date(today); from.setUTCDate(from.getUTCDate() - (days - 1)); return from.toISOString().slice(0, 10); };
  const historyPresetHref = (days?: number) => { const params = buildDashboardHistoryParams(1, performanceRange); if (days) { params.set("from", presetDate(days)); params.set("to", toDate); } return `/dashboard?${params.toString()}#filtered-trades`; };

  return (
    <main>
      <header className="status-bar">
        <div className="brand">Momentum Autopilot</div>
        <div className="status-items" aria-label="Authenticated system status">
          <span className="badge paper">Paper</span>
          <span className="badge neutral">{operatingModeLabel(operationsHealth)}</span>
          <span className={`badge ${freshness === "fresh" ? "healthy" : "warning"}`}>{freshnessLabel}</span>
          <DashboardRefresh />
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
          <a href="#filtered-trades">Filtered trades</a>
          <a href="#decision-log">Decision log</a>
          <a href="#strategy-performance">Strategies</a>
          <a href="#strategy-lifecycle">Lifecycle</a>
          <a href="#strategy-catalog">Catalog</a>
          <a href="#audit-timeline">Audit</a>
          <a href="#performance">Performance</a>
        <a href="#alerts">Alerts</a>
      </nav>

      <section className="history-toolbar" aria-label="Audit history controls">
        <span className="label">Audit history</span>
        <span className="history-window">{formatAuditDateRange(historyFrom, historyTo)}</span>
        <span>Page {operatorOverview?.history?.page ?? safeHistoryPage}</span>
        {operatorOverview?.history?.totals && <span className="audit-coverage" aria-label="Audit record totals"><span>{operatorOverview.history.totals.filteredTrades} filtered</span><span>{operatorOverview.history.totals.submissions} execution</span><span>{operatorOverview.history.totals.agents} agents</span><span>{operatorOverview.history.totals.lifecycle} lifecycle</span><span>{operatorOverview.history.totals.schedules} scheduler</span></span>}
        {safeHistoryPage <= 1 ? <span className="disabled-control" aria-disabled="true">Previous</span> : <a href={`/dashboard?${buildDashboardHistoryParams(safeHistoryPage - 1, performanceRange, historyFrom, historyTo).toString()}`}>Previous</a>}
        {operatorOverview?.history?.hasNext === false ? <span className="disabled-control" aria-disabled="true">Next</span> : <a href={`/dashboard?${buildDashboardHistoryParams(safeHistoryPage + 1, performanceRange, historyFrom, historyTo).toString()}`}>Next</a>}
        <span className="history-presets" aria-label="Date presets"><a href={historyPresetHref()}>All</a><a href={historyPresetHref(1)}>Today</a><a href={historyPresetHref(7)}>7d</a><a href={historyPresetHref(30)}>30d</a></span>
        <form method="get" className="history-filter"><input type="hidden" name="range" value={performanceRange} /><label htmlFor="history-from">From</label><input id="history-from" name="from" type="date" defaultValue={historyFrom?.slice(0, 10)} /><label htmlFor="history-to">To</label><input id="history-to" name="to" type="date" defaultValue={historyTo?.slice(0, 10)} /><button type="submit">Apply</button><a className="clear-filter" href={`/dashboard?${buildDashboardHistoryParams(1, performanceRange).toString()}#filtered-trades`}>Clear</a></form>
        <span className="provenance">Read-only, bounded to 100 records per page</span>
      </section>

      {result.kind === "unavailable" ? (
        <section className="grid" aria-label="Dashboard unavailable state">
          <OperationsHealthCard health={operationsHealth} />
          <AgentRunsCard runs={operatorOverview?.agents ?? agentRuns} />
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
          <AgentRunsCard runs={operatorOverview?.agents ?? agentRuns} />
          <article className="card primary-card" id="overview">
            <div className="card-heading"><div><p className="label">Account equity</p><h2>{value(result.model.snapshot, "currency")} {value(result.model.snapshot, "equity")}</h2></div><StatusBadge state={freshness} /></div>
            <dl className="facts">
              <div><dt>Cash</dt><dd>{value(result.model.snapshot, "cash")}</dd></div>
              <div><dt>Buying power</dt><dd>{value(result.model.snapshot, "buyingPower")}</dd></div>
              <div><dt>Account status</dt><dd>{value(result.model.snapshot, "status")}</dd></div>
              <div><dt>Day P/L</dt><dd className={dayPnl !== undefined && dayPnl < 0 ? "negative-value" : ""}>{dayPnl === undefined ? "Not reported" : dayPnl.toFixed(2)}</dd></div>
              <div><dt>Unrealized P/L</dt><dd className={portfolioUnrealizedPl !== undefined && portfolioUnrealizedPl < 0 ? "negative-value" : ""}>{portfolioUnrealizedPl === undefined ? "Not reported" : portfolioUnrealizedPl.toFixed(2)}</dd></div>
              <div><dt>Gross exposure</dt><dd>{grossExposurePercent === undefined ? "Not reported" : `${grossExposurePercent.toFixed(2)}%`}</dd></div>
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
              <div className="responsive-table"><table><thead><tr><th>Symbol</th><th>Class</th><th>Quantity</th><th>Avg entry</th><th>Invested notional</th><th>Market value</th><th>Unrealized P/L</th><th>Return</th></tr></thead><tbody>
                {result.model.positions.map((position) => { const notional = positionNotional(position); const returnPercent = positionReturnPercent(position); return <tr key={`${value(position, "symbol")}-${value(position, "accountSnapshotId")}`}><th scope="row">{value(position, "symbol")}</th><td>{value(position, "assetClass")}</td><td>{value(position, "quantity")}</td><td>{value(position, "averageEntryPrice")}</td><td>{notional === undefined ? "Not reported" : notional.toFixed(2)}</td><td>{value(position, "marketValue")}</td><td className={numericValue(position, "unrealizedPl") !== undefined && (numericValue(position, "unrealizedPl") ?? 0) < 0 ? "negative-value" : ""}>{value(position, "unrealizedPl")}</td><td className={returnPercent !== undefined && returnPercent < 0 ? "negative-value" : ""}>{returnPercent === undefined ? "Not reported" : `${returnPercent.toFixed(2)}%`}</td></tr>; })}
              </tbody></table></div>
            )}
          </article>

          <article className="card full-width" id="orders">
            <div className="card-heading"><div><p className="label">Orders &amp; fills</p><h2>{result.model.orders.length} orders</h2></div><a className="export-link" href="/dashboard/account-export">Export account CSV</a><span className="provenance">Read-only broker reconciliation</span></div>
            {result.model.orders.length === 0 ? <p className="empty-state">No orders recorded.</p> : <div className="responsive-table"><table><thead><tr><th>Symbol</th><th>Side/type</th><th>Status</th><th>Requested</th><th>Filled</th><th>Client order ID</th><th>Broker order ID</th><th>Submitted</th><th>Updated</th></tr></thead><tbody>{result.model.orders.map((order) => <tr key={value(order, "alpacaOrderId")}><th scope="row">{value(order, "symbol")}</th><td>{value(order, "side")} / {value(order, "type")}</td><td>{value(order, "status")}</td><td>{value(order, "quantity")}</td><td>{value(order, "filledQuantity")}</td><td className="table-reason">{value(order, "clientOrderId")}</td><td className="table-reason">{value(order, "alpacaOrderId")}</td><td>{value(order, "submittedAt")}</td><td>{value(order, "updatedAt")}</td></tr>)}</tbody></table></div>}
          </article>

          <PaperPerformanceCard performance={paperPerformance} />

          <StrategyPerformanceCard overview={operatorOverview} />

          <StrategyLifecycleCard overview={operatorOverview} />

          <StrategyCatalogCard overview={operatorOverview} />

          <AuditTimelineCard overview={operatorOverview} />

          <OperatorAuditCards historyQuery={historyQuery} overview={operatorOverview} />

          <AlertsCard health={operationsHealth} freshness={freshness} performance={paperPerformance} />

          <article className="card">
            <p className="label">Recent account activity</p><h2>{result.model.activities.length} events</h2>
            <div className="data-list">{result.model.activities.map((activity) => <div className="data-row" key={value(activity, "activityId")}><strong>{value(activity, "activityType")}</strong><span>{value(activity, "symbol")} · {value(activity, "quantity")} · {value(activity, "transactionTime")}</span></div>)}{result.model.activities.length === 0 && <p className="empty-state">No account activity recorded.</p>}</div>
          </article>
        </section>
      )}
    </main>
  );
}
