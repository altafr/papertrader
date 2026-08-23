import { describe, expect, it } from "vitest";
import { createAgentOrchestrator, createAgentRunStore, type AgentArtifact } from "./agent-runs.js";

const artifact: AgentArtifact = {
  artifactType: "watchlist",
  confidence: "not_calibrated",
  evidenceRefs: ["market-snapshot:2026-08-23"],
  payload: { symbols: ["AAPL"] },
  rationale: "Structured research summary.",
  schemaVersion: "1",
};

const request = {
  agentType: "stock_research" as const,
  createdAt: "2026-08-23T00:00:00.000Z",
  inputRefs: ["snapshot:1"],
  promptVersion: "stock-research@1",
  runId: "run-1",
  task: "Rank eligible stocks.",
};

describe("agent run records", () => {
  it("records immutable queued, running, and succeeded states", () => {
    const store = createAgentRunStore();
    const queued = store.enqueue(request);
    expect(queued.status).toBe("queued");
    const running = store.start(request.runId, "2026-08-23T00:00:01.000Z");
    const succeeded = store.succeed(request.runId, "2026-08-23T00:00:02.000Z", artifact);
    expect(running.status).toBe("running");
    expect(succeeded.status).toBe("succeeded");
    expect(queued.status).toBe("queued");
    expect(() => store.enqueue(request)).toThrow("already exists");
  });

  it("enforces lifecycle timestamps and terminal states", () => {
    const store = createAgentRunStore();
    store.enqueue(request);
    expect(() => store.start(request.runId, "2026-08-22T23:59:59.000Z")).toThrow("before it was created");
    store.start(request.runId, "2026-08-23T00:00:01.000Z");
    expect(() => store.fail(request.runId, "2026-08-23T00:00:02.000Z", " ")).toThrow("must not be blank");
    store.fail(request.runId, "2026-08-23T00:00:02.000Z", "provider_timeout");
    expect(() => store.start(request.runId, "2026-08-23T00:00:03.000Z")).toThrow("Only queued");
  });

  it("rejects malformed artifacts", () => {
    const store = createAgentRunStore();
    store.enqueue(request);
    store.start(request.runId, "2026-08-23T00:00:01.000Z");
    expect(() => store.succeed(request.runId, "2026-08-23T00:00:02.000Z", { ...artifact, rationale: " " })).toThrow("rationale");
    expect(() => store.succeed(request.runId, "2026-08-23T00:00:02.000Z", { ...artifact, evidenceRefs: [""] })).toThrow("evidence references");
  });

  it("dispatches only registered handlers and redacts handler failures", async () => {
    const orchestrator = createAgentOrchestrator({
      clock: (() => {
        const values = ["2026-08-23T00:00:01.000Z", "2026-08-23T00:00:02.000Z"];
        return () => values.shift() ?? "2026-08-23T00:00:03.000Z";
      })(),
      handlers: {
        stock_research: async () => artifact,
        crypto_research: () => { throw new Error("secret provider response"); },
      },
    });
    const success = await orchestrator.dispatch(request);
    expect(success.status).toBe("succeeded");
    const failed = await orchestrator.dispatch({ ...request, agentType: "crypto_research", runId: "run-2" });
    expect(failed.status).toBe("failed");
    expect(failed.errorCode).toBe("agent_handler_failed");
    expect(JSON.stringify(failed)).not.toContain("secret provider response");
    await expect(orchestrator.dispatch({ ...request, agentType: "macro_advisory", runId: "run-3" })).rejects.toThrow("No handler");
  });
});
