export interface AgentRunDetailSource {
  readonly agentType: string;
  readonly artifactConfidence: string | null;
  readonly artifactEvidenceRefs: readonly string[] | null;
  readonly artifactPayload: Readonly<Record<string, unknown>> | null;
  readonly artifactRationale: string | null;
  readonly artifactSchemaVersion: string | null;
  readonly artifactType: string | null;
  readonly createdAt: Date;
  readonly errorCode: string | null;
  readonly finishedAt: Date | null;
  readonly inputRefs: readonly string[];
  readonly modelProvider: string | null;
  readonly promptVersion: string;
  readonly runId: string;
  readonly startedAt: Date | null;
  readonly status: string;
  readonly task: string;
}

const secretKeyPattern = /(secret|password|credential|token|authorization|api[_-]?key)/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[redacted:depth]";
  if (typeof value === "string") return value.length > 5_000 ? `${value.slice(0, 5_000)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 100).map((entry) => redact(entry, depth + 1));
  if (!value || typeof value !== "object") return value;
  const entries = Object.entries(value).slice(0, 100).map(([key, entry]) => [key, secretKeyPattern.test(key) ? "[redacted]" : redact(entry, depth + 1)] as const);
  return Object.fromEntries(entries);
}

export function toAgentRunDetail(source: AgentRunDetailSource) {
  const artifact = source.artifactType && source.artifactRationale ? {
    confidence: source.artifactConfidence,
    evidenceRefs: source.artifactEvidenceRefs,
    payload: redact(source.artifactPayload),
    rationale: source.artifactRationale.slice(0, 2_000),
    schemaVersion: source.artifactSchemaVersion,
    type: source.artifactType,
  } : undefined;
  return {
    agentType: source.agentType,
    ...(artifact ? { artifact } : {}),
    createdAt: source.createdAt,
    ...(source.errorCode ? { errorCode: source.errorCode } : {}),
    ...(source.finishedAt ? { finishedAt: source.finishedAt } : {}),
    inputRefs: source.inputRefs.slice(0, 100),
    ...(source.modelProvider ? { modelProvider: source.modelProvider } : {}),
    promptVersion: source.promptVersion,
    runId: source.runId,
    ...(source.startedAt ? { startedAt: source.startedAt } : {}),
    status: source.status,
    task: source.task,
  };
}
