/**
 * Phase 8.2.3 — Deterministic explainability for safety checklist verdict
 */

import type { SafetyRuleEvaluation } from '../evaluation/safety-evaluation.types';
import type { SafetyChecklistVerdict } from './safety-checklist.types';

export function explainSafetyChecklist(
  verdict: SafetyChecklistVerdict,
  evaluations: readonly SafetyRuleEvaluation[]
): string {
  const parts: string[] = [];
  parts.push(`Status: ${verdict.status}.`);
  if (verdict.violatedRules.length > 0) {
    parts.push(`Violated rules (${verdict.violatedRules.length}): ${verdict.violatedRules.join(', ')}.`);
    const bySeverity = evaluations.filter((e) => e.verdict === 'FAIL');
    const critical = bySeverity.filter((e) => e.severity === 'CRITICAL');
    const warning = bySeverity.filter((e) => e.severity === 'WARNING');
    if (critical.length > 0) {
      parts.push(`Critical: ${critical.map((e) => e.ruleId).join(', ')}.`);
    }
    if (warning.length > 0) {
      parts.push(`Warning: ${warning.map((e) => e.ruleId).join(', ')}.`);
    }
  }
  parts.push(`Has critical failure: ${verdict.hasCriticalFailure}.`);
  parts.push(verdict.explanation);
  return parts.join(' ');
}
