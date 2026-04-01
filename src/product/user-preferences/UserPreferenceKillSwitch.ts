// User Preferences restrict execution.
// They never enable, prioritize, or override system decisions.

export type UserPreferenceKillSwitchRegistry = Record<string, boolean>;

export const USER_PREFERENCE_COMPONENT_ID = 'user-preferences';

/**
 * Default ON. Se OFF → tutte le preferenze ignorate. Le policy restano sempre attive.
 */
export function isUserPreferenceEnabled(
  registry: UserPreferenceKillSwitchRegistry | undefined,
  componentId: string
): boolean {
  if (registry == null) return true;
  return registry[componentId] !== false;
}
