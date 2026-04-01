/**
 * UserPreferenceStore — Lettura preferenze. In-memory, deterministico.
 */

import type { UserPreference } from '../UserPreference';

export interface UserPreferenceStore {
  get(id: string): UserPreference | null;
  getAll(): readonly UserPreference[];
}
