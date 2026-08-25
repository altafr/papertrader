import { auth } from "@clerk/nextjs/server";

import { formatUtc } from "../../dashboard-state";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export default async function AgentDetailPage({ params }: { readonly params: Promise<{ readonly runId: string }> }) {
  const { isAuthenticated, getToken, redirectToSignIn } = await auth();
  if (!isAuthenticated) return redirectToSignIn();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const token = await getToken();
  const runId = (await params).runId;
  if (!apiBaseUrl || !token) return <main><section className="hero"><h1>Agent detail unavailable</h1><p>Authenticated API configuration is unavailable.</p></section></main>;
  const response = await fetch(`${apiBaseUrl}/v1/agent-runs/${encodeURIComponent(runId)}`, { cache: "no-store", headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) return <main><section className="hero"><a href="/dashboard">← Dashboard</a><h1>Agent detail unavailable</h1><p>The requested agent run could not be loaded.</p></section></main>;
  const body: unknown = await response.json();
  const run = isRecord(body) && isRecord(body.run) ? body.run : undefined;
  if (!run) return <main><section className="hero"><h1>Agent detail unavailable</h1><p>The response failed validation.</p></section></main>;
  const artifact = isRecord(run.artifact) ? run.artifact : undefined;
  const evidenceRefs = artifact?.evidenceRefs;
  return <main><section className="hero agent-detail-hero"><a href="/dashboard">← Dashboard</a><p className="eyebrow">Stored agent artifact</p><h1>{String(run.agentType ?? "Agent run")}</h1><p className="lede">{String(run.task ?? "")}</p><p className="provenance">Run {String(run.runId ?? runId)} · {String(run.status ?? "unknown")} · created {formatUtc(String(run.createdAt ?? ""))}</p></section><section className="grid agent-detail-grid"><article className="card"><p className="label">Rationale</p><h2>Stored explanation</h2><p>{artifact && typeof artifact.rationale === "string" ? artifact.rationale : "No stored rationale was attached to this run."}</p><p className="provenance">This is persisted structured output, not hidden chain-of-thought.</p></article><article className="card"><p className="label">Evidence</p><h2>{Array.isArray(evidenceRefs) ? evidenceRefs.length : 0} references</h2>{Array.isArray(evidenceRefs) && evidenceRefs.length ? <ul>{evidenceRefs.map((ref) => <li key={String(ref)}>{String(ref)}</li>)}</ul> : <p className="empty-state">No evidence references were attached.</p>}<p className="provenance">Confidence: {String(artifact?.confidence ?? "Not reported")} · schema: {String(artifact?.schemaVersion ?? "Not reported")}</p></article><article className="card full-width"><p className="label">Redacted artifact payload</p><h2>Structured evidence</h2><pre className="artifact-json">{JSON.stringify(artifact?.payload ?? {}, null, 2)}</pre></article></section></main>;
}
