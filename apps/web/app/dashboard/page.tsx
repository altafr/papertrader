import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { isAuthenticated, redirectToSignIn, userId } = await auth();
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
        <h1 id="dashboard-title">Authenticated operator shell.</h1>
        <p className="lede">
          You are authenticated as the configured operator. Broker account data remains unavailable
          until the read-only Alpaca adapter and reconciliation layer are implemented.
        </p>
      </section>
    </main>
  );
}
