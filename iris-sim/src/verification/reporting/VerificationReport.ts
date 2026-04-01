/**
 * S-3 — Formal verification report. Deterministic, hashable.
 */

import type { PropertyResult } from './PropertyResult.js';

export interface VerificationReport {
  readonly overall: 'PASS' | 'FAIL';
  readonly safetyResults: readonly PropertyResult[];
  readonly livenessResults: readonly PropertyResult[];
  readonly verificationHash: string;
}

export function createVerificationReport(
  safetyResults: readonly PropertyResult[],
  livenessResults: readonly PropertyResult[],
  verificationHash: string,
): VerificationReport {
  const anyViolated =
    safetyResults.some((r) => r.status === 'VIOLATED') || livenessResults.some((r) => r.status === 'VIOLATED');
  return Object.freeze({
    overall: anyViolated ? 'FAIL' : 'PASS',
    safetyResults: Object.freeze([...safetyResults]),
    livenessResults: Object.freeze([...livenessResults]),
    verificationHash,
  });
}

/** Format report as text (deterministic, for audit). */
export function formatVerificationReport(report: VerificationReport): string {
  const lines: string[] = [
    '---------------------------------------',
    'FORMAL VERIFICATION RESULTS',
    '---------------------------------------',
    '',
    'SAFETY PROPERTIES',
    ...report.safetyResults.map((r) => `- ${r.id}: ${r.status}`),
    '',
    'LIVENESS PROPERTIES',
    ...report.livenessResults.map((r) => `- ${r.id}: ${r.status}`),
    '',
    '---------------------------------------',
    'Verification Hash: ' + report.verificationHash,
    '---------------------------------------',
  ];
  return lines.join('\n');
}
