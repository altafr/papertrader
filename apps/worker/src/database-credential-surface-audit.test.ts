import { describe, expect, it } from "vitest";

import { summarizeCredentialSurfaceAudit } from "./database-credential-surface-audit.js";

describe("database credential-surface audit", () => {
  it("passes only when no matching rows are found", () => {
    expect(summarizeCredentialSurfaceAudit({ columnsScanned: 63, matchingColumns: 0, matchingRows: 0 })).toEqual({ columnsScanned: 63, matchingColumns: 0, matchingRows: 0, status: "passed" });
    expect(summarizeCredentialSurfaceAudit({ columnsScanned: 63, matchingColumns: 1, matchingRows: 2 }).status).toBe("review_required");
  });
});
