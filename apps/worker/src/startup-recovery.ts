/**
 * Keep restart recovery fail-closed: scheduling may begin only after the
 * broker/read-model reconciliation succeeds.
 */
export async function reconcileBeforeSchedulerStart(input: {
  readonly reconcile: () => Promise<unknown>;
  readonly onFailure: () => Promise<void> | void;
  readonly startScheduler: () => Promise<void>;
}): Promise<boolean> {
  try {
    await input.reconcile();
  } catch {
    await input.onFailure();
    return false;
  }
  await input.startScheduler();
  return true;
}
