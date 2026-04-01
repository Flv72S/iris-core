// User Preferences restrict execution.
// They never enable, prioritize, or override system decisions.

export type UserPreferenceDecision =
  | { readonly status: 'ALLOWED' }
  | { readonly status: 'BLOCKED'; readonly reason: string };
