// User Preferences restrict execution.
// They never enable, prioritize, or override system decisions.

import type { UserPreferenceState } from './UserPreferenceState';
import type { UserPreferenceDecision } from './UserPreferenceDecision';

/**
 * Valuta una singola feature rispetto alle preferenze.
 * Nessuna priorità, nessun punteggio, nessun override.
 * Se preferences è undefined → ALLOWED.
 */
export function evaluatePreference(
  featureId: string,
  featureCategory: string | undefined,
  preferences: UserPreferenceState | undefined
): UserPreferenceDecision {
  if (preferences == null) return { status: 'ALLOWED' };

  const disabledFeatures = preferences.disabledFeatures;
  if (disabledFeatures != null && disabledFeatures.includes(featureId)) {
    return Object.freeze({ status: 'BLOCKED', reason: 'User disabled this feature' });
  }

  const disabledCategories = preferences.disabledCategories;
  if (disabledCategories != null && featureCategory != null && disabledCategories.includes(featureCategory)) {
    return Object.freeze({ status: 'BLOCKED', reason: 'User disabled this category' });
  }

  return { status: 'ALLOWED' };
}
