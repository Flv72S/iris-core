/**
 * S-3 Robustness Validation — Analyzer. Validates determinism, safety, liveness per test.
 */

import type { S3StressTestResult } from './S3StressRunner.js';

export type S3StressVerdict = 'PASS' | 'FAIL';

export interface S3StressAnalysisResult {
  readonly testName: string;
  readonly softEventCount: number;
  readonly simulationHashIdentical: boolean;
  readonly verificationHashIdentical: boolean;
  readonly safetyPass: boolean;
  readonly livenessPass: boolean;
  readonly verdict: S3StressVerdict;
}

export function analyzeS3StressResult(result: S3StressTestResult): S3StressAnalysisResult {
  const determinismOk = result.simulationHashIdentical && result.verificationHashIdentical;
  const safetyOk = result.safetyPass;
  const livenessOk = result.livenessPass;
  const verdict: S3StressVerdict =
    determinismOk && safetyOk && livenessOk ? 'PASS' : 'FAIL';

  return Object.freeze({
    testName: result.config.name,
    softEventCount: result.softEventCount,
    simulationHashIdentical: result.simulationHashIdentical,
    verificationHashIdentical: result.verificationHashIdentical,
    safetyPass: result.safetyPass,
    livenessPass: result.livenessPass,
    verdict,
  });
}

export function analyzeAllS3StressResults(results: S3StressTestResult[]): S3StressAnalysisResult[] {
  return results.map(analyzeS3StressResult);
}

export function getS3StressOverallPass(analysis: S3StressAnalysisResult[]): boolean {
  for (const a of analysis) {
    if (a.verdict === 'FAIL') return false;
  }
  return true;
}
