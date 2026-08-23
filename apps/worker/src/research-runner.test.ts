import { describe, expect, it } from "vitest";
import { executeResearchRun, type ResearchRunPersistence } from "./research-runner.js";
import type { AgentArtifact, AgentRunRequest } from "@momentum/domain";

const request: AgentRunRequest = { agentType: "stock_research", createdAt: "2026-08-23T00:00:00.000Z", inputRefs: ["bars:1"], promptVersion: "stock@1", runId: "research-1", task: "Rank stocks." };
const artifact: AgentArtifact = { artifactType: "watchlist", confidence: "not_calibrated", evidenceRefs: ["bars:1"], payload: { symbols: ["AAA"] }, rationale: "Research only.", schemaVersion: "1" };

function persistence(): ResearchRunPersistence & { readonly events: string[] } {
  const events: string[] = [];
  return { events, enqueue: async () => { events.push("queued"); }, start: async () => { events.push("running"); }, succeed: async () => { events.push("succeeded"); }, fail: async () => { events.push("failed"); } };
}

describe("guarded research runner", () => {
  it("persists one successful run in order", async () => {
    const store = persistence();
    const result = await executeResearchRun({ clock: (() => { const dates = [new Date("2026-08-23T00:00:01Z"), new Date("2026-08-23T00:00:02Z")]; return () => dates.shift()!; })(), handler: async () => artifact, persistence: store, request });
    expect(result.status).toBe("succeeded");
    expect(store.events).toEqual(["queued", "running", "succeeded"]);
  });

  it("records a redacted failure and does not expose handler errors", async () => {
    const store = persistence();
    const result = await executeResearchRun({ handler: () => { throw new Error("provider secret"); }, persistence: store, request: { ...request, runId: "research-2" } });
    expect(result.status).toBe("failed");
    expect(store.events).toEqual(["queued", "running", "failed"]);
    expect(JSON.stringify(result)).not.toContain("provider secret");
  });
});
