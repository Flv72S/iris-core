/**
 * UserPreferenceValue — Valore esplicito dichiarato dall'utente.
 * No confidence, priority, inferred, learned, sourceScore.
 */

export type UserPreferenceValue =
  | { readonly type: 'BOOLEAN'; readonly value: boolean }
  | { readonly type: 'ENUM'; readonly value: string };
