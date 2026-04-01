import type { SafetyRuleEvaluation } from '../evaluation/safety-evaluation.types';
import type { SafetyChecklistStatus, SafetyChecklistVerdict } from './safety-checklist.types';

export function aggregateSafetyEvaluations(
  evaluations: readonly SafetyRuleEvaluation[]
): SafetyChecklistVerdict {
  const failed = evaluations.filter((e) => e.verdict === 'FAIL');
  const hasCriticalFailure = failed.some((e) => e.severity === 'CRITICAL');
  const hasWarningFailure = failed.some((e) => e.severity === 'WARNING');

  let status: SafetyChecklistStatus;
  if (hasCriticalFailure) status = 'UNSAFE';
  else if (hasWarningFailure || failed.length > 0) status = 'WARNING';
  else status = 'SAFE';

  const violatedRules = [...new Set(failed.map((e) => e.ruleId))].sort();
  const explanation =
    status === 'SAFE'
      ? 'All rules passed; no violations.'
      : status === 'UNSAFE'
        ? `Critical failure(s): ${failed.filter((e) => e.severity === 'CRITICAL').map((e) => e.ruleId).join(', ')}.`
        : `Warning(s): ${failed.map((e) => e.ruleId).join(', ')}.`;

  return Object.freeze({
    status,
    violatedRules: Object.freeze(violatedRules) as readonly string[],
    hasCriticalFailure,
    explanation,
  });
}
