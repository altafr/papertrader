"use client";

import Script from "next/script";
import { isOvernightReport, type OvernightReport } from "@momentum/domain";
import * as DecimalModule from "decimal.js";
import { OvernightReports } from "./overnight-reports";
import { useDisplayTimezone } from "../timezone-preferences";
import { useEffect, useState } from "react";

type MiniAppData = {
  readonly asOf: string;
  readonly overnightReports?: readonly OvernightReport[];
  readonly overnightReportsUnavailable?: boolean;
  readonly portfolio: { readonly metrics?: { readonly dayPnl?: string; readonly unrealizedPl?: string }; readonly snapshot: Record<string, unknown>; readonly positions: readonly Record<string, unknown>[]; readonly orders: readonly Record<string, unknown>[] };
  readonly alerts: readonly { readonly code: string; readonly deliveryStatus: string; readonly eventId: string; readonly message: string; readonly occurredAt: string; readonly severity: string }[];
  readonly unmanagedPositions?: readonly { readonly assetClass: string; readonly missingFields: readonly string[]; readonly symbol: string }[];
  readonly agents?: readonly { readonly agentType: string; readonly description: string; readonly runs: readonly { readonly createdAt: string; readonly errorCode?: string | null; readonly finishedAt?: string | null; readonly runId: string; readonly status: string; readonly task: string }[] }[];
  readonly tradeJournal?: readonly { readonly intentId: string; readonly symbol: string; readonly assetClass: string; readonly status: string; readonly quantity: string; readonly entryPrice?: string | null; readonly plannedStopPrice?: string | null; readonly plannedTargetPrice?: string | null; readonly selectedAt: string; readonly updatedAt?: string | null; readonly rationale: string; readonly finalResult: string }[];
};

interface DisplayDecimal { div(value: DisplayDecimal | string): DisplayDecimal; toFixed(decimalPlaces?: number): string; }
interface DisplayDecimalConstructor { new (value: string): DisplayDecimal; }
const DisplayDecimal = (DecimalModule as unknown as { readonly default: DisplayDecimalConstructor }).default;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export const isMiniAppData = (value: unknown): value is MiniAppData => {
  if (!isRecord(value) || typeof value.asOf !== "string" || !isRecord(value.portfolio) || !Array.isArray(value.portfolio.positions) || !Array.isArray(value.portfolio.orders) || !Array.isArray(value.alerts)) return false;
  if (!isRecord(value.portfolio.snapshot)) return false;
  if (value.portfolio.metrics !== undefined && !isRecord(value.portfolio.metrics)) return false;
  if (value.overnightReports !== undefined && (!Array.isArray(value.overnightReports) || value.overnightReports.length > 31 || !value.overnightReports.every(isOvernightReport))) return false;
  if (value.overnightReportsUnavailable !== undefined && typeof value.overnightReportsUnavailable !== "boolean") return false;
  return value.alerts.every((alert) => isRecord(alert) && typeof alert.code === "string" && typeof alert.deliveryStatus === "string" && typeof alert.eventId === "string" && typeof alert.message === "string" && typeof alert.occurredAt === "string" && typeof alert.severity === "string");
};

declare global { interface Window { Telegram?: { WebApp?: { readonly initData?: string; ready: () => void; expand: () => void } } } }

const money = (value: unknown): string => {
  if (typeof value !== "string" && typeof value !== "number") return "—";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "—";
};

const positionCurrentPrice = (position: Record<string, unknown>): string => {
  try {
    const quantity = String(position.quantity ?? "");
    const marketValue = String(position.marketValue ?? "");
    if (!quantity || new DisplayDecimal(quantity).toFixed(8) === "0.00000000") return "—";
    return new DisplayDecimal(marketValue).div(quantity).toFixed(2);
  } catch { return "—"; }
};

