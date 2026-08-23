export interface ResearchRunVerificationInput {
  readonly agentType: string;
  readonly artifactType?: string | null;
  readonly inputRefs: readonly string[];
  readonly runId: string;
  readonly status: string;
}

export interface ResearchRunVerificationResult {
  readonly agentType: "crypto_research" | "stock_research";
  readonly approvalReferencePresent: true;
  readonly artifactPresent: boolean;
  readonly runId: string;
  readonly status: "succeeded";
}

export function verifyResearchRun(input: ResearchRunVerificationInput, approvalReference: string): ResearchRunVerificationResult {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(approvalReference)) throw new Error("Approval reference is invalid.");
  if (input.status !== "succeeded") throw new Error("Research run did not succeed.");
  if (input.agentType !== "stock_research" && input.agentType !== "crypto_research") throw new Error("Research run type is unsupported.");
  if (!input.inputRefs.includes(`operator-approval:${approvalReference}`)) throw new Error("Research run approval provenance is missing.");
  if (!input.artifactType) throw new Error("Research run artifact is missing.");
  return { agentType: input.agentType, approvalReferencePresent: true, artifactPresent: true, runId: input.runId, status: "succeeded" };
}
