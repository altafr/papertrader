import { createPaperExitOrderSubmitter, type PaperExitOrderSubmitter, type PaperOrderSubmission } from "@momentum/alpaca";
import { evaluatePaperPositionExit, type ManagedPaperPosition, type PositionExitDecision } from "@momentum/domain";

export interface ManagedPositionInput extends ManagedPaperPosition {
  readonly intentId: string;
}

export interface PositionManagementResult {
  readonly decisions: readonly PositionExitDecision[];
  readonly submitted: number;
  readonly submissions: readonly PaperOrderSubmission[];
}

/** Evaluate reconciled paper positions and submit only deterministic exits. */
export async function runPaperPositionManagementOnce(input: {
  readonly now: string;
  readonly positions: readonly ManagedPositionInput[];
  readonly submitter: Pick<PaperExitOrderSubmitter, "submitExit">;
}): Promise<PositionManagementResult> {
  const decisions: PositionExitDecision[] = [];
  const submissions: PaperOrderSubmission[] = [];
  let submitted = 0;
  for (const position of input.positions) {
    const decision = evaluatePaperPositionExit(position, input.now);
    decisions.push(decision);
    if (!decision.shouldExit) continue;
    submissions.push(await input.submitter.submitExit({ assetClass: position.assetClass, clientOrderId: `${position.intentId}-exit-${decision.reason}`, decision, quantity: position.quantity, timeInForce: position.assetClass === "crypto" ? "gtc" : "day", type: "market" }));
    submitted += 1;
  }
  return { decisions, submitted, submissions };
}

export { createPaperExitOrderSubmitter };
