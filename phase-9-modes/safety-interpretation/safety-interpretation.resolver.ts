import type { SafetyChecklistVerdictInput, SafetyInterpretation } from './safety-interpretation.types';
import type { BehaviorMode } from '../definition/mode.types';
import { SAFETY_INTERPRETATION_MATRIX } from './safety-interpretation.contract';

export function interpretSafetyVerdict(verdict: SafetyChecklistVerdictInput, mode: BehaviorMode): SafetyInterpretation {
  const row = SAFETY_INTERPRETATION_MATRIX[mode][verdict.verdict];
  return Object.freeze({
    baseVerdict: verdict.verdict,
    interpretedRiskLevel: row.interpretedRiskLevel,
    recommendedAction: row.recommendedAction,
    mode,
    explanation: row.explanation,
  });
}
