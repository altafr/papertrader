export type FreshnessState = "delayed" | "fresh" | "stale";
export type MigrationBlockedReason = "audit_columns_missing" | "audit_table_missing" | "migration_not_recorded";
export type ResearchScheduleStatus = "blocked" | "disabled" | "ready";
export type TelegramAlertReadinessStatus = "blocked" | "disabled" | "ready";
export type TelegramAlertTestStatus = "blocked" | "ready";

export type OperationsHealth = {
  readonly reconciliation: {
    readonly ageSeconds?: number;
    readonly capturedAt?: string;
    readonly status: "delayed" | "fresh" | "stale" | "unavailable";
  };
  readonly runtime: {
    readonly brokerConnectionEnabled: boolean;
    readonly dailyPreparationHandlerEnabled: boolean;
    readonly globalKillSwitchActive: boolean;
    readonly operatingMode: "observe" | "recommend" | "paper_autopilot";
    readonly paperAutopilotEnabled: boolean;
    readonly migration: { readonly blockedReasons: readonly MigrationBlockedReason[]; readonly status: "blocked" | "ready" };
    readonly riskPolicy: {
      readonly initialEquityBaseline: string;
      readonly maxSingleTradeRiskPercent: string;
      readonly maxSingleTradeRiskUsd: string;
    };
    readonly researchSchedule: { readonly enabled: boolean; readonly handlerEnabled: boolean; readonly status: ResearchScheduleStatus };
    readonly scheduler: { readonly activationApprovalReferencePresent: boolean; readonly cron: string; readonly enabled: boolean; readonly status: "blocked" | "disabled" | "ready"; readonly timezone: "UTC" };
    readonly telegramAlerts: { readonly deliveryVerification: "unverified"; readonly enabled: boolean; readonly status: TelegramAlertReadinessStatus };
    readonly telegramAlertTest: { readonly approvalReferencePresent: boolean; readonly status: TelegramAlertTestStatus };
  };
};

