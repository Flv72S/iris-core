/**
 * Built-in user preference rules. Explicit, no inference.
 */

export { FeatureOptOutRule, FEATURE_OPT_OUT_RULE_ID } from './FeatureOptOutRule';
export { ModeSpecificOptOutRule, MODE_SPECIFIC_OPT_OUT_RULE_ID } from './ModeSpecificOptOutRule';
export { NotificationConsentRule, NOTIFICATION_CONSENT_RULE_ID } from './NotificationConsentRule';

import type { UserPreferenceRule } from '../UserPreferenceRule';
import { FeatureOptOutRule } from './FeatureOptOutRule';
import { ModeSpecificOptOutRule } from './ModeSpecificOptOutRule';
import { NotificationConsentRule } from './NotificationConsentRule';

export const BUILTIN_PREFERENCE_RULES: readonly UserPreferenceRule[] = Object.freeze([
  FeatureOptOutRule,
  ModeSpecificOptOutRule,
  NotificationConsentRule,
]);
