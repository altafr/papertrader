export type FreshnessState = "delayed" | "fresh" | "stale";
export type MigrationBlockedReason = "audit_columns_missing" | "audit_table_missing" | "migration_not_recorded";
export type ResearchScheduleStatus = "blocked" | "disabled" | "ready";
export type TelegramAlertReadinessStatus = "blocked" | "disabled" | "ready";
export type TelegramAlertTestStatus = "blocked" | "ready";
export type RecoveryVerificationStatus = "unverified" | "verified";
export type SchedulerAuditStatus = "completed" | "failed" | "running" | "unavailable";
export type SchedulerAuditGateStatus = "blocked" | "disabled" | "enabled";

export type OperationsHealth = {
  readonly reconciliation: {
    readonly ageSeconds?: number;
    readonly capturedAt?: string;
    readonly status: "delayed" | "fresh" | "stale" | "unavailable";
  };
  readonly runtime: {
    readonly brokerConnectionEnabled: boolean;
    readonly dailyPreparationHandlerEnabled: boolean;
    readonly dailyReconciliation: { readonly capturedAt?: string; readonly status: "completed" | "unavailable" };
    readonly schedulerAudit: { readonly completedAt?: string; readonly failureCode?: string; readonly runId?: string; readonly scheduledAt?: string; readonly startedAt?: string; readonly status: SchedulerAuditStatus };
    readonly schedulerAuditGate: { readonly activationApprovalReferencePresent: boolean; readonly enabled: boolean; readonly migrationReady: boolean; readonly status: SchedulerAuditGateStatus };
    readonly recovery: { readonly status: RecoveryVerificationStatus };
    readonly globalKillSwitchActive: boolean;
    readonly operatingMode: "observe" | "recommend" | "paper_autopilot";
    readonly paperAutopilotEnabled: boolean;
    readonly migration: { readonly blockedReasons: readonly MigrationBlockedReason[]; readonly status: "blocked" | "ready" };
    readonly riskPolicy: {
      readonly initialEquityBaseline: string;
      readonly maxSingleTradeRiskPercentOfNotional: string;
      readonly maxSingleTradeStopLossPercent: string;
    };
    readonly researchSchedule: { readonly enabled: boolean; readonly handlerEnabled: boolean; readonly status: ResearchScheduleStatus };
    readonly scheduler: { readonly activationApprovalReferencePresent: boolean; readonly cron: string; readonly enabled: boolean; readonly status: "blocked" | "disabled" | "ready"; readonly timezone: "UTC" };
    readonly telegramAlerts: { readonly deliveryVerification: "unverified"; readonly enabled: boolean; readonly status: TelegramAlertReadinessStatus };
    readonly telegramAlertTest: { readonly approvalReferencePresent: boolean; readonly status: TelegramAlertTestStatus };
  };
};

export type PaperPerformance = {
  readonly calendarDays: number;
  readonly consecutiveCalendarDays: number;
  readonly firstCapturedAt?: string;
  readonly equityCurve?: readonly { readonly capturedAt: string; readonly drawdownPercent: string; readonly equity: string; readonly returnPercent: string }[];
  readonly lastCapturedAt?: string;
  readonly metrics?: { readonly finalEquity: string; readonly initialEquity: string; readonly maxDrawdownPercent: string; readonly totalPnl: string; readonly totalReturnPercent: string };
  readonly performanceRange: "7d" | "30d" | "all";
  readonly snapshotCount: number;
  readonly stability: { readonly blockedReasons: readonly string[]; readonly status: "blocked" | "ready" };
  readonly status: "insufficient_history" | "ready";
};

export function buildDashboardHistoryParams(page: number, range: "7d" | "30d" | "all", from?: string, to?: string): URLSearchParams {
  return new URLSearchParams({ page: String(page), range, ...(from ? { from } : {}), ...(to ? { to } : {}) });
}

