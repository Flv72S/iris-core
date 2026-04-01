/**
 * S-2 Soft Scalability — Analyzer. Compares results to baseline; validates scaling rules.
 */

import type { TestResult } from './SoftScalabilityRunner.js';
import { ExpectedRelation } from './SoftScalabilityTestConfig.js';
import type { SoftInvariantType } from '../monitoring/InvariantTypes.js';

export type TestVerdict = 'PASS' | 'WARNING' | 'FAIL';

export interface AnalysisResult {
  readonly testName: string;
  readonly hashIdentical: boolean;
  readonly hardViolations: number;
  readonly softTotal: number;
  readonly softBreakdown: Readonly<Record<SoftInvariantType, number>>;
  readonly expectedRelation: string;
  readonly expectedSoftGreaterThanBaseline: boolean;
  readonly softGreaterThanBaseline: boolean;
  readonly distributionChanged: boolean | null;
  readonly verdict: TestVerdict;
}

function breakdownToSortedEntries(breakdown: Readonly<Record<string, number>>): string {
  const entries = Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => k + ':' + v)
    .sort();
  return entries.join(',');
}

export function analyzeResults(results: TestResult[]): AnalysisResult[] {
  const baseline = results[0];
  if (!baseline) return [];
  const baselineSoft = baseline.run1.softTotal;
  const baselineBreakdownStr = breakdownToSortedEntries(baseline.run1.softBreakdown as Record<string, number>);
  const analysis: AnalysisResult[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const softTotal = r.run1.softTotal;
    const expectedGreater = r.config.expectedRelation === ExpectedRelation.GREATER_THAN_BASELINE;
    const softGreaterThanBaseline = baselineSoft >= 0 ? softTotal > baselineSoft : true;
    let distributionChanged: boolean | null = null;
    if (r.config.checkDistributionChange && i === 2) {
      const currentStr = breakdownToSortedEntries(r.run1.softBreakdown as Record<string, number>);
      distributionChanged = currentStr !== baselineBreakdownStr;
    }
    let verdict: TestVerdict = 'PASS';
    if (!r.hashIdentical || !r.hardViolationsZero) verdict = 'FAIL';
    else if (expectedGreater && !softGreaterThanBaseline) verdict = 'FAIL';
    else if (r.config.checkDistributionChange && distributionChanged === false) verdict = 'WARNING';
    analysis.push(
      Object.freeze({
        testName: r.config.name,
        hashIdentical: r.hashIdentical,
        hardViolations: r.run1.hardViolations,
        softTotal,
        softBreakdown: r.run1.softBreakdown,
        expectedRelation: r.config.expectedRelation,
        expectedSoftGreaterThanBaseline: expectedGreater,
        softGreaterThanBaseline,
        distributionChanged,
        verdict,
      }),
    );
  }
  return analysis;
}

export function getOverallPass(analysis: AnalysisResult[]): boolean {
  for (const a of analysis) {
    if (a.verdict === 'FAIL') return false;
  }
  return true;
}
