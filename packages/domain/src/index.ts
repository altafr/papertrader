export const OPERATING_MODES = {
  liveAutopilot: "Live Autopilot",
  liveConfirm: "Live Confirm",
  observe: "Observe",
  paperAutopilot: "Paper Autopilot",
  recommend: "Recommend",
} as const;

export type OperatingMode = (typeof OPERATING_MODES)[keyof typeof OPERATING_MODES];
export type RuntimeOperatingMode = "observe" | "recommend" | "paper_autopilot";
export type IntegrationConfigStatus = "configured" | "not_configured";

export type HealthState = "degraded" | "healthy" | "paused" | "stopped";

export interface ServiceHealth {
  readonly asOf: string;
  readonly service: "api";
  readonly status: HealthState;
}

export interface WorkerHealth {
  readonly alpaca: IntegrationConfigStatus;
  readonly asOf: string;
  readonly brokerConnectionEnabled: boolean;
  readonly database: IntegrationConfigStatus;
  readonly durableScheduler: {
    readonly auditEnabled: boolean;
    readonly auditActivationApprovalReferencePresent: boolean;
    readonly activationApprovalReferencePresent: boolean;
    readonly cron: string;
    readonly enabled: boolean;
    readonly timezone: "UTC";
    readonly lastRunAt?: string;
    readonly nextRunAt?: string;
    readonly status: "degraded" | "disabled" | "ready" | "running" | "scheduled";
  };
  readonly globalKillSwitchActive: boolean;
  readonly operatingMode: RuntimeOperatingMode;
  readonly paperAutopilotOrderSubmissionEnabled: boolean;
  readonly positionManagement: {
    readonly blockedReasons: readonly string[];
    readonly enabled: boolean;
    readonly intervalSeconds: number;
    readonly lastError?: string;
    readonly lastRunAt?: string;
    readonly readiness: "blocked" | "disabled" | "ready";
    readonly status: "degraded" | "disabled" | "ready" | "running";
  };
  readonly researchSchedule: {
    readonly enabled: boolean;
    readonly handlerEnabled: boolean;
    readonly lastRunAt?: string;
    readonly nextRunAt?: string;
    readonly status: "blocked" | "degraded" | "disabled" | "ready" | "running" | "scheduled";
  };
  readonly shadowEvaluation: {
    readonly enabled: boolean;
    readonly intervalSeconds: number;
    readonly lastRunAt?: string;
    readonly nextRunAt?: string;
    readonly sourceConfigured: boolean;
    readonly status: "degraded" | "disabled" | "ready" | "running" | "scheduled";
  };
  readonly telegramAlerts: {
    readonly deliveryVerification: "unverified";
    readonly enabled: boolean;
    readonly status: "blocked" | "disabled" | "ready";
  };
  readonly telegramAlertTest: {
    readonly approvalReferencePresent: boolean;
    readonly status: "blocked" | "ready";
  };
  readonly service: "worker";
  readonly status: HealthState;
}

export const FOUNDATION_STATUS = {
  description: "Application boundaries compile with all external integrations disabled.",
  health: "healthy",
  label: "Foundation ready",
} as const satisfies {
  readonly description: string;
  readonly health: HealthState;
  readonly label: string;
};

export * from "./strategy.js";
export * from "./indicators.js";
export * from "./metrics.js";
export * from "./replay.js";
export * from "./strategies.js";
export * from "./research.js";
export * from "./lifecycle.js";
export * from "./shadow.js";
export * from "./shadow-evaluator.js";
export * from "./shadow-runner.js";
export * from "./shadow-promotion.js";
export * from "./paper-promotion.js";
export * from "./paper-risk.js";
export * from "./trade-intent.js";
export * from "./paper-recovery.js";
export * from "./agent-runs.js";
export * from "./research-agents.js";
export * from "./macro-advisory.js";
export * from "./position-management.js";
