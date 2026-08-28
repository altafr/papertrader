import { OPERATING_MODES } from "@momentum/domain";
import Link from "next/link";

type PublicHealth = {
  readonly status: string;
  readonly operatingMode?: string;
  readonly release?: string;
  readonly researchSchedule?: { readonly status?: string; readonly nextRunAt?: string };
  readonly positionManagement?: { readonly readiness?: string; readonly status?: string };
  readonly marketStream?: { readonly status?: string };
};

async function loadPublicHealth(): Promise<PublicHealth | undefined> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) return undefined;
  try {
    const response = await fetch(`${apiBaseUrl}/health`, { cache: "no-store", signal: AbortSignal.timeout(2500) });
    if (!response.ok) return undefined;
    const body: unknown = await response.json();
    if (typeof body !== "object" || body === null || Array.isArray(body)) return undefined;
    const value = body as Record<string, unknown>;
    return typeof value.status === "string" ? (value as PublicHealth) : undefined;
  } catch {
    return undefined;
  }
}

const boundaries = [
  ["Dashboard", "Vercel", "Deployed; authenticated"],
  ["Authenticated API", "Railway", "Healthy; protected"],
  ["Database", "Railway PostgreSQL", "Private; connected"],
  ["Background worker", "Railway", "Online; execution gated"],
] as const;

export default async function Home() {
  const health = await loadPublicHealth();
  const runtimeOnline = health?.status === "healthy";
  const mode = health?.operatingMode === "paper_autopilot" ? "Paper Autopilot" : health?.operatingMode ?? "Unavailable";
  return (
    <main>
      <header className="status-bar">
        <div className="brand">Momentum Autopilot</div>
        <div className="status-items" aria-label="System status">
          <span className="badge paper">Paper</span>
          <span className="badge neutral">{OPERATING_MODES.paperAutopilot}</span>
          <span className={`badge ${runtimeOnline ? "healthy" : "warning"}`}>{runtimeOnline ? "Worker online" : "Worker unavailable"}</span>
        </div>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Phase 6 · Hosted paper operations</p>
        <h1 id="page-title">Paper operations with explicit safety gates.</h1>
        <p className="lede">
          The dashboard, authenticated API, PostgreSQL read model, and background worker are
          deployed as separate services. The system is running in Paper Autopilot with continuous
          order submission enabled behind deterministic risk, freshness, reconciliation, and
          kill-switch gates.
        </p>
      </section>

      <section className="grid" aria-label="Foundation status">
        <article className="card full-width live-heartbeat" aria-label="Live worker heartbeat">
          <div className="card-heading">
            <div>
              <p className="label">Live server heartbeat</p>
              <h2>{runtimeOnline ? "Paper runtime is online" : "Runtime heartbeat unavailable"}</h2>
            </div>
            <span className={`state-badge ${runtimeOnline ? "fresh" : "degraded"}`}>{runtimeOnline ? "Healthy" : "Unavailable"}</span>
          </div>
          <div className="heartbeat-grid">
            <div><span className="label">Mode</span><strong>{mode}</strong></div>
            <div><span className="label">Research scheduler</span><strong>{health?.researchSchedule?.status ?? "Unavailable"}</strong></div>
            <div><span className="label">Position management</span><strong>{health?.positionManagement?.readiness ?? "Unavailable"}</strong></div>
            <div><span className="label">Crypto stream</span><strong>{health?.marketStream?.status ?? "Unavailable"}</strong></div>
          </div>
          <p className="provenance">Read-only status from Railway. No account data, credentials, or order controls are exposed here{health?.release ? ` · release ${health.release.slice(0, 12)}` : ""}.</p>
        </article>
        <article className="card primary-card">
          <div className="card-heading">
            <div>
              <p className="label">Workspace state</p>
                <h2>Paper foundation ready</h2>
            </div>
            <span className="dot" aria-label="Healthy scaffold" />
          </div>
          <p>Server-side paper infrastructure is available while broker reads, scheduling, and execution remain explicitly gated.</p>
          <dl className="facts">
            <div>
              <dt>Current mode</dt>
                <dd>{OPERATING_MODES.paperAutopilot}</dd>
            </div>
            <div>
              <dt>Order authority</dt>
                <dd>Continuous submission gated and enabled</dd>
            </div>
          </dl>
        </article>

        <article className="card">
          <p className="label">Deployment boundaries</p>
          <div className="boundary-list">
            {boundaries.map(([name, host, state]) => (
              <div className="boundary-row" key={name}>
                <div>
                  <strong>{name}</strong>
                  <span>{host}</span>
                </div>
                <span>{state}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="card full-width">
          <p className="label">Safety invariant</p>
          <h2>Browser code has no broker credentials or order authority.</h2>
          <p>
            Alpaca access belongs only in server-side Railway services. The public page is
            informational and cannot enable broker access, scheduling, risk approval, or orders.
          </p>
          <p>
            <Link href="/dashboard">Open authenticated dashboard</Link>
          </p>
        </article>
      </section>
    </main>
  );
}
