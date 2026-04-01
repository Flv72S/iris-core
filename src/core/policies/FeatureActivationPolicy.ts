/**
 * FeatureActivationPolicy — Regola dichiarativa. Non esegue, autorizza o nega.
 */

import type { FeaturePolicyInput } from './FeaturePolicyInput';
import type { FeaturePolicyDecision } from './FeaturePolicyDecision';

export interface FeatureActivationPolicy {
  readonly id: string;
  evaluate(input: FeaturePolicyInput): FeaturePolicyDecision;
}
