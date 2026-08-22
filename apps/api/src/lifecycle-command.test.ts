import { describe, expect, it } from "vitest";
import { approveDisabledToReplay, approveReplayToShadow } from "./lifecycle-command.js";

const body = (overrides: Record<string, unknown> = {}) => ({
  approval: { approvedAt: "2026-01-10T00:00:00Z", approvedBy: "operator-1", note: "Reviewed regime replay evidence." },
  evidence: {
    strategyKey: "cross-sectional-momentum", strategyVersion: "1.0.0",
    results: ["bull", "bear", "choppy"].map((regime) => ({
      name: `${regime}-fixture`, regime,
      replay: { evaluatedBars: 100, skippedSignals: 0, metrics: { finalEquity: "1010.00000000", initialEquity: "1000.00000000", maxDrawdownAmount: "10.00000000", maxDrawdownPercent: "1.00000000", totalPnl: "10.00000000", totalReturnPercent: "1.00000000" },
        trades: [{ entryPrice: "100.00000000", exitPrice: "101.00000000", fees: "0.00000000", grossPnl: "1.00000000", netPnl: "1.00000000", signalTime: "2026-01-09T00:00:00Z", slippage: "0.00000000", symbol: "AAA" }] },
    })),
  },
  reason: "Replay approval.", requestedAt: "2026-01-10T00:00:00Z", strategyKey: "cross-sectional-momentum", strategyVersion: "1.0.0", ...overrides,
});

describe("authenticated disabled-to-replay command", () => {
  it("recomputes checks and persists only the resulting audit event", async () => {
    const persisted: unknown[] = [];
    const result = await approveDisabledToReplay({ actorId: "operator-1", body: body(), persistence: { appendDisabledToReplay: async (event) => { persisted.push(event); } } });
    expect(result).toMatchObject({ revision: 1, stage: "replay", strategyKey: "cross-sectional-momentum" });
    expect(persisted).toHaveLength(1);
  });

  it("rejects approval by a different identity and insufficient evidence", async () => {
    const persistence = { appendDisabledToReplay: async () => { throw new Error("must not persist"); } };
    await expect(approveDisabledToReplay({ actorId: "operator-2", body: body(), persistence })).rejects.toThrow("authenticated operator");
    const insufficient = { ...body(), evidence: { ...body().evidence, results: [body().evidence.results[0]] } };
    await expect(approveDisabledToReplay({ actorId: "operator-1", body: insufficient, persistence })).rejects.toThrow("three distinct regimes");
  });

  it("does not accept a client-supplied automated approval flag or later stage", async () => {
    const persistence = { appendDisabledToReplay: async () => undefined };
    await expect(approveDisabledToReplay({ actorId: "operator-1", body: { ...body(), automatedChecksPass: true }, persistence })).resolves.toBeDefined();
    await expect(approveDisabledToReplay({ actorId: "operator-1", body: { ...body(), toStage: "shadow" }, persistence })).resolves.toBeDefined();
  });
});

describe("authenticated replay-to-shadow command", () => {
  const shadowBody = { approval: { approvedAt: "2026-01-12T00:00:00Z", approvedBy: "operator-1", note: "Reviewed shadow evidence." }, reason: "Shadow approval.", requestedAt: "2026-01-12T00:00:00Z", strategyKey: "cross-sectional-momentum", strategyVersion: "1.0.0" };
  const observations = { listClosed: async () => Array.from({ length: 10 }, (_, index) => ({ observation: { observationId: `obs-${index}`, symbol: "AAA" }, outcome: { observedAt: new Date("2026-01-11T00:00:00Z"), reason: "target", returnPercent: "1.0" } })) };

  it("loads persisted closed outcomes, recomputes checks, and appends revision two", async () => {
    const persisted: unknown[] = [];
    const result = await approveReplayToShadow({ actorId: "operator-1", body: shadowBody, observations, persistence: { getLatest: async () => ({ revision: 1, toStage: "replay" }), appendReplayToShadow: async (event) => { persisted.push(event); } } });
    expect(result).toMatchObject({ revision: 2, sampleSize: 10, stage: "shadow" });
    expect(persisted[0]).toMatchObject({ fromStage: "replay", revision: 2, toStage: "shadow" });
  });

  it("rejects when replay is not the latest stage or evidence is insufficient", async () => {
    const persistence = { getLatest: async () => ({ revision: 1, toStage: "disabled" }), appendReplayToShadow: async () => { throw new Error("must not persist"); } };
    await expect(approveReplayToShadow({ actorId: "operator-1", body: shadowBody, observations, persistence })).rejects.toThrow("recorded replay stage");
    await expect(approveReplayToShadow({ actorId: "operator-1", body: shadowBody, observations: { listClosed: async () => [] }, persistence: { ...persistence, getLatest: async () => ({ revision: 1, toStage: "replay" }) } })).rejects.toThrow("automated checks");
  });
});