export function parsePaperPerformance(value: unknown): PaperPerformance | undefined {
  if (!isRecord(value) || typeof value.calendarDays !== "number" || typeof value.consecutiveCalendarDays !== "number" || typeof value.snapshotCount !== "number" || !(value.performanceRange === "7d" || value.performanceRange === "30d" || value.performanceRange === "all") || !isRecord(value.stability) || !Array.isArray(value.stability.blockedReasons) || value.stability.blockedReasons.some((reason) => typeof reason !== "string") || !(value.stability.status === "blocked" || value.stability.status === "ready") || !(value.status === "insufficient_history" || value.status === "ready")) return undefined;
  const metrics = value.metrics;
  const equityCurve = value.equityCurve;
  if (equityCurve !== undefined && (!Array.isArray(equityCurve) || equityCurve.some((point) => !isRecord(point) || typeof point.capturedAt !== "string" || typeof point.drawdownPercent !== "string" || typeof point.equity !== "string" || typeof point.returnPercent !== "string"))) return undefined;
  if (metrics !== undefined && (!isRecord(metrics) || typeof metrics.finalEquity !== "string" || typeof metrics.initialEquity !== "string" || typeof metrics.maxDrawdownPercent !== "string" || typeof metrics.totalPnl !== "string" || typeof metrics.totalReturnPercent !== "string")) return undefined;
  return {
    calendarDays: value.calendarDays,
    consecutiveCalendarDays: value.consecutiveCalendarDays,
    ...(typeof value.firstCapturedAt === "string" ? { firstCapturedAt: value.firstCapturedAt } : {}),
    ...(Array.isArray(equityCurve) ? { equityCurve: equityCurve.map((point) => ({ capturedAt: point.capturedAt as string, drawdownPercent: point.drawdownPercent as string, equity: point.equity as string, returnPercent: point.returnPercent as string })) } : {}),
    ...(typeof value.lastCapturedAt === "string" ? { lastCapturedAt: value.lastCapturedAt } : {}),
    ...(metrics ? { metrics: { finalEquity: metrics.finalEquity as string, initialEquity: metrics.initialEquity as string, maxDrawdownPercent: metrics.maxDrawdownPercent as string, totalPnl: metrics.totalPnl as string, totalReturnPercent: metrics.totalReturnPercent as string } } : {}),
    performanceRange: value.performanceRange,
    snapshotCount: value.snapshotCount,
    stability: { blockedReasons: value.stability.blockedReasons as string[], status: value.stability.status },
    status: value.status,
  };
}

