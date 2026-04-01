export type SafetyRuleVerdict = 'PASS' | 'FAIL' | 'NOT_APPLICABLE';

export interface SafetyRuleEvaluation {
  readonly ruleId: string;
  readonly ruleVersion: string;
  readonly verdict: SafetyRuleVerdict;
  readonly severity: string;
  readonly explanation: string;
}

export interface SafetyEvaluationResult {
  readonly evaluations: readonly SafetyRuleEvaluation[];
  readonly hasCriticalFailure: boolean;
}