export type AgentRunSummary = {
  readonly agentType: string;
  readonly artifact?: {
    readonly confidence?: string;
    readonly evidenceRefs?: readonly string[];
    readonly schemaVersion?: string;
    readonly type?: string;
  };
  readonly createdAt: string;
  readonly errorCode?: string;
  readonly finishedAt?: string;
  readonly inputRefs: readonly string[];
  readonly modelProvider?: string;
  readonly promptVersion: string;
  readonly runId: string;
  readonly startedAt?: string;
  readonly status: "failed" | "queued" | "running" | "succeeded";
  readonly task: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseOperationsHealth(value: unknown): OperationsHealth | undefined {
  if (!isRecord(value) || !isRecord(value.reconciliation) || !isRecord(value.runtime)) return undefined;
  const reconciliation = value.reconciliation;
  const runtime = value.runtime;
  if (!isRecord(runtime.scheduler)) return undefined;
  if (!isRecord(runtime.researchSchedule)) return undefined;
  if (!isRecord(runtime.telegramAlerts)) return undefined;
  if (!isRecord(runtime.telegramAlertTest)) return undefined;
  if (!isRecord(runtime.migration) || !Array.isArray(runtime.migration.blockedReasons) || runtime.migration.blockedReasons.some((reason) => !( ["audit_columns_missing", "audit_table_missing", "migration_not_recorded"] as const).includes(reason as MigrationBlockedReason))) return undefined;
  const scheduler = runtime.scheduler;
  const researchSchedule = runtime.researchSchedule;
  const telegramAlerts = runtime.telegramAlerts;
  const telegramAlertTest = runtime.telegramAlertTest;
  if (!isRecord(runtime.riskPolicy)) return undefined;
  const riskPolicy = runtime.riskPolicy;
  if (!(["delayed", "fresh", "stale", "unavailable"] as const).includes(reconciliation.status as OperationsHealth["reconciliation"]["status"])) return undefined;
  if (!(["blocked", "disabled", "ready"] as const).includes(scheduler.status as OperationsHealth["runtime"]["scheduler"]["status"])) return undefined;
  if (!( ["observe", "recommend", "paper_autopilot"] as const).includes(runtime.operatingMode as OperationsHealth["runtime"]["operatingMode"])) return undefined;
  if (!( ["blocked", "disabled", "ready"] as const).includes(researchSchedule.status as ResearchScheduleStatus)) return undefined;
  if (!( ["blocked", "disabled", "ready"] as const).includes(telegramAlerts.status as TelegramAlertReadinessStatus)) return undefined;
  if (telegramAlerts.deliveryVerification !== "unverified") return undefined;
  if (!( ["blocked", "ready"] as const).includes(telegramAlertTest.status as TelegramAlertTestStatus)) return undefined;
  if (typeof scheduler.activationApprovalReferencePresent !== "boolean" || typeof scheduler.cron !== "string" || scheduler.cron.trim().length === 0 || scheduler.cron.length > 120 || typeof scheduler.enabled !== "boolean" || scheduler.timezone !== "UTC" || typeof researchSchedule.enabled !== "boolean" || typeof researchSchedule.handlerEnabled !== "boolean" || typeof telegramAlerts.enabled !== "boolean" || typeof telegramAlertTest.approvalReferencePresent !== "boolean" || typeof runtime.brokerConnectionEnabled !== "boolean" || typeof runtime.dailyPreparationHandlerEnabled !== "boolean" || typeof runtime.globalKillSwitchActive !== "boolean" || typeof runtime.paperAutopilotEnabled !== "boolean") return undefined;
  if (!(runtime.migration.status === "blocked" || runtime.migration.status === "ready")) return undefined;
  if (typeof riskPolicy.initialEquityBaseline !== "string" || typeof riskPolicy.maxSingleTradeRiskPercent !== "string" || typeof riskPolicy.maxSingleTradeRiskUsd !== "string") return undefined;
  if (reconciliation.ageSeconds !== undefined && typeof reconciliation.ageSeconds !== "number") return undefined;
  if (reconciliation.capturedAt !== undefined && typeof reconciliation.capturedAt !== "string") return undefined;
  return {
    reconciliation: {
      ...(reconciliation.ageSeconds !== undefined ? { ageSeconds: reconciliation.ageSeconds } : {}),
      ...(reconciliation.capturedAt !== undefined ? { capturedAt: reconciliation.capturedAt } : {}),
      status: reconciliation.status as OperationsHealth["reconciliation"]["status"],
    },
    runtime: {
      brokerConnectionEnabled: runtime.brokerConnectionEnabled,
      dailyPreparationHandlerEnabled: runtime.dailyPreparationHandlerEnabled,
      globalKillSwitchActive: runtime.globalKillSwitchActive,
      operatingMode: runtime.operatingMode as OperationsHealth["runtime"]["operatingMode"],
      paperAutopilotEnabled: runtime.paperAutopilotEnabled,
      migration: { blockedReasons: runtime.migration.blockedReasons as readonly MigrationBlockedReason[], status: runtime.migration.status },
      riskPolicy: {
        initialEquityBaseline: riskPolicy.initialEquityBaseline,
        maxSingleTradeRiskPercent: riskPolicy.maxSingleTradeRiskPercent,
        maxSingleTradeRiskUsd: riskPolicy.maxSingleTradeRiskUsd,
      },
      researchSchedule: { enabled: researchSchedule.enabled, handlerEnabled: researchSchedule.handlerEnabled, status: researchSchedule.status as ResearchScheduleStatus },
      scheduler: { activationApprovalReferencePresent: scheduler.activationApprovalReferencePresent, cron: scheduler.cron, enabled: scheduler.enabled, status: scheduler.status as OperationsHealth["runtime"]["scheduler"]["status"], timezone: "UTC" },
      telegramAlerts: { deliveryVerification: "unverified", enabled: telegramAlerts.enabled, status: telegramAlerts.status as TelegramAlertReadinessStatus },
      telegramAlertTest: { approvalReferencePresent: telegramAlertTest.approvalReferencePresent, status: telegramAlertTest.status as TelegramAlertTestStatus },
    },
  };
}

export function parseAgentRuns(value: unknown): readonly AgentRunSummary[] | undefined {
  if (!isRecord(value) || !Array.isArray(value.runs)) return undefined;
  const parsed: AgentRunSummary[] = [];
  for (const candidate of value.runs) {
    if (!isRecord(candidate) || typeof candidate.agentType !== "string" || typeof candidate.createdAt !== "string" || typeof candidate.promptVersion !== "string" || typeof candidate.runId !== "string" || typeof candidate.task !== "string" || !Array.isArray(candidate.inputRefs) || candidate.inputRefs.some((ref) => typeof ref !== "string")) return undefined;
    if (!( ["failed", "queued", "running", "succeeded"] as const).includes(candidate.status as AgentRunSummary["status"])) return undefined;
    if (candidate.artifact !== undefined) {
      if (!isRecord(candidate.artifact)) return undefined;
      for (const key of ["confidence", "schemaVersion", "type"] as const) if (candidate.artifact[key] !== undefined && typeof candidate.artifact[key] !== "string") return undefined;
      if (candidate.artifact.evidenceRefs !== undefined && (!Array.isArray(candidate.artifact.evidenceRefs) || candidate.artifact.evidenceRefs.some((ref) => typeof ref !== "string"))) return undefined;
    }
    parsed.push({
      agentType: candidate.agentType,
      ...(candidate.artifact !== undefined ? { artifact: { ...(typeof candidate.artifact.confidence === "string" ? { confidence: candidate.artifact.confidence } : {}), ...(Array.isArray(candidate.artifact.evidenceRefs) ? { evidenceRefs: candidate.artifact.evidenceRefs as readonly string[] } : {}), ...(typeof candidate.artifact.schemaVersion === "string" ? { schemaVersion: candidate.artifact.schemaVersion } : {}), ...(typeof candidate.artifact.type === "string" ? { type: candidate.artifact.type } : {}) } } : {}),
      createdAt: candidate.createdAt,
      ...(typeof candidate.errorCode === "string" ? { errorCode: candidate.errorCode } : {}),
      ...(typeof candidate.finishedAt === "string" ? { finishedAt: candidate.finishedAt } : {}),
      inputRefs: candidate.inputRefs as readonly string[],
      ...(typeof candidate.modelProvider === "string" ? { modelProvider: candidate.modelProvider } : {}),
      promptVersion: candidate.promptVersion,
      runId: candidate.runId,
      ...(typeof candidate.startedAt === "string" ? { startedAt: candidate.startedAt } : {}),
      status: candidate.status as AgentRunSummary["status"],
      task: candidate.task,
    });
  }
  return Object.freeze(parsed);
}

export function getFreshnessState(ageSeconds: number): FreshnessState {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0) return "stale";
  if (ageSeconds <= 300) return "fresh";
  if (ageSeconds <= 900) return "delayed";
  return "stale";
}

export function getFreshnessLabel(state: FreshnessState): string {
  if (state === "fresh") return "Fresh";
  if (state === "delayed") return "Delayed";
  return "Stale";
}

export function formatUtc(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return `${date.toISOString().replace("T", " ").replace(".000Z", " UTC")}`;
}
