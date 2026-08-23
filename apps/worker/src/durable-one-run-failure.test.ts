import { describe, expect, it } from "vitest";

import { classifyDurableOneRunFailure, classifyDurableOneRunFailureAtStage } from "./durable-one-run-failure.js";

describe("durable one-run failure classification", () => {
  it("returns bounded broker categories without exposing the provider message", () => {
    expect(classifyDurableOneRunFailure(new Error("Alpaca account read failed with HTTP 401: secret response"))).toBe("alpaca_http_error");
    expect(classifyDurableOneRunFailure(new Error("fetch failed for https://paper-api.alpaca.markets"))).toBe("alpaca_network_error");
  });

  it("distinguishes timeout, queue, and database failures", () => {
    expect(classifyDurableOneRunFailure(new Error("guarded one-run timed out"))).toBe("one_run_timeout");
    expect(classifyDurableOneRunFailure(new Error("Guarded one-run provenance did not match the queued job."))).toBe("queue_provenance_error");
    expect(classifyDurableOneRunFailure(new Error("duplicate key value violates unique constraint"))).toBe("database_constraint_error");
    expect(classifyDurableOneRunFailure(new Error("relation durable_one_run_audits does not exist"))).toBe("database_schema_error");
  });

  it("fails closed to a generic category for unknown errors", () => {
    expect(classifyDurableOneRunFailure({ secret: "do-not-log" })).toBe("one_run_failed");
  });

  it("adds a bounded enqueue category when the queue send boundary fails", () => {
    expect(classifyDurableOneRunFailureAtStage(new Error("opaque queue error"), "job_enqueue")).toBe("queue_enqueue_error");
    expect(classifyDurableOneRunFailureAtStage(new Error("opaque queue error"), "reconciliation")).toBe("one_run_failed");
  });
});
