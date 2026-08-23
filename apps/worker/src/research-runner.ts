import type { AgentArtifact, AgentHandler, AgentRunRequest } from "@momentum/domain";

export interface ResearchRunPersistence {
  enqueue(request: AgentRunRequest): Promise<unknown>;
  fail(runId: string, finishedAt: Date, errorCode: string): Promise<unknown>;
  start(runId: string, startedAt: Date): Promise<unknown>;
  succeed(runId: string, finishedAt: Date, artifact: {
    readonly artifactConfidence: string;
    readonly artifactEvidenceRefs: readonly string[];
    readonly artifactPayload: Readonly<Record<string, unknown>>;
    readonly artifactRationale: string;
    readonly artifactSchemaVersion: string;
    readonly artifactType: string;
  }): Promise<unknown>;
}

export async function executeResearchRun(input: {
  readonly clock?: () => Date;
  readonly handler: AgentHandler;
  readonly persistence: ResearchRunPersistence;
  readonly request: AgentRunRequest;
}): Promise<{ readonly artifact?: AgentArtifact; readonly status: "failed" | "succeeded" }> {
  const clock = input.clock ?? (() => new Date());
  await input.persistence.enqueue(input.request);
  await input.persistence.start(input.request.runId, clock());
  try {
    const artifact = await input.handler({ inputRefs: input.request.inputRefs, runId: input.request.runId, task: input.request.task });
    await input.persistence.succeed(input.request.runId, clock(), {
      artifactConfidence: artifact.confidence,
      artifactEvidenceRefs: artifact.evidenceRefs,
      artifactPayload: artifact.payload,
      artifactRationale: artifact.rationale,
      artifactSchemaVersion: artifact.schemaVersion,
      artifactType: artifact.artifactType,
    });
    return { artifact, status: "succeeded" };
  } catch {
    await input.persistence.fail(input.request.runId, clock(), "research_handler_failed");
    return { status: "failed" };
  }
}
