export const OPERATING_MODES = {
  liveAutopilot: "Live Autopilot",
  liveConfirm: "Live Confirm",
  observe: "Observe",
  paperAutopilot: "Paper Autopilot",
  recommend: "Recommend",
} as const;

export type OperatingMode = (typeof OPERATING_MODES)[keyof typeof OPERATING_MODES];

export type HealthState = "degraded" | "healthy" | "paused" | "stopped";

export interface ServiceHealth {
  readonly asOf: string;
  readonly service: "api";
  readonly status: HealthState;
}

export interface WorkerHealth {
  readonly alpaca: "not_configured";
  readonly asOf: string;
  readonly database: "not_configured";
  readonly durableScheduler: {
    readonly enabled: boolean;
    readonly lastRunAt?: string;
    readonly nextRunAt?: string;
    readonly status: "degraded" | "disabled" | "ready" | "running" | "scheduled";
  };
  readonly researchSchedule: {
    readonly enabled: boolean;
    readonly handlerEnabled: boolean;
    readonly status: "blocked" | "disabled" | "ready";
  };
  readonly shadowEvaluation: {
    readonly enabled: boolean;
    readonly intervalSeconds: number;
    readonly lastRunAt?: string;
    readonly nextRunAt?: string;
    readonly sourceConfigured: boolean;
    readonly status: "degraded" | "disabled" | "ready" | "running" | "scheduled";
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
