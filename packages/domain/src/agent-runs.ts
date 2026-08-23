export const AGENT_TYPES = {
  cryptoResearch: "crypto_research",
  execution: "execution",
  macroAdvisory: "macro_advisory",
  monitoringReconciliation: "monitoring_reconciliation",
  orchestrator: "orchestrator",
  riskExplainer: "risk_explainer",
  stockResearch: "stock_research",
  strategy: "strategy",
} as const;

export type AgentType = (typeof AGENT_TYPES)[keyof typeof AGENT_TYPES];
export type AgentRunStatus = "failed" | "queued" | "running" | "succeeded";
export type AgentConfidence = "high" | "low" | "medium" | "not_calibrated";

export interface AgentArtifact {
  readonly artifactType: string;
  readonly confidence: AgentConfidence;
  readonly evidenceRefs: readonly string[];
  readonly payload: Readonly<Record<string, unknown>>;
  readonly rationale: string;
  readonly schemaVersion: "1";
}

export interface AgentRunRequest {
  readonly agentType: AgentType;
  readonly createdAt: string;
  readonly inputRefs: readonly string[];
  readonly modelProvider?: string;
  readonly promptVersion: string;
  readonly runId: string;
  readonly task: string;
}

export interface AgentRunRecord {
  readonly agentType: AgentType;
  readonly artifact?: AgentArtifact;
  readonly createdAt: string;
  readonly errorCode?: string;
  readonly finishedAt?: string;
  readonly inputRefs: readonly string[];
  readonly modelProvider?: string;
  readonly promptVersion: string;
  readonly runId: string;
  readonly startedAt?: string;
  readonly status: AgentRunStatus;
  readonly task: string;
}

export interface AgentHandlerContext {
  readonly inputRefs: readonly string[];
  readonly runId: string;
  readonly task: string;
}

export type AgentHandler = (context: AgentHandlerContext) => AgentArtifact | Promise<AgentArtifact>;

function immutable<T extends object>(value: T): T {
  return Object.freeze(value);
}

function assertTimestamp(value: string, label: string): void {
  if (!value || Number.isNaN(Date.parse(value))) throw new Error(`${label} requires a valid timestamp.`);
}

function assertNonEmpty(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} must not be blank.`);
}

function validateArtifact(artifact: AgentArtifact): AgentArtifact {
  if (artifact.schemaVersion !== "1") throw new Error("Agent artifact schema version is unsupported.");
  assertNonEmpty(artifact.artifactType, "Agent artifact type");
  assertNonEmpty(artifact.rationale, "Agent artifact rationale");
  if (artifact.rationale.length > 2_000) throw new Error("Agent artifact rationale is too long.");
  if (!Array.isArray(artifact.evidenceRefs) || artifact.evidenceRefs.some((ref) => !ref.trim())) throw new Error("Agent artifact evidence references must be non-empty.");
  if (artifact.payload === null || typeof artifact.payload !== "object" || Array.isArray(artifact.payload)) throw new Error("Agent artifact payload must be an object.");
  return immutable({ ...artifact, evidenceRefs: Object.freeze([...artifact.evidenceRefs]) });
}

function validateRequest(request: AgentRunRequest): AgentRunRequest {
  assertNonEmpty(request.runId, "Agent run ID");
  assertNonEmpty(request.task, "Agent task");
  assertNonEmpty(request.promptVersion, "Agent prompt version");
  assertTimestamp(request.createdAt, "Agent run creation time");
  if (!Array.isArray(request.inputRefs) || request.inputRefs.some((ref) => !ref.trim())) throw new Error("Agent input references must be non-empty.");
  return immutable({ ...request, inputRefs: Object.freeze([...request.inputRefs]) });
}

export function createAgentRunStore() {
  const records = new Map<string, AgentRunRecord>();

  return {
    get(runId: string): AgentRunRecord | undefined {
      return records.get(runId);
    },
    list(): readonly AgentRunRecord[] {
      return Object.freeze([...records.values()]);
    },
    enqueue(rawRequest: AgentRunRequest): AgentRunRecord {
      const request = validateRequest(rawRequest);
      if (records.has(request.runId)) throw new Error("Agent run ID already exists.");
      const record = immutable({ ...request, status: "queued" as const });
      records.set(request.runId, record);
      return record;
    },
    start(runId: string, startedAt: string): AgentRunRecord {
      const current = records.get(runId);
      if (!current) throw new Error("Agent run does not exist.");
      if (current.status !== "queued") throw new Error("Only queued agent runs can start.");
      assertTimestamp(startedAt, "Agent run start time");
      if (Date.parse(startedAt) < Date.parse(current.createdAt)) throw new Error("Agent run cannot start before it was created.");
      const next = immutable({ ...current, startedAt, status: "running" as const });
      records.set(runId, next);
      return next;
    },
    succeed(runId: string, finishedAt: string, artifact: AgentArtifact): AgentRunRecord {
      const current = records.get(runId);
      if (!current) throw new Error("Agent run does not exist.");
      if (current.status !== "running") throw new Error("Only running agent runs can succeed.");
      assertTimestamp(finishedAt, "Agent run finish time");
      if (!current.startedAt || Date.parse(finishedAt) < Date.parse(current.startedAt)) throw new Error("Agent run cannot finish before it started.");
      const next = immutable({ ...current, artifact: validateArtifact(artifact), finishedAt, status: "succeeded" as const });
      records.set(runId, next);
      return next;
    },
    fail(runId: string, finishedAt: string, errorCode: string): AgentRunRecord {
      const current = records.get(runId);
      if (!current) throw new Error("Agent run does not exist.");
      if (current.status !== "running") throw new Error("Only running agent runs can fail.");
      assertTimestamp(finishedAt, "Agent run finish time");
      assertNonEmpty(errorCode, "Agent run error code");
      if (!current.startedAt || Date.parse(finishedAt) < Date.parse(current.startedAt)) throw new Error("Agent run cannot finish before it started.");
      const next = immutable({ ...current, errorCode: errorCode.trim(), finishedAt, status: "failed" as const });
      records.set(runId, next);
      return next;
    },
  };
}

export function createAgentOrchestrator(input: {
  readonly clock?: () => string;
  readonly handlers: Readonly<Partial<Record<AgentType, AgentHandler>>>;
  readonly store?: ReturnType<typeof createAgentRunStore>;
}) {
  const clock = input.clock ?? (() => new Date().toISOString());
  const store = input.store ?? createAgentRunStore();

  return {
    store,
    async dispatch(request: AgentRunRequest): Promise<AgentRunRecord> {
      const handler = input.handlers[request.agentType];
      if (!handler) throw new Error("No handler is registered for this agent type.");
      store.enqueue(request);
      store.start(request.runId, clock());
      try {
        const artifact = await handler({ inputRefs: request.inputRefs, runId: request.runId, task: request.task });
        return store.succeed(request.runId, clock(), artifact);
      } catch {
        return store.fail(request.runId, clock(), "agent_handler_failed");
      }
    },
  };
}
