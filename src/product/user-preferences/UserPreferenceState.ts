// User Preferences restrict execution.
// They never enable, prioritize, or override system decisions.

/**
 * UserPreferenceState — Stato dichiarato dall'utente. Solo restringe; nessun default implicito.
 * Deep-frozen when used.
 */
export type UserPreferenceState = {
  readonly disabledFeatures?: readonly string[];
  readonly disabledCategories?: readonly string[];
};
