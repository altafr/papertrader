import { describe, expect, it } from "vitest";

import { compareReconciliationAccounts } from "./reconciliation-status.js";

const account = {
  accountId: "account-1",
  buyingPower: "1000.00",
  cash: "1000.00",
  currency: "USD",
  equity: "1000.00",
  status: "ACTIVE",
} as const;

describe("reconciliation comparison", () => {
  it("matches equivalent decimal representations without returning values", () => {
    const result = compareReconciliationAccounts(account, {
      ...account,
      buyingPower: "1000",
      cash: "1000.0000",
      equity: "1000.0",
    });
    expect(result).toEqual({
      checkedFields: ["buyingPower", "cash", "currency", "equity", "status"],
      mismatchedFields: [],
      status: "matched",
    });
  });

  it("reports only mismatched field names", () => {
    const result = compareReconciliationAccounts(account, { ...account, equity: "999.99", status: "INACTIVE" });
    expect(result.status).toBe("mismatch");
    expect(result.mismatchedFields).toEqual(["equity", "status"]);
    expect(JSON.stringify(result)).not.toContain("999.99");
  });
});
