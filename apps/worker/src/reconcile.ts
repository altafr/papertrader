import type { AlpacaAccountReader } from "@momentum/alpaca";
import type { createAccountStateRepository } from "@momentum/db";

type AccountStateRepository = ReturnType<typeof createAccountStateRepository>;

export async function reconcilePaperAccount(
  reader: AlpacaAccountReader,
  repository: AccountStateRepository,
) {
  const state = await reader.readAccountState();
  return repository.reconcile({
    account: {
      accountId: state.account.accountId,
      buyingPower: state.account.buyingPower,
      capturedAt: new Date(state.capturedAt),
      cash: state.account.cash,
      currency: state.account.currency,
      equity: state.account.equity,
      ...(state.account.lastEquity !== undefined ? { lastEquity: state.account.lastEquity } : {}),
      status: state.account.status,
    },
    activities: state.activities.map((activity) => ({
      accountId: state.account.accountId,
      activityId: activity.activityId,
      activityType: activity.activityType,
      ...(activity.price !== undefined ? { price: activity.price } : {}),
      ...(activity.quantity !== undefined ? { quantity: activity.quantity } : {}),
      ...(activity.symbol !== undefined ? { symbol: activity.symbol } : {}),
      ...(activity.transactionTime !== undefined ? { transactionTime: new Date(activity.transactionTime) } : {}),
    })),
    orders: state.orders.map((order) => ({
      accountId: state.account.accountId,
      alpacaOrderId: order.alpacaOrderId,
      assetClass: order.assetClass,
      ...(order.clientOrderId !== undefined ? { clientOrderId: order.clientOrderId } : {}),
      ...(order.filledQuantity !== undefined ? { filledQuantity: order.filledQuantity } : {}),
      ...(order.quantity !== undefined ? { quantity: order.quantity } : {}),
      side: order.side,
      status: order.status,
      ...(order.submittedAt !== undefined ? { submittedAt: new Date(order.submittedAt) } : {}),
      symbol: order.symbol,
      type: order.type,
      ...(order.updatedAt !== undefined ? { updatedAt: new Date(order.updatedAt) } : {}),
    })),
    positions: state.positions,
  });
}
