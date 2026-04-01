/**
 * S-2 Soft Scalability Validation — Entry point. Runs 4 tests, analyzes, prints report.
 */

import { getAllTestConfigs } from './SoftScalabilityTestConfig.js';
import { runAllTests } from './SoftScalabilityRunner.js';
import { analyzeResults, getOverallPass } from './SoftScalabilityAnalyzer.js';
import { SoftInvariantType } from '../monitoring/InvariantTypes.js';

function formatBreakdown(breakdown: Readonly<Record<string, number>>): string[] {
  const lines: string[] = [];
  for (const k of Object.values(SoftInvariantType)) {
    const v = breakdown[k];
    if (v !== undefined && v > 0) lines.push('  - ' + k + ': ' + v);
  }
  return lines;
}

function main(): void {
  const configs = getAllTestConfigs();
  const results = runAllTests(configs);
  const analysis = analyzeResults(results);
  const baselineSoft = analysis[0]?.softTotal ?? 0;

  const out = typeof process !== 'undefined' ? process.stdout : null;
  function write(s: string): void {
    if (out) out.write(s);
  }

  write('===================================================\n');
  write('S-2 SOFT SCALABILITY VALIDATION\n');
  write('===================================================\n\n');

  for (let i = 0; i < analysis.length; i++) {
    const a = analysis[i];
    if (!a) continue;
    write(a.testName + '\n');
    write('Hash identical: ' + a.hashIdentical + '\n');
    write('Hard violations: ' + a.hardViolations + '\n');
    write('Soft total: ' + a.softTotal + '\n');
    write('Breakdown:\n');
    for (const line of formatBreakdown(a.softBreakdown as Record<string, number>)) {
      write(line + '\n');
    }
    if (a.expectedSoftGreaterThanBaseline) {
      write('Expected: > ' + baselineSoft + '\n');
    }
    if (a.distributionChanged !== null) {
      write('Distribution changed: ' + (a.distributionChanged ? 'YES' : 'NO') + '\n');
    }
    write('Result: ' + a.verdict + '\n');
    write('\n');
  }

  write('===================================================\n');
  const overallPass = getOverallPass(analysis);
  write('FINAL RESULT: ' + (overallPass ? 'PASS' : 'FAIL') + '\n');
  write('===================================================\n');

  process.exit(overallPass ? 0 : 1);
}

main();

export { getBaselineTestConfig, getNodeScalingTestConfig, getIntensityScalingTestConfig, getDurationScalingTestConfig, getAllTestConfigs } from './SoftScalabilityTestConfig.js';
export { runTest, runAllTests } from './SoftScalabilityRunner.js';
export type { TestResult, SingleRunResult } from './SoftScalabilityRunner.js';
export { analyzeResults, getOverallPass } from './SoftScalabilityAnalyzer.js';
export type { AnalysisResult, TestVerdict } from './SoftScalabilityAnalyzer.js';
