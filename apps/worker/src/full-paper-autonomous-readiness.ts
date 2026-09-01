import type { PaperPerformanceReport } from "./paper-performance-report.js";
import type { PaperAutopilotRuntimeReadiness } from "./paper-autopilot-runtime-readiness.js";

export interface FullPaperAutonomousReadinessInput {
  readonly runtime: PaperAutopilotRuntimeReadiness;
  readonly positionCoverage: {
    readonly positionCount: number;
    readonly unmanagedCount: number;
  };
  readonly alerts: {
    readonly enabled: boolean;
    readonly configured: boolean;
    readonly deliveryVerified: boolean;
  };
  readonly performance: PaperPerformanceReport;
}

export interface FullPaperAutonomousReadiness {
  readonly blockedReasons: readonly string[];
  readonly gates: {
    readonly runtime: PaperAutopilotRuntimeReadiness["status"];
    readonly exitPlanCoverage: "complete" | "blocked";
    readonly telegramAlerts: "verified" | "blocked";
    readonly paperEvidence: PaperPerformanceReport["stability"]["status"];
  };
  readonly runtime: PaperAutopilotRuntimeReadiness;
  readonly positionCoverage: FullPaperAutonomousReadinessInput["positionCoverage"];
  readonly alerts: FullPaperAutonomousReadinessInput["alerts"];
  readonly performance: PaperPerformanceReport;
  readonly evidence: {
    readonly calendarDays: number;
    readonly consecutiveCalendarDays: number;
    readonly daysRemaining: number;
    readonly requiredConsecutiveCalendarDays: 30;
  };
  readonly status: "blocked" | "ready";
}

export function combineFullPaperAutonomousReadiness(input: FullPaperAutonomousReadinessInput): FullPaperAutonomousReadiness {
  const blockedReasons = [
    ...input.runtime.blockedReasons.map((reason) => `runtime_${reason}`),
    ...(input.positionCoverage.unmanagedCount === 0 ? [] : ["unmanaged_positions_present"]),
    ...(input.alerts.enabled ? [] : ["telegram_alerts_disabled"]),
    ...(input.alerts.configured ? [] : ["telegram_alerts_not_configured"]),
    ...(input.alerts.deliveryVerified ? [] : ["telegram_alert_delivery_unverified"]),
    ...input.performance.stability.blockedReasons,
  ];
  const consecutiveCalendarDays = input.performance.consecutiveCalendarDays;
  return {
    blockedReasons,
    gates: {
      runtime: input.runtime.status,
      exitPlanCoverage: input.positionCoverage.unmanagedCount === 0 ? "complete" : "blocked",
      telegramAlerts: input.alerts.enabled && input.alerts.configured && input.alerts.deliveryVerified ? "verified" : "blocked",
      paperEvidence: input.performance.stability.status,
    },
    runtime: input.runtime,
    positionCoverage: input.positionCoverage,
    alerts: input.alerts,
    performance: input.performance,
    evidence: { calendarDays: input.performance.calendarDays, consecutiveCalendarDays, daysRemaining: Math.max(0, 30 - consecutiveCalendarDays), requiredConsecutiveCalendarDays: 30 },
    status: blockedReasons.length === 0 ? "ready" : "blocked",
  };
}
