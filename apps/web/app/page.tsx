import { FOUNDATION_STATUS, OPERATING_MODES } from "@momentum/domain";

const boundaries = [
  ["Dashboard", "Vercel", "Scaffolded"],
  ["Authenticated API", "Railway", "Not provisioned"],
  ["Database", "Railway PostgreSQL", "Not provisioned"],
  ["Background worker", "Railway", "Scaffolded; inactive"],
] as const;

export default function Home() {
  return (
    <main>
      <header className="status-bar">
        <div className="brand">Momentum Autopilot</div>
        <div className="status-items" aria-label="System status">
          <span className="badge paper">Paper</span>
          <span className="badge neutral">Read-only foundation</span>
          <span className="badge neutral">No broker connection</span>
        </div>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Phase 0.1 · Source foundation</p>
        <h1 id="page-title">Safe boundaries before trading behavior.</h1>
        <p className="lede">
          The dashboard, API, worker, and shared contracts now have separate homes. No
          credentials, market data, database connection, or order capability exists in this
          build.
        </p>
      </section>

      <section className="grid" aria-label="Foundation status">
        <article className="card primary-card">
          <div className="card-heading">
            <div>
              <p className="label">Workspace state</p>
              <h2>{FOUNDATION_STATUS.label}</h2>
            </div>
            <span className="dot" aria-label="Healthy scaffold" />
          </div>
          <p>{FOUNDATION_STATUS.description}</p>
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
            Future Alpaca access belongs only in server-side Railway services and remains
            unavailable until the relevant paper-trading phases are implemented and verified.
          </p>
        </article>
      </section>
    </main>
  );
}
