import { describe, expect, it } from "vitest";

import { verifyDatabaseConnectivity } from "./database-status.js";

describe("database connectivity probe", () => {
  it("accepts the expected read-only result", async () => {
    await expect(verifyDatabaseConnectivity({ query: async () => ({ rows: [{ ok: 1 }] }) })).resolves.toBeUndefined();
  });

  it("fails closed on an unexpected result", async () => {
    await expect(verifyDatabaseConnectivity({ query: async () => ({ rows: [{ ok: 2 }] }) })).rejects.toThrow("unexpected result");
  });

  it("preserves query failures for the guarded command to redact", async () => {
    await expect(verifyDatabaseConnectivity({ query: async () => { throw new Error("provider detail"); } })).rejects.toThrow("provider detail");
  });
});
