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