export type AgentRunSummary = {
  readonly agentType: string;
  readonly artifact?: {
    readonly confidence?: string;
    readonly evidenceRefs?: readonly string[];
    readonly rationale?: string;
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

export type OperatorOverview = {
  readonly agents: readonly (AgentRunSummary & { readonly artifact?: AgentRunSummary["artifact"] })[];
  readonly auditTimeline: readonly Record<string, unknown>[];
  readonly filteredTrades: readonly Record<string, unknown>[];
  readonly history?: { readonly from?: string | null; readonly hasNext: boolean; readonly limit: number; readonly page: number; readonly to?: string | null; readonly totals?: { readonly agents: number; readonly filteredTrades: number; readonly lifecycle: number; readonly schedules: number; readonly submissions: number } };
  readonly tradeDecisions: readonly Record<string, unknown>[];
  readonly strategyLifecycle: readonly Record<string, unknown>[];
  readonly strategyCatalog: readonly Record<string, unknown>[];
};

export function parseOperatorOverview(value: unknown): OperatorOverview | undefined {
  if (!isRecord(value) || !Array.isArray(value.agents) || !Array.isArray(value.filteredTrades) || !Array.isArray(value.tradeDecisions) || (value.auditTimeline !== undefined && !Array.isArray(value.auditTimeline)) || (value.strategyLifecycle !== undefined && !Array.isArray(value.strategyLifecycle)) || (value.strategyCatalog !== undefined && !Array.isArray(value.strategyCatalog))) return undefined;
  const agents = parseAgentRuns({ runs: value.agents });
  if (!agents) return undefined;
  const history = value.history;
  if (history !== undefined && (!isRecord(history) || typeof history.hasNext !== "boolean" || typeof history.limit !== "number" || typeof history.page !== "number")) return undefined;
  const totals = history && isRecord(history) ? history.totals : undefined;
  if (totals !== undefined && (!isRecord(totals) || ["agents", "filteredTrades", "lifecycle", "schedules", "submissions"].some((key) => typeof totals[key] !== "number"))) return undefined;
  return { agents, auditTimeline: Array.isArray(value.auditTimeline) ? value.auditTimeline.filter(isRecord) : [], filteredTrades: value.filteredTrades.filter(isRecord), ...(history && isRecord(history) ? { history: { ...(typeof history.from === "string" || history.from === null ? { from: history.from } : {}), hasNext: history.hasNext as boolean, limit: history.limit as number, page: history.page as number, ...(typeof history.to === "string" || history.to === null ? { to: history.to } : {}), ...(totals && isRecord(totals) ? { totals: { agents: totals.agents as number, filteredTrades: totals.filteredTrades as number, lifecycle: totals.lifecycle as number, schedules: totals.schedules as number, submissions: totals.submissions as number } } : {}) } } : {}), strategyCatalog: Array.isArray(value.strategyCatalog) ? value.strategyCatalog.filter(isRecord) : [], strategyLifecycle: Array.isArray(value.strategyLifecycle) ? value.strategyLifecycle.filter(isRecord) : [], tradeDecisions: value.tradeDecisions.filter(isRecord) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseOperationsHealth(value: unknown): OperationsHealth | undefined {
  if (!isRecord(value) || !isRecord(value.reconciliation) || !isRecord(value.runtime)) return undefined;
  const reconciliation = value.reconciliation;
  const runtime = value.runtime;
  if (!isRecord(runtime.scheduler)) return undefined;
  if (!isRecord(runtime.dailyReconciliation)) return undefined;
  if (!isRecord(runtime.schedulerAudit)) return undefined;
  if (!isRecord(runtime.schedulerAuditGate)) return undefined;
  if (!isRecord(runtime.recovery)) return undefined;
  if (!isRecord(runtime.researchSchedule)) return undefined;
  if (!isRecord(runtime.telegramAlerts)) return undefined;
  if (!isRecord(runtime.telegramAlertTest)) return undefined;
  if (!isRecord(runtime.migration) || !Array.isArray(runtime.migration.blockedReasons) || runtime.migration.blockedReasons.some((reason) => !( ["audit_columns_missing", "audit_table_missing", "migration_not_recorded"] as const).includes(reason as MigrationBlockedReason))) return undefined;
  const scheduler = runtime.scheduler;
  const dailyReconciliation = runtime.dailyReconciliation;
  const schedulerAudit = runtime.schedulerAudit;
  const schedulerAuditGate = runtime.schedulerAuditGate;
  const recovery = runtime.recovery;
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
  if (!( ["completed", "unavailable"] as const).includes(dailyReconciliation.status as OperationsHealth["runtime"]["dailyReconciliation"]["status"])) return undefined;
  if (!( ["completed", "failed", "running", "unavailable"] as const).includes(schedulerAudit.status as SchedulerAuditStatus)) return undefined;
  if (!( ["blocked", "disabled", "enabled"] as const).includes(schedulerAuditGate.status as SchedulerAuditGateStatus)) return undefined;
  if (!( ["unverified", "verified"] as const).includes(recovery.status as RecoveryVerificationStatus)) return undefined;
  if (typeof scheduler.activationApprovalReferencePresent !== "boolean" || typeof scheduler.cron !== "string" || scheduler.cron.trim().length === 0 || scheduler.cron.length > 120 || typeof scheduler.enabled !== "boolean" || scheduler.timezone !== "UTC" || typeof researchSchedule.enabled !== "boolean" || typeof researchSchedule.handlerEnabled !== "boolean" || typeof telegramAlerts.enabled !== "boolean" || typeof telegramAlertTest.approvalReferencePresent !== "boolean" || typeof runtime.brokerConnectionEnabled !== "boolean" || typeof runtime.dailyPreparationHandlerEnabled !== "boolean" || typeof runtime.globalKillSwitchActive !== "boolean" || typeof runtime.paperAutopilotEnabled !== "boolean" || (dailyReconciliation.capturedAt !== undefined && typeof dailyReconciliation.capturedAt !== "string")) return undefined;
  for (const key of ["completedAt", "failureCode", "runId", "scheduledAt", "startedAt"] as const) if (schedulerAudit[key] !== undefined && typeof schedulerAudit[key] !== "string") return undefined;
  if (typeof schedulerAuditGate.activationApprovalReferencePresent !== "boolean" || typeof schedulerAuditGate.enabled !== "boolean" || typeof schedulerAuditGate.migrationReady !== "boolean") return undefined;
  if (!(runtime.migration.status === "blocked" || runtime.migration.status === "ready")) return undefined;
  if (typeof recovery.status !== "string" || typeof riskPolicy.initialEquityBaseline !== "string" || typeof riskPolicy.maxSingleTradeRiskPercentOfNotional !== "string" || typeof riskPolicy.maxSingleTradeStopLossPercent !== "string") return undefined;
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
      dailyReconciliation: { ...(typeof dailyReconciliation.capturedAt === "string" ? { capturedAt: dailyReconciliation.capturedAt } : {}), status: dailyReconciliation.status as OperationsHealth["runtime"]["dailyReconciliation"]["status"] },
      schedulerAudit: { ...(typeof schedulerAudit.completedAt === "string" ? { completedAt: schedulerAudit.completedAt } : {}), ...(typeof schedulerAudit.failureCode === "string" ? { failureCode: schedulerAudit.failureCode } : {}), ...(typeof schedulerAudit.runId === "string" ? { runId: schedulerAudit.runId } : {}), ...(typeof schedulerAudit.scheduledAt === "string" ? { scheduledAt: schedulerAudit.scheduledAt } : {}), ...(typeof schedulerAudit.startedAt === "string" ? { startedAt: schedulerAudit.startedAt } : {}), status: schedulerAudit.status as SchedulerAuditStatus },
      schedulerAuditGate: { activationApprovalReferencePresent: schedulerAuditGate.activationApprovalReferencePresent, enabled: schedulerAuditGate.enabled, migrationReady: schedulerAuditGate.migrationReady, status: schedulerAuditGate.status as SchedulerAuditGateStatus },
      recovery: { status: recovery.status as RecoveryVerificationStatus },
      globalKillSwitchActive: runtime.globalKillSwitchActive,
      operatingMode: runtime.operatingMode as OperationsHealth["runtime"]["operatingMode"],
      paperAutopilotEnabled: runtime.paperAutopilotEnabled,
      migration: { blockedReasons: runtime.migration.blockedReasons as readonly MigrationBlockedReason[], status: runtime.migration.status },
      riskPolicy: {
        initialEquityBaseline: riskPolicy.initialEquityBaseline,
        maxSingleTradeRiskPercentOfNotional: riskPolicy.maxSingleTradeRiskPercentOfNotional,
        maxSingleTradeStopLossPercent: riskPolicy.maxSingleTradeStopLossPercent,
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
      for (const key of ["confidence", "rationale", "schemaVersion", "type"] as const) if (candidate.artifact[key] !== undefined && typeof candidate.artifact[key] !== "string") return undefined;
      if (candidate.artifact.evidenceRefs !== undefined && (!Array.isArray(candidate.artifact.evidenceRefs) || candidate.artifact.evidenceRefs.some((ref) => typeof ref !== "string"))) return undefined;
    }
    parsed.push({
      agentType: candidate.agentType,
      ...(candidate.artifact !== undefined ? { artifact: { ...(typeof candidate.artifact.confidence === "string" ? { confidence: candidate.artifact.confidence } : {}), ...(Array.isArray(candidate.artifact.evidenceRefs) ? { evidenceRefs: candidate.artifact.evidenceRefs as readonly string[] } : {}), ...(typeof candidate.artifact.rationale === "string" ? { rationale: candidate.artifact.rationale } : {}), ...(typeof candidate.artifact.schemaVersion === "string" ? { schemaVersion: candidate.artifact.schemaVersion } : {}), ...(typeof candidate.artifact.type === "string" ? { type: candidate.artifact.type } : {}) } } : {}),
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
