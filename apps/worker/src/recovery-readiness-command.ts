import { getRecoveryVerificationStatus } from "@momentum/config";

if (process.env.RECOVERY_READINESS !== "true") {
  throw new Error("RECOVERY_READINESS must be exactly true for the guarded recovery-readiness command.");
}

const status = getRecoveryVerificationStatus();
const readiness = {
  checks: {
    approvalReferencePresent: Boolean(process.env.RECOVERY_DRILL_APPROVAL_REFERENCE?.trim()),
    verifiedAtPresent: Boolean(process.env.RECOVERY_DRILL_VERIFIED_AT?.trim()),
    verifiedFlag: process.env.RECOVERY_DRILL_VERIFIED === "true",
  },
  status,
};
console.log(JSON.stringify(readiness));
if (status !== "verified") process.exitCode = 1;
