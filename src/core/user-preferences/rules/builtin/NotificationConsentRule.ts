/**
 * NotificationConsentRule — Se feature può inviare notifica e notifications.enabled === false → BLOCKED.
 */

import type { UserPreferenceRule } from '../UserPreferenceRule';
import type { UserPreferenceStore } from '../../store/UserPreferenceStore';
import type { UserPreferenceContext } from '../UserPreferenceContext';
import type { FeaturePolicyDecision } from '../../../policies/FeaturePolicyDecision';

export const NOTIFICATION_CONSENT_RULE_ID = 'notification-consent';

const NOTIFICATIONS_PREFERENCE_ID = 'notifications.enabled';

export const NotificationConsentRule: UserPreferenceRule = Object.freeze({
  id: NOTIFICATION_CONSENT_RULE_ID,
  evaluate(store: UserPreferenceStore, context: UserPreferenceContext): FeaturePolicyDecision {
    if (context.maySendNotification !== true) return { status: 'ALLOWED' };
    const pref = store.get(NOTIFICATIONS_PREFERENCE_ID);
    if (pref == null) return { status: 'ALLOWED' };
    if (pref.value.type !== 'BOOLEAN') return { status: 'ALLOWED' };
    if (pref.value.value === false) {
      return { status: 'BLOCKED', reason: 'User disabled notifications' };
    }
    return { status: 'ALLOWED' };
  },
});
