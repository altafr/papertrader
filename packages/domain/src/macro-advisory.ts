import type { AgentArtifact, AgentHandler } from "./agent-runs.js";

export type MacroImpact = "high" | "low" | "medium";

export interface EconomicEvent {
  readonly category: string;
  readonly eventId: string;
  readonly impact: MacroImpact;
  readonly region: string;
  readonly scheduledAt: string;
  readonly sourceRef: string;
  readonly title: string;
}

export interface MacroAdvisoryInput {
  readonly capturedAt: string;
  readonly events: readonly EconomicEvent[];
  readonly freshness: "fresh";
  readonly horizonHours: number;
  readonly source: "operator" | "provider";
}

export interface MacroAdvisoryPayload {
  readonly capturedAt: string;
  readonly events: readonly EconomicEvent[];
  readonly riskFlags: readonly ("high_impact_event_near" | "source_data_sparse")[];
  readonly source: "operator" | "provider";
}

function assertText(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} must not be blank.`);
}

function validateEvent(event: EconomicEvent): void {
  assertText(event.eventId, "Economic event ID");
  assertText(event.title, "Economic event title");
  assertText(event.category, "Economic event category");
  assertText(event.region, "Economic event region");
  assertText(event.sourceRef, "Economic event source reference");
  if (Number.isNaN(Date.parse(event.scheduledAt))) throw new Error("Economic event requires a valid scheduled timestamp.");
}

function toPayload(input: MacroAdvisoryInput): MacroAdvisoryPayload {
  if (Number.isNaN(Date.parse(input.capturedAt))) throw new Error("Macro advisory requires a valid capture timestamp.");
  if (input.freshness !== "fresh") throw new Error("Macro advisory input must be fresh.");
  if (!Number.isSafeInteger(input.horizonHours) || input.horizonHours < 1 || input.horizonHours > 168) throw new Error("horizonHours must be an integer from 1 to 168.");
  if (input.events.length > 100) throw new Error("Macro advisory accepts at most 100 events.");
  for (const event of input.events) validateEvent(event);
  const capturedMs = Date.parse(input.capturedAt);
  const horizonMs = input.horizonHours * 60 * 60 * 1000;
  const highImpactNear = input.events.some((event) => event.impact === "high" && Date.parse(event.scheduledAt) >= capturedMs && Date.parse(event.scheduledAt) <= capturedMs + horizonMs);
  const riskFlags: MacroAdvisoryPayload["riskFlags"] = [
    ...(highImpactNear ? ["high_impact_event_near" as const] : []),
    ...(input.events.length === 0 ? ["source_data_sparse" as const] : []),
  ];
  return { capturedAt: input.capturedAt, events: Object.freeze([...input.events]), riskFlags: Object.freeze(riskFlags), source: input.source };
}

function toArtifact(input: MacroAdvisoryInput): AgentArtifact {
  const payload = toPayload(input);
  return {
    artifactType: "macro_advisory",
    confidence: "not_calibrated",
    evidenceRefs: input.events.map((event) => event.sourceRef),
    payload: payload as unknown as Readonly<Record<string, unknown>>,
    rationale: "Deterministic economic-event context is advisory only; it cannot approve, reject, or submit an order.",
    schemaVersion: "1",
  };
}

export function runMacroAdvisory(input: MacroAdvisoryInput): AgentArtifact {
  return toArtifact(input);
}

export function createMacroAdvisoryAgent(input: MacroAdvisoryInput): AgentHandler {
  return () => runMacroAdvisory(input);
}
