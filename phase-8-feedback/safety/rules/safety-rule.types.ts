export type SafetyRuleSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type SafetyRuleScope = 'SINGLE_OUTCOME' | 'OUTCOME_SEQUENCE';

export interface SafetyRule {
  readonly id: string;
  readonly version: string;
  readonly description: string;
  readonly severity: SafetyRuleSeverity;
  readonly scope: SafetyRuleScope;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly deterministicHash: string;
}
