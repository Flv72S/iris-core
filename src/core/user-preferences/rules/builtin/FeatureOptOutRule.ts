/**
 * FeatureOptOutRule — Se preferenza feature.<id>.enabled === false → BLOCKED.
 */

import type { UserPreferenceRule } from '../UserPreferenceRule';
import type { UserPreferenceStore } from '../../store/UserPreferenceStore';
import type { UserPreferenceContext } from '../UserPreferenceContext';
import type { FeaturePolicyDecision } from '../../../policies/FeaturePolicyDecision';

export const FEATURE_OPT_OUT_RULE_ID = 'feature-opt-out';

function preferenceIdForFeature(featureId: string): string {
  return `feature.${featureId}.enabled`;
}

export const FeatureOptOutRule: UserPreferenceRule = Object.freeze({
  id: FEATURE_OPT_OUT_RULE_ID,
  evaluate(store: UserPreferenceStore, context: UserPreferenceContext): FeaturePolicyDecision {
    const pref = store.get(preferenceIdForFeature(context.featureId));
    if (pref == null) return { status: 'ALLOWED' };
    if (pref.value.type !== 'BOOLEAN') return { status: 'ALLOWED' };
    if (pref.value.value === false) {
      return { status: 'BLOCKED', reason: 'User disabled this feature' };
    }
    return { status: 'ALLOWED' };
  },
});
