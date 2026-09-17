import { describe, expect, it, vi } from "vitest";
import type { createDatabase } from "@momentum/db";
import type { OvernightReport } from "@momentum/domain";
import { generateOvernightReport, saveOvernightReport } from "./overnight-report.js";

type Pool = ReturnType<typeof createDatabase>["pool"];
const fixture: OvernightReport = { schemaVersion: "1", id: "overnight:test", title: "Test report", periodStart: "2026-09-16T10:00:00Z", periodEnd: "2026-09-17T01:00:00Z", generatedAt: "2026-09-17T01:05:00Z", timezone: "Asia/Hong_Kong", source: "Test", headline: "No recorded trades", summary: "Test", processes: [], snapshot: [], trades: [], concerns: [], limitations: [] };

describe("overnight report persistence", () => {
  it("does not regenerate a saved report", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1 });
    const connect = vi.fn();
    expect(await generateOvernightReport({ query, connect } as unknown as Pool, new Date("2026-09-17T02:00:00Z"))).toBeUndefined();
    expect(connect).not.toHaveBeenCalled();
  });
  it("waits for reconciliation settling time", async () => {
    const query = vi.fn();
    expect(await generateOvernightReport({ query } as unknown as Pool, new Date("2026-09-17T01:03:00Z"))).toBeUndefined();
    expect(query).not.toHaveBeenCalled();
  });
  it("preserves an existing report during duplicate publication", async () => {
    const query = vi.fn().mockResolvedValue({});
    await saveOvernightReport({ query } as unknown as Pool, fixture);
    expect(query.mock.calls[0]?.[0]).toContain("ON CONFLICT (run_id) DO NOTHING");
    expect(JSON.parse(query.mock.calls[0]?.[1][4] as string)).toEqual(fixture);
  });
  it("reports missing evidence honestly instead of asserting no trading took place", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    const release = vi.fn();
    const client = { query, release };
    const report = await generateOvernightReport({ query, connect: async () => client } as unknown as Pool, new Date("2026-09-17T02:00:00Z"));
    expect(report?.headline).toContain("recorded");
    expect(report?.snapshot).toEqual(["No reconciled account snapshot is available."]);
    expect(report?.concerns.join(" ")).toContain("coverage may be incomplete");
    expect(report?.processes.find((row) => row.name === "Position manager")?.decision).toContain("Do not infer");
    expect(release).toHaveBeenCalledOnce();
  });
  it("releases the connection and does not publish on a query failure", async () => {
    const query = vi.fn().mockResolvedValueOnce({ rowCount: 0 });
    const dbQuery = vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("database unavailable")).mockResolvedValue({});
    const release = vi.fn();
    await expect(generateOvernightReport({ query, connect: async () => ({ query: dbQuery, release }) } as unknown as Pool, new Date("2026-09-17T02:00:00Z"))).rejects.toThrow("database unavailable");
    expect(dbQuery).toHaveBeenLastCalledWith("ROLLBACK");
    expect(release).toHaveBeenCalledOnce();
  });
});
