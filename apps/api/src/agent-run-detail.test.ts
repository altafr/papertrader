import { describe, expect, it } from "vitest";
import { toAgentRunDetail } from "./agent-run-detail.js";

describe("agent run detail redaction", () => {
  it("redacts secret-like payload keys and bounds nested data", () => {
    const detail = toAgentRunDetail({
      agentType: "stock_research", artifactConfidence: "not_calibrated", artifactEvidenceRefs: ["bars:1"], artifactPayload: { apiKey: "do-not-return", nested: { token: "also-secret", symbols: ["AAA"] } }, artifactRationale: "Research context.", artifactSchemaVersion: "1", artifactType: "research_watchlist", createdAt: new Date("2026-08-23T00:00:00Z"), errorCode: null, finishedAt: null, inputRefs: ["bars:1"], modelProvider: null, promptVersion: "research@1", runId: "run-1", startedAt: null, status: "succeeded", task: "Rank stocks.",
    });
    expect(detail.artifact?.payload).toMatchObject({ apiKey: "[redacted]", nested: { token: "[redacted]", symbols: ["AAA"] } });
    expect(JSON.stringify(detail)).not.toContain("do-not-return");
  });

  it("omits incomplete artifact details", () => {
    const detail = toAgentRunDetail({ agentType: "stock_research", artifactConfidence: null, artifactEvidenceRefs: null, artifactPayload: null, artifactRationale: null, artifactSchemaVersion: null, artifactType: null, createdAt: new Date("2026-08-23T00:00:00Z"), errorCode: "research_handler_failed", finishedAt: new Date("2026-08-23T00:00:02Z"), inputRefs: ["bars:1"], modelProvider: null, promptVersion: "research@1", runId: "run-2", startedAt: new Date("2026-08-23T00:00:01Z"), status: "failed", task: "Rank stocks." });
    expect(detail).not.toHaveProperty("artifact");
    expect(detail.errorCode).toBe("research_handler_failed");
  });
});
