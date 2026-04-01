/**
 * Phase 7 Final Verification — Entry point (read-only verification).
 */

import type { Phase7VerificationReport } from './verificationReport.js';
import { runPhase7Verification, formatPhase7Report } from './verificationReport.js';

/**
 * Run Phase 7 verification and return the report.
 */
export function runVerification(): Phase7VerificationReport {
  return runPhase7Verification();
}

/**
 * Run verification and return formatted string report.
 */
export function runVerificationAndFormat(): string {
  const report = runPhase7Verification();
  return formatPhase7Report(report);
}
