"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

type MiniAppData = {
  readonly asOf: string;
  readonly portfolio: { readonly metrics?: { readonly dayPnl?: string; readonly unrealizedPl?: string }; readonly snapshot: Record<string, unknown>; readonly positions: readonly Record<string, unknown>[]; readonly orders: readonly Record<string, unknown>[] };
  readonly alerts: readonly { readonly code: string; readonly deliveryStatus: string; readonly eventId: string; readonly message: string; readonly occurredAt: string; readonly severity: string }[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

export const isMiniAppData = (value: unknown): value is MiniAppData => {
  if (!isRecord(value) || typeof value.asOf !== "string" || !isRecord(value.portfolio) || !Array.isArray(value.portfolio.positions) || !Array.isArray(value.portfolio.orders) || !Array.isArray(value.alerts)) return false;
  if (!isRecord(value.portfolio.snapshot)) return false;
  if (value.portfolio.metrics !== undefined && !isRecord(value.portfolio.metrics)) return false;
  return value.alerts.every((alert) => isRecord(alert) && typeof alert.code === "string" && typeof alert.deliveryStatus === "string" && typeof alert.eventId === "string" && typeof alert.message === "string" && typeof alert.occurredAt === "string" && typeof alert.severity === "string");
};

declare global { interface Window { Telegram?: { WebApp?: { readonly initData?: string; ready: () => void; expand: () => void } } } }

const money = (value: unknown): string => {
  if (typeof value !== "string" && typeof value !== "number") return "—";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "—";
};

export const getMiniAppErrorMessage = (status: number, code: unknown): string => {
  if (status === 503 || code === "telegram_mini_app_disabled") return "The Telegram Mini App is not enabled on the trading API yet. Add the API Telegram variables, then redeploy.";
  if (status === 401 || code === "unauthorized") return "This Telegram account is not authorized for the paper portfolio.";
  if (status === 404 || code === "read_model_not_available") return "The paper portfolio has not produced a reconciled snapshot yet.";
  return typeof code === "string" && code.length > 0 ? `The paper portfolio is unavailable (${code}).` : "The paper portfolio is unavailable.";
};

export default function TelegramMiniAppPage() {
  const [tab, setTab] = useState<"portfolio" | "alerts">("portfolio");
  const [data, setData] = useState<MiniAppData>();
  const [error, setError] = useState("Connecting to the paper portfolio…");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
        const response = await fetch(`${apiBaseUrl}/v1/telegram-mini-app`, { headers: { "x-telegram-init-data": initData }, signal: controller.signal });
        const body: unknown = await response.json();
        if (!active || controller.signal.aborted) return;
        if (!response.ok || !isMiniAppData(body)) { setError(getMiniAppErrorMessage(response.status, isRecord(body) ? body.error : undefined)); return; }
        setData(body); setError("");
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) setError("Could not reach the paper portfolio service.");
      } finally {
        if (active && inFlight === controller) { inFlight = undefined; setRefreshing(false); }
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => { active = false; inFlight?.abort(); window.clearInterval(timer); };
  }, [refreshKey]);

  const snapshot = data?.portfolio.snapshot ?? {};
  const metrics = data?.portfolio.metrics ?? {};
  const orders = data?.portfolio.orders ?? [];
  return <>
    <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
    <main className="telegram-mini-app">
      <header><div><p className="eyebrow">MOMENTUM AUTOPILOT</p><h1>Paper trading</h1></div><div className="mini-header-actions"><button className="mini-refresh" onClick={() => setRefreshKey((key) => key + 1)} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh"}</button><span className="badge paper">PAPER</span></div></header>
      <nav className="mini-tabs" aria-label="Mini App sections"><button className={tab === "portfolio" ? "active" : ""} onClick={() => setTab("portfolio")}>Portfolio</button><button className={tab === "alerts" ? "active" : ""} onClick={() => setTab("alerts")}>Alerts{data?.alerts.length ? ` (${data.alerts.length})` : ""}</button></nav>
      {error ? <p className="mini-error">{error}</p> : tab === "portfolio" ? <section className="mini-section"><div className="mini-metrics"><div><span>Equity</span><strong>${money(snapshot.equity)}</strong></div><div><span>Cash</span><strong>${money(snapshot.cash)}</strong></div><div><span>Buying power</span><strong>${money(snapshot.buyingPower)}</strong></div><div><span>Day P/L</span><strong className={Number(metrics.dayPnl) < 0 ? "negative" : "positive"}>${money(metrics.dayPnl)}</strong></div><div><span>Unrealized P/L</span><strong className={Number(metrics.unrealizedPl) < 0 ? "negative" : "positive"}>${money(metrics.unrealizedPl)}</strong></div></div><h2>Open positions</h2>{data?.portfolio.positions.length ? <div className="mini-list">{data.portfolio.positions.map((position) => <article key={String(position.symbol)}><div><strong>{String(position.symbol ?? "—")}</strong><small>{money(position.quantity)} units · value ${money(position.marketValue)}</small></div><span className={Number(position.unrealizedPl) < 0 ? "negative" : "positive"}>{money(position.unrealizedPl)}</span></article>)}</div> : <p className="mini-muted">No open positions.</p>}<h2>Recent orders</h2>{orders.length ? <div className="mini-list">{orders.slice(0, 20).map((order, index) => <article key={String(order.id ?? order.clientOrderId ?? `${order.symbol ?? "order"}-${index}`)}><div><strong>{String(order.symbol ?? "—")}</strong><small>{String(order.side ?? "—").toUpperCase()} · {String(order.status ?? "—")} · {money(order.filledQuantity ?? order.quantity)} units</small><small>{order.updatedAt ? new Date(String(order.updatedAt)).toLocaleString() : "—"}</small></div></article>)}</div> : <p className="mini-muted">No recent orders.</p>}<p className="mini-foot">Updated {data?.asOf ? new Date(data.asOf).toLocaleString() : "—"}</p></section> : <section className="mini-section"><h2>Important alerts</h2>{data?.alerts.length ? <div className="mini-list">{data.alerts.map((alert) => <article key={alert.eventId}><div><strong className={alert.severity === "critical" ? "negative" : alert.severity === "warning" ? "warning" : ""}>{alert.code}</strong><small>{alert.message}</small><small>{new Date(alert.occurredAt).toLocaleString()} · {alert.deliveryStatus}</small></div></article>)}</div> : <p className="mini-muted">No alerts recorded.</p>}</section>}
      <p className="mini-foot">Read-only view. Orders and risk controls remain server-managed.</p>
    </main>
  </>;
}
