export interface ReconciliationAccountValues {
  readonly accountId: string;
  readonly buyingPower: string;
  readonly cash: string;
  readonly currency: string;
  readonly equity: string;
  readonly status: string;
}

export interface ReconciliationComparison {
  readonly checkedFields: readonly (keyof Omit<ReconciliationAccountValues, "accountId">)[];
  readonly mismatchedFields: readonly (keyof Omit<ReconciliationAccountValues, "accountId">)[];
  readonly status: "matched" | "mismatch";
}

function normalizeDecimal(value: string): string {
  const trimmed = value.trim();
  const sign = trimmed.startsWith("-") ? "-" : "";
  const unsigned = sign ? trimmed.slice(1) : trimmed;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "") || "0";
  const normalizedFraction = fraction.replace(/0+$/, "");
  return `${sign}${normalizedWhole}${normalizedFraction ? `.${normalizedFraction}` : ""}`;
}

function sameValue(field: keyof Omit<ReconciliationAccountValues, "accountId">, left: string, right: string): boolean {
  return field === "status" || field === "currency" ? left === right : normalizeDecimal(left) === normalizeDecimal(right);
}

export function compareReconciliationAccounts(
  persisted: ReconciliationAccountValues,
  broker: ReconciliationAccountValues,
): ReconciliationComparison {
  const checkedFields = ["buyingPower", "cash", "currency", "equity", "status"] as const;
  const mismatchedFields = checkedFields.filter((field) => !sameValue(field, persisted[field], broker[field]));
  return {
    checkedFields,
    mismatchedFields,
    status: mismatchedFields.length === 0 ? "matched" : "mismatch",
  };
}