export const getMiniAppErrorMessage = (status: number, code: unknown): string => {
  if (status === 503 || code === "telegram_mini_app_disabled") return "The Telegram Mini App is not enabled on the trading API yet. Add the API Telegram variables, then redeploy.";
  if (status === 401 || code === "unauthorized") return "This Telegram account is not authorized for the paper portfolio.";
  if (status === 404 || code === "read_model_not_available") return "The paper portfolio has not produced a reconciled snapshot yet.";
  return typeof code === "string" && code.length > 0 ? `The paper portfolio is unavailable (${code}).` : "The paper portfolio is unavailable.";
};
export const getMiniAppFreshness = (asOf: string, now = Date.now()): "fresh" | "stale" | "unknown" => {
  const captured = Date.parse(asOf);
  if (!Number.isFinite(captured) || captured > now + 30_000) return "unknown";
  return now - captured <= 300_000 ? "fresh" : "stale";
};

export const MINI_APP_REFRESH_INTERVAL_MS = 15_000;

export default function TelegramMiniAppPage() {
  const { timezone } = useDisplayTimezone();
  const [tab, setTab] = useState<"portfolio" | "alerts" | "agents" | "trades" | "overnight">("portfolio");
  const [agentFilter, setAgentFilter] = useState("");
  const [data, setData] = useState<MiniAppData>();
  const [error, setError] = useState("Connecting to the paper portfolio…");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(MINI_APP_REFRESH_INTERVAL_MS / 1000);
  const formatDisplayTime = (value: string, full = false) => new Intl.DateTimeFormat(timezone === "America/New_York" ? "en-US" : "en-HK", { timeZone: timezone, year: full ? "numeric" : undefined, month: full ? "short" : undefined, day: full ? "numeric" : undefined, hour: "2-digit", minute: "2-digit", second: full ? "2-digit" : undefined, hourCycle: "h23" }).format(new Date(value));

  useEffect(() => {
    let active = true;
    let inFlight: AbortController | undefined;
    const load = async () => {
      if (!active) return;
      const webApp = window.Telegram?.WebApp;
      webApp?.ready();
      webApp?.expand();
      const initData = webApp?.initData;
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      if (!initData || !apiBaseUrl) { if (active) setError("Open this page from the Telegram assistant. The signed Telegram session is missing."); return; }
      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;
      setRefreshing(true);
      try {
        const response = await fetch(`${apiBaseUrl}/v1/telegram-mini-app`, { cache: "no-store", headers: { "x-telegram-init-data": initData }, signal: controller.signal });
        const body: unknown = await response.json();
        if (!active || controller.signal.aborted) return;
        if (!response.ok || !isMiniAppData(body)) { setError(getMiniAppErrorMessage(response.status, isRecord(body) ? body.error : undefined)); return; }
      setData(body); setError("");
        setSecondsUntilRefresh(MINI_APP_REFRESH_INTERVAL_MS / 1000);
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) setError("Could not reach the paper portfolio service.");
      } finally {
        if (active && inFlight === controller) { inFlight = undefined; setRefreshing(false); }
      }
    };
    void load();
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const timer = window.setInterval(() => void load(), MINI_APP_REFRESH_INTERVAL_MS);
    const countdown = window.setInterval(() => setSecondsUntilRefresh((seconds) => seconds > 1 ? seconds - 1 : MINI_APP_REFRESH_INTERVAL_MS / 1000), 1_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      active = false;
      inFlight?.abort();
      window.clearInterval(timer);
      window.clearInterval(countdown);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshKey]);

  const snapshot = data?.portfolio.snapshot ?? {};
  const metrics = data?.portfolio.metrics ?? {};
  const orders = data?.portfolio.orders ?? [];
  const unmanagedPositions = data?.unmanagedPositions ?? [];
  const freshness = data?.asOf ? getMiniAppFreshness(data.asOf) : "unknown";
  const liveActivity = [
    ...(data?.alerts ?? []).map((alert) => ({ at: alert.occurredAt, category: "Alert", detail: alert.message, title: alert.code })),
    ...(data?.portfolio.orders ?? []).map((order) => ({ at: String(order.updatedAt ?? order.createdAt ?? data?.asOf ?? ""), category: "Order", detail: `${String(order.side ?? "—").toUpperCase()} · ${money(order.filledQuantity ?? order.quantity)} units`, title: `${String(order.symbol ?? "—")} · ${String(order.status ?? "—")}` })),
    ...(data?.agents ?? []).flatMap((agent) => agent.runs.slice(0, 3).map((run) => ({ at: run.createdAt, category: "Agent", detail: run.task, title: `${agent.agentType} · ${run.status}` }))),
  ].filter((event) => Number.isFinite(Date.parse(event.at))).sort((left, right) => Date.parse(right.at) - Date.parse(left.at)).slice(0, 8);
  return <>
    <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
    <main className="telegram-mini-app">
      {unmanagedPositions.length ? <p className="mini-error">Review required: {unmanagedPositions.map((position) => `${position.symbol} (${position.missingFields.join(", ")})`).join("; ")}.</p> : null}
      <header><div><p className="eyebrow">MOMENTUM AUTOPILOT</p><h1>Paper trading</h1></div><div className="mini-header-actions"><button className="mini-refresh" onClick={() => setRefreshKey((key) => key + 1)} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh"}</button><span className="badge paper">PAPER</span></div></header>
      <section className="mini-live-dashboard" aria-label="Live dashboard">
        <div className="mini-live-heading"><div><span className="mini-live-dot" aria-hidden="true" /> <strong>{error ? "Connection needs attention" : freshness === "fresh" ? "Live reconciled view" : "Checking broker state"}</strong></div><span className="mini-countdown">Next refresh {secondsUntilRefresh}s</span></div>
        <div className="mini-live-grid">
          <div><span>Positions</span><strong>{data?.portfolio.positions.length ?? "—"}</strong></div>
          <div><span>Orders</span><strong>{data?.portfolio.orders.length ?? "—"}</strong></div>
          <div><span>Alerts</span><strong>{data?.alerts.length ?? "—"}</strong></div>
          <div><span>Last reconciled</span><strong>{data?.asOf ? formatDisplayTime(data.asOf) : "—"}</strong></div>
        </div>
      </section>
      <section className="mini-live-activity" aria-label="Live activity log">
        <div className="mini-live-section-heading"><div><p className="eyebrow">LIVE ACTIVITY</p><h2>System log</h2></div><span className="mini-countdown">Reconciled {data?.asOf ? formatDisplayTime(data.asOf) : "—"}</span></div>
        {liveActivity.length ? <div className="mini-live-log">{liveActivity.map((event, index) => <article key={`${event.category}-${event.at}-${index}`}><time>{formatDisplayTime(event.at)}</time><div><strong>{event.title}</strong><small>{event.detail}</small></div><span>{event.category}</span></article>)}</div> : <p className="mini-muted">No recent persisted activity.</p>}
      </section>
      <nav className="mini-tabs" aria-label="Mini App sections"><button className={tab === "portfolio" ? "active" : ""} onClick={() => setTab("portfolio")}>Portfolio</button><button className={tab === "trades" ? "active" : ""} onClick={() => setTab("trades")}>Trades</button><button className={tab === "alerts" ? "active" : ""} onClick={() => setTab("alerts")}>Alerts{data?.alerts.length ? ` (${data.alerts.length})` : ""}</button><button className={tab === "agents" ? "active" : ""} onClick={() => setTab("agents")}>Agents</button><button aria-pressed={tab === "overnight"} className={tab === "overnight" ? "active" : ""} onClick={() => setTab("overnight")}>Overnight</button></nav>
      {data && freshness !== "fresh" ? <p className="mini-error">Snapshot freshness: {freshness}. Verify the latest reconciliation before relying on values.</p> : null}
      {error ? <p className="mini-error">{error}</p> : tab === "overnight" ? <OvernightReports reports={data?.overnightReports ?? []} unavailable={data?.overnightReportsUnavailable ?? false} timezone={timezone} /> : tab === "portfolio" ? <section className="mini-section"><div className="mini-metrics"><div><span>Equity</span><strong>${money(snapshot.equity)}</strong></div><div><span>Cash</span><strong>${money(snapshot.cash)}</strong></div><div><span>Buying power</span><strong>${money(snapshot.buyingPower)}</strong></div><div><span>Day P/L</span><strong className={Number(metrics.dayPnl) < 0 ? "negative" : "positive"}>${money(metrics.dayPnl)}</strong></div><div><span>Unrealized P/L</span><strong className={Number(metrics.unrealizedPl) < 0 ? "negative" : "positive"}>${money(metrics.unrealizedPl)}</strong></div></div><h2>Open positions</h2>{data?.portfolio.positions.length ? <div className="mini-position-table-wrap"><table className="mini-position-table"><thead><tr><th>Stock</th><th>Current position</th><th>Entry price</th><th>Current price</th><th>P/L (USD)</th></tr></thead><tbody>{data.portfolio.positions.map((position) => <tr key={String(position.symbol)}><th scope="row">{String(position.symbol ?? "—")}</th><td>{money(position.quantity)}</td><td>${money(position.averageEntryPrice)}</td><td>${positionCurrentPrice(position)}</td><td className={Number(position.unrealizedPl) < 0 ? "negative" : "positive"}>${money(position.unrealizedPl)}</td></tr>)}</tbody></table></div> : <p className="mini-muted">No open positions.</p>}<h2>Recent orders</h2>{orders.length ? <div className="mini-list">{orders.slice(0, 20).map((order, index) => <article key={String(order.id ?? order.clientOrderId ?? `${order.symbol ?? "order"}-${index}`)}><div><strong>{String(order.symbol ?? "—")}</strong><small>{String(order.side ?? "—").toUpperCase()} · {String(order.status ?? "—")} · {money(order.filledQuantity ?? order.quantity)} units</small><small>{order.updatedAt ? formatDisplayTime(String(order.updatedAt), true) : "—"}</small></div></article>)}</div> : <p className="mini-muted">No recent orders.</p>}<p className="mini-foot">Updated {data?.asOf ? formatDisplayTime(data.asOf, true) : "—"}</p></section> : tab === "trades" ? <section className="mini-section"><h2>Trade journal</h2>{data?.tradeJournal?.length ? <div className="mini-list">{data.tradeJournal.map((trade) => <article key={trade.intentId}><div><strong>{trade.symbol} · {trade.status}</strong><small>Selected {formatDisplayTime(trade.selectedAt, true)} · Qty {money(trade.quantity)} · Entry {money(trade.entryPrice)}</small><small>Stop {money(trade.plannedStopPrice)} · Target {money(trade.plannedTargetPrice)}</small><small>Why: {trade.rationale}</small><small>Result: {trade.finalResult}</small></div></article>)}</div> : <p className="mini-muted">No executed trade journal entries.</p>}</section> : tab === "alerts" ? <section className="mini-section"><h2>Important alerts</h2>{data?.alerts.length ? <div className="mini-list">{data.alerts.map((alert) => <article key={alert.eventId}><div><strong className={alert.severity === "critical" ? "negative" : alert.severity === "warning" ? "warning" : ""}>{alert.code}</strong><small>{alert.message}</small><small>{formatDisplayTime(alert.occurredAt, true)} · {alert.deliveryStatus}</small></div></article>)}</div> : <p className="mini-muted">No alerts recorded.</p>}</section> : <section className="mini-section"><div className="mini-agent-toolbar"><h2>System agents</h2><input aria-label="Filter agents" value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)} placeholder="Filter agents" /></div>{(data?.agents ?? []).filter((agent) => !agentFilter || `${agent.agentType} ${agent.description}`.toLowerCase().includes(agentFilter.toLowerCase())).map((agent) => <article className="mini-agent" key={agent.agentType}><div><strong>{agent.agentType}</strong><small>{agent.description}</small></div><span>{agent.runs.length} runs</span>{agent.runs.slice(0, 3).map((run) => <small key={run.runId} className={run.status === "failed" ? "negative" : ""}>{formatDisplayTime(run.createdAt, true)} · {run.status} · {run.task}</small>)}</article>)}</section>}
      <p className="mini-foot">Read-only view. Orders and risk controls remain server-managed.</p>
    </main>
  </>;
}
