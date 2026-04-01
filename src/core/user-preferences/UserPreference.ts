/**
 * UserPreference — Singola preferenza esplicita. User-owned.
 * No: confidence, priority, inferred, learned, sourceScore.
 */

import type { UserPreferenceValue } from './UserPreferenceValue';

export type UserPreference = {
  readonly id: string;
  readonly value: UserPreferenceValue;
  readonly updatedAt: number;
};
