export interface DurableOneRunAuditReference {
  readonly approvalReference: string;
  readonly runId: string;
}

export interface DurableOneRunRetryReadiness {
  readonly approvalReferencePresent: boolean;
  readonly runIdPresent: boolean;
  readonly existingApprovalReference: boolean;
  readonly existingRunId: boolean;
  readonly status: "blocked" | "ready";
  readonly blockedReasons: readonly string[];
}

const boundedReference = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const boundedRunId = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function assessDurableOneRunRetryReadiness(input: {
  readonly approvalReference?: string;
  readonly runId?: string;
  readonly existingAudits?: readonly DurableOneRunAuditReference[];
}): DurableOneRunRetryReadiness {
  const approvalReference = input.approvalReference?.trim() ?? "";
  const runId = input.runId?.trim() ?? "";
  const approvalReferencePresent = boundedReference.test(approvalReference);
  const runIdPresent = boundedRunId.test(runId);
  const existingAudits = input.existingAudits ?? [];
  const existingApprovalReference = approvalReferencePresent && existingAudits.some((audit) => audit.approvalReference === approvalReference);
  const existingRunId = runIdPresent && existingAudits.some((audit) => audit.runId === runId);
  const blockedReasons = [
    ...(approvalReferencePresent ? [] : ["approval_reference_missing_or_invalid"]),
    ...(runIdPresent ? [] : ["run_id_missing_or_invalid"]),
    ...(existingApprovalReference ? ["approval_reference_already_used"] : []),
    ...(existingRunId ? ["run_id_already_used"] : []),
    ...(approvalReferencePresent && runIdPresent && approvalReference === runId ? ["approval_reference_and_run_id_must_differ"] : []),
  ];
  return {
    approvalReferencePresent,
    runIdPresent,
    existingApprovalReference,
    existingRunId,
    status: blockedReasons.length === 0 ? "ready" : "blocked",
    blockedReasons,
  };
}
