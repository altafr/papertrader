import { describe, expect, it } from "vitest";
import { runMacroAdvisory, type MacroAdvisoryPayload } from "./macro-advisory.js";

const event = {
  category: "rates",
  eventId: "event-1",
  impact: "high" as const,
  region: "US",
  scheduledAt: "2026-08-23T02:00:00.000Z",
  sourceRef: "calendar:1",
  title: "Central bank decision",
};

describe("macro advisory", () => {
  it("flags a nearby high-impact event without creating a trade decision", () => {
    const artifact = runMacroAdvisory({ capturedAt: "2026-08-23T00:00:00.000Z", events: [event], freshness: "fresh", horizonHours: 4, source: "provider" });
    const payload = artifact.payload as unknown as MacroAdvisoryPayload;
    expect(artifact.artifactType).toBe("macro_advisory");
    expect(payload.riskFlags).toEqual(["high_impact_event_near"]);
    expect(artifact.rationale).toContain("advisory only");
  });

  it("marks sparse source context and rejects stale, malformed, or unbounded input", () => {
    const empty = runMacroAdvisory({ capturedAt: "2026-08-23T00:00:00.000Z", events: [], freshness: "fresh", horizonHours: 1, source: "operator" });
    expect((empty.payload as unknown as MacroAdvisoryPayload).riskFlags).toEqual(["source_data_sparse"]);
    expect(() => runMacroAdvisory({ capturedAt: "2026-08-23T00:00:00.000Z", events: [event], freshness: "stale" as "fresh", horizonHours: 1, source: "provider" })).toThrow("fresh");
    expect(() => runMacroAdvisory({ capturedAt: "2026-08-23T00:00:00.000Z", events: [{ ...event, title: " " }], freshness: "fresh", horizonHours: 1, source: "provider" })).toThrow("title");
    expect(() => runMacroAdvisory({ capturedAt: "2026-08-23T00:00:00.000Z", events: [], freshness: "fresh", horizonHours: 169, source: "provider" })).toThrow("horizonHours");
  });
});
