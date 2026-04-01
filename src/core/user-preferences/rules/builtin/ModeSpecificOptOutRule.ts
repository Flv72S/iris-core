/**
 * ModeSpecificOptOutRule — Se preferenza mode.<mode>.enabled === false → BLOCKED per tutte le feature in quel mode.
 */

import type { UserPreferenceRule } from '../UserPreferenceRule';
import type { UserPreferenceStore } from '../../store/UserPreferenceStore';
import type { UserPreferenceContext } from '../UserPreferenceContext';
import type { FeaturePolicyDecision } from '../../../policies/FeaturePolicyDecision';

export const MODE_SPECIFIC_OPT_OUT_RULE_ID = 'mode-specific-opt-out';

function preferenceIdForMode(mode: string): string {
  return `mode.${mode}.enabled`;
}

export const ModeSpecificOptOutRule: UserPreferenceRule = Object.freeze({
  id: MODE_SPECIFIC_OPT_OUT_RULE_ID,
  evaluate(store: UserPreferenceStore, context: UserPreferenceContext): FeaturePolicyDecision {
    const pref = store.get(preferenceIdForMode(context.productMode));
    if (pref == null) return { status: 'ALLOWED' };
    if (pref.value.type !== 'BOOLEAN') return { status: 'ALLOWED' };
    if (pref.value.value === false) {
      return { status: 'BLOCKED', reason: 'User disabled this mode' };
    }
    return { status: 'ALLOWED' };
  },
});
