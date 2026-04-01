/**
 * Phase 10.2 — Static closed templates (no synonyms, no stylistic variation)
 */

import type { ProductBehaviorMode } from '../trace/decision-trace.types';

const T_EXEC_ALLOWED =
  'The action was executed because it was allowed by system policy and not blocked by wellbeing constraints.';
const T_EXEC_BLOCKED =
  'The action was not executed because it was blocked by system policy or safety constraints.';
const T_EXEC_FAILED = 'The action execution completed with a failure status.';
const T_WHY_ALLOWED =
  'Resolution state allowed the action. Policy and mode did not prohibit execution.';
const T_WHY_BLOCKED = 'Resolution state or policy blocked the action.';
const T_WHY_NOT =
  'The action was not performed due to policy block or safety constraint.';
const T_MODE_DEFAULT =
  'Active mode is DEFAULT. Balanced behavior with neutral safety interpretation.';
const T_MODE_FOCUS =
  'Active mode is FOCUS. Strict behavior minimizing interruptions.';
const T_MODE_WELLBEING =
  'Active mode is WELLBEING. Protective behavior prioritizing user wellbeing.';
const T_SAFETY_NEUTRAL =
  'Safety checklist outcome was recorded. No override of safety rules.';
const T_OUTCOME_RECORDED = 'Outcome was appended to the certified outcome log.';

export function getExecutionTemplate(
  executionSummary: string,
  resolutionSummary: string
): string {
  if (executionSummary === 'EXECUTION_FAILED') return T_EXEC_FAILED;
  if (
    resolutionSummary.includes('BLOCKED') ||
    resolutionSummary.includes('blocked')
  )
    return T_EXEC_BLOCKED;
  return T_EXEC_ALLOWED;
}

export function getWhyTemplate(resolutionSummary: string): string {
  if (
    resolutionSummary.includes('BLOCKED') ||
    resolutionSummary.includes('blocked')
  )
    return T_WHY_BLOCKED;
  return T_WHY_ALLOWED;
}

export function getWhyNotTemplate(resolutionSummary: string): string {
  if (
    resolutionSummary.includes('ALLOWED') &&
    !resolutionSummary.includes('BLOCKED')
  )
    return 'The action was performed. No block applied.';
  return T_WHY_NOT;
}

export function getModeTemplate(mode: ProductBehaviorMode): string {
  switch (mode) {
    case 'DEFAULT':
      return T_MODE_DEFAULT;
    case 'FOCUS':
      return T_MODE_FOCUS;
    case 'WELLBEING':
      return T_MODE_WELLBEING;
    default:
      return T_MODE_DEFAULT;
  }
}

export function getSafetyTemplate(): string {
  return T_SAFETY_NEUTRAL;
}

export function getOutcomeTemplate(): string {
  return T_OUTCOME_RECORDED;
}
