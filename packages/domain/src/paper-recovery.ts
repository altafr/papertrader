import * as DecimalModule from "decimal.js";

interface DecimalValue { greaterThan(value: DecimalValue | string): boolean; isNegative(): boolean; }
interface DecimalConstructor { new (value: string): DecimalValue; }
const Decimal = (DecimalModule as unknown as { readonly default: DecimalConstructor }).default;

export type PaperBrokerOrderStatus = "accepted" | "canceled" | "expired" | "filled" | "new" | "partially_filled" | "pending_new" | "rejected";
const statuses = new Set<PaperBrokerOrderStatus>(["accepted", "canceled", "expired", "filled", "new", "partially_filled", "pending_new", "rejected"]);
const terminal = new Set<PaperBrokerOrderStatus>(["canceled", "expired", "filled", "rejected"]);

export interface PaperOrderRecoveryResult {
  readonly filledQuantity?: string;
  readonly retryable: boolean;
  readonly status: PaperBrokerOrderStatus;
  readonly terminal: boolean;
}

export function reconcilePaperOrder(input: {
  readonly brokerClientOrderId: string;
  readonly brokerStatus: string;
  readonly expectedClientOrderId: string;
  readonly expectedQuantity: string;
  readonly filledQuantity?: string;
  readonly previousStatus?: PaperBrokerOrderStatus;
}): PaperOrderRecoveryResult {
  if (input.brokerClientOrderId !== input.expectedClientOrderId) throw new Error("Broker order client ID does not match the approved intent.");
  if (!statuses.has(input.brokerStatus as PaperBrokerOrderStatus)) throw new Error("Broker returned an unsupported paper order status.");
  const status = input.brokerStatus as PaperBrokerOrderStatus;
  if (input.previousStatus && terminal.has(input.previousStatus) && input.previousStatus !== status) throw new Error("A terminal paper order status cannot regress.");
  if (input.filledQuantity !== undefined) {
    const filled = new Decimal(input.filledQuantity);
    const expected = new Decimal(input.expectedQuantity);
    if (filled.isNegative() || filled.greaterThan(expected)) throw new Error("Broker filled quantity is outside the approved order quantity.");
  }
  return { ...(input.filledQuantity !== undefined ? { filledQuantity: input.filledQuantity } : {}), retryable: false, status, terminal: terminal.has(status) };
}
