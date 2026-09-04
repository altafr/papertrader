import { createPaperExitOrderSubmitter, type PaperExitOrderSubmitter, type PaperOrderSubmission } from "@momentum/alpaca";
import { evaluatePaperPositionExit, type ManagedPaperPosition, type PositionExitDecision } from "@momentum/domain";

export interface ManagedPositionInput extends ManagedPaperPosition {
  readonly intentId: string;
}

export interface PositionManagementResult {
  readonly decisions: readonly PositionExitDecision[];
  readonly failures: readonly PositionManagementFailure[];
  readonly submitted: number;
  readonly submissions: readonly PaperOrderSubmission[];
}

export interface PositionManagementFailure {
  readonly assetClass: ManagedPositionInput["assetClass"];
  readonly error: string;
  readonly symbol: string;
}

/** Alpaca accepts only a bounded provider-safe client order ID alphabet. */
export function buildPositionExitClientOrderId(intentId: string, reason: string): string {
  const safeIntent = intentId.replace(/[^A-Za-z0-9._:-]/g, "_");
  const suffix = `-exit-${reason}`;
  return `${safeIntent.slice(0, Math.max(1, 48 - suffix.length))}${suffix}`.slice(0, 48);
}

/** Evaluate reconciled paper positions and submit only deterministic exits. */
export async function runPaperPositionManagementOnce(input: {
  readonly now: string;
  readonly positions: readonly ManagedPositionInput[];
  /** Exit intents already accepted by the broker and still in flight. */
  readonly activeExitIntentIds?: ReadonlySet<string>;
  readonly submitter: Pick<PaperExitOrderSubmitter, "submitExit">;
}): Promise<PositionManagementResult> {
  const decisions: PositionExitDecision[] = [];
  const failures: PositionManagementFailure[] = [];
  const submissions: PaperOrderSubmission[] = [];
  let submitted = 0;
  for (const position of input.positions) {
    const decision = evaluatePaperPositionExit(position, input.now);
    decisions.push(decision);
    if (!decision.shouldExit) continue;
    const exitIntentId = `${position.intentId}:exit`;
    if (input.activeExitIntentIds?.has(exitIntentId)) continue;
    try {
      submissions.push(await input.submitter.submitExit({ assetClass: position.assetClass, clientOrderId: buildPositionExitClientOrderId(position.intentId, decision.reason ?? "unknown"), decision, quantity: position.quantity, timeInForce: position.assetClass === "crypto" ? "gtc" : "day", type: "market" }));
      submitted += 1;
    } catch (error) {
      failures.push({ assetClass: position.assetClass, error: error instanceof Error ? error.message.slice(0, 240) : "position_exit_submission_failed", symbol: position.symbol });
    }
  }
  return { decisions, failures, submitted, submissions };
}

export { createPaperExitOrderSubmitter };
