import { assertShadowEvaluationOnce } from "./shadow-evaluation.js";

const configuration = assertShadowEvaluationOnce();
if (!configuration.sourceConfigured) {
  throw new Error("Shadow evaluation finalized-bar source is not configured.");
}

// The finalized-bar adapter and repository wiring are intentionally supplied by the next worker unit.
console.error("Shadow evaluation is enabled, but no finalized-bar adapter is wired.");
process.exitCode = 1;
