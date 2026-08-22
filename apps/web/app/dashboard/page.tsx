import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

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
  if (!isRecord(value) || !isRecord(value.model)) {
    return undefined;
  }
  const model = value.model;
  if (
    !Array.isArray(model.activities) ||
    !Array.isArray(model.orders) ||
    !Array.isArray(model.positions) ||
    !isRecord(model.snapshot) ||
    !isRecord(model.freshness) ||
    typeof model.freshness.ageSeconds !== "number" ||
    typeof model.freshness.capturedAt !== "string"
  ) {
    return undefined;
  }
  return {
    activities: model.activities.filter(isRecord),
    freshness: {
      ageSeconds: model.freshness.ageSeconds,
      capturedAt: model.freshness.capturedAt,
    },
    orders: model.orders.filter(isRecord),
    positions: model.positions.filter(isRecord),
    snapshot: model.snapshot,
  };
}

async function loadReadModel(getToken: () => Promise<string | null>) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    return { kind: "unavailable", message: "API URL is not configured." } as const;
  }
  const token = await getToken();
  if (!token) {
    return { kind: "unavailable", message: "Authenticated API session is unavailable." } as const;
  }
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

function value(row: Record<string, unknown>, key: string) {
  const result = row[key];
  return typeof result === "string" || typeof result === "number" ? String(result) : "—";
}

export default async function DashboardPage() {
  const { isAuthenticated, redirectToSignIn, userId, getToken } = await auth();
  if (!isAuthenticated) {
    return redirectToSignIn();
  }

  const operatorUserId = process.env.CLERK_OPERATOR_USER_ID;
  if (!operatorUserId || userId !== operatorUserId) {
    return (
      <main>
        <h1>Access denied</h1>
        <p>This account is not the configured single operator.</p>
      </main>
    );
  }

  const result = await loadReadModel(getToken);
  return (
    <main>
      <header className="status-bar">
        <div className="brand">Momentum Autopilot</div>
        <div className="status-items" aria-label="Authenticated status">
          <span className="badge paper">Paper</span>
          <span className="badge neutral">Read-only</span>
          <UserButton />
        </div>
      </header>
      <section className="hero" aria-labelledby="dashboard-title">
        <p className="eyebrow">Phase 1 · Trusted read-only foundation</p>
        <h1 id="dashboard-title">Operator dashboard.</h1>
        <p className="lede">
          Paper mode is active. This surface reads persisted reconciliation data only; it cannot
          submit orders or change risk controls.
        </p>
      </section>
      {result.kind === "unavailable" ? (
        <section className="grid" aria-label="Read model status">
          <article className="card full-width">
            <p className="label">Read model unavailable</p>
            <h2>Waiting for the first safe reconciliation.</h2>
            <p>{result.message}</p>
          </article>
        </section>
      ) : (
        <section className="grid" aria-label="Paper account read model">
          <article className="card primary-card">
            <p className="label">Account snapshot</p>
            <h2>{value(result.model.snapshot, "currency")} account</h2>
            <dl className="facts">
              <div><dt>Equity</dt><dd>{value(result.model.snapshot, "equity")}</dd></div>
              <div><dt>Cash</dt><dd>{value(result.model.snapshot, "cash")}</dd></div>
              <div><dt>Buying power</dt><dd>{value(result.model.snapshot, "buyingPower")}</dd></div>
              <div><dt>Status</dt><dd>{value(result.model.snapshot, "status")}</dd></div>
            </dl>
          </article>
          <article className="card">
            <p className="label">Freshness</p>
            <h2>{result.model.freshness.ageSeconds}s old</h2>
            <p>Captured {result.model.freshness.capturedAt}</p>
            <p>Broker mode: paper · order authority: disabled</p>
          </article>
          <article className="card full-width">
            <p className="label">Positions ({result.model.positions.length})</p>
            <div className="data-list">
              {result.model.positions.length === 0 ? <p>No open positions.</p> : result.model.positions.map((position) => (
                <div className="data-row" key={`${value(position, "symbol")}-${value(position, "accountSnapshotId")}`}>
                  <strong>{value(position, "symbol")}</strong>
                  <span>{value(position, "quantity")} · market value {value(position, "marketValue")}</span>
                </div>
              ))}
            </div>
          </article>
          <article className="card">
            <p className="label">Orders ({result.model.orders.length})</p>
            <div className="data-list">
              {result.model.orders.slice(0, 10).map((order) => (
                <div className="data-row" key={value(order, "alpacaOrderId")}>
                  <strong>{value(order, "symbol")}</strong>
                  <span>{value(order, "side")} · {value(order, "status")}</span>
                </div>
              ))}
              {result.model.orders.length === 0 && <p>No orders recorded.</p>}
            </div>
          </article>
          <article className="card">
            <p className="label">Activities ({result.model.activities.length})</p>
            <div className="data-list">
              {result.model.activities.slice(0, 10).map((activity) => (
                <div className="data-row" key={value(activity, "activityId")}>
                  <strong>{value(activity, "activityType")}</strong>
                  <span>{value(activity, "symbol")} · {value(activity, "quantity")}</span>
                </div>
              ))}
              {result.model.activities.length === 0 && <p>No activities recorded.</p>}
            </div>
          </article>
        </section>
      )}
    </main>
  );
}
