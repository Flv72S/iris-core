/**
 * UserPreferenceRule — Regola che usa preferenze esplicite. Non esegue, non inferisce.
 */

import type { UserPreferenceStore } from '../store/UserPreferenceStore';
import type { UserPreferenceContext } from './UserPreferenceContext';
import type { FeaturePolicyDecision } from '../../policies/FeaturePolicyDecision';

export interface UserPreferenceRule {
  readonly id: string;
  evaluate(
    store: UserPreferenceStore,
    context: UserPreferenceContext
  ): FeaturePolicyDecision;
}
