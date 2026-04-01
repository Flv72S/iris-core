import type { BehaviorMode } from '../definition/mode.types';

export type SafetyVerdict = 'SAFE' | 'CAUTION' | 'UNSAFE' | 'BLOCKED';

export interface SafetyChecklistVerdictInput {
  readonly verdict: SafetyVerdict;
  readonly violatedRules: readonly string[];
  readonly certifiedAt: string;
}

export type InterpretedRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RecommendedAction = 'PROCEED' | 'PROCEED_WITH_LIMITS' | 'ESCALATE' | 'BLOCK_RECOMMENDED';

export interface SafetyInterpretation {
  readonly baseVerdict: SafetyVerdict;
  readonly interpretedRiskLevel: InterpretedRiskLevel;
  readonly recommendedAction: RecommendedAction;
  readonly mode: BehaviorMode;
  readonly explanation: string;
}
