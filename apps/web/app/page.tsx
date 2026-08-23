import { OPERATING_MODES } from "@momentum/domain";
import Link from "next/link";

const boundaries = [
  ["Dashboard", "Vercel", "Deployed; authenticated"],
  ["Authenticated API", "Railway", "Healthy; protected"],
  ["Database", "Railway PostgreSQL", "Private; connected"],
  ["Background worker", "Railway", "Online; execution gated"],
] as const;

export default function Home() {
  return (
    <main>
      <header className="status-bar">
        <div className="brand">Momentum Autopilot</div>
        <div className="status-items" aria-label="System status">
          <span className="badge paper">Paper</span>
          <span className="badge neutral">{OPERATING_MODES.observe}</span>
          <span className="badge neutral">Broker access gated</span>
        </div>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Phase 6.21 · Paper operations foundation</p>
        <h1 id="page-title">Paper operations with explicit safety gates.</h1>
        <p className="lede">
          The dashboard, authenticated API, PostgreSQL read model, and background worker are
          deployed as separate services. The system is in Observe mode; order authority remains
          disabled until every deterministic paper gate is satisfied.
        </p>
      </section>

      <section className="grid" aria-label="Foundation status">
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
              <dd>{OPERATING_MODES.observe}</dd>
            </div>
            <div>
              <dt>Order authority</dt>
              <dd>Disabled</dd>
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
