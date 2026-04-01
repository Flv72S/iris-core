/**
 * InMemoryUserPreferenceStore — Store in-memory, dati congelati. Nessuna persistenza.
 */

import type { UserPreference } from '../UserPreference';
import type { UserPreferenceStore } from './UserPreferenceStore';

export class InMemoryUserPreferenceStore implements UserPreferenceStore {
  private store: ReadonlyMap<string, UserPreference>;

  constructor(initial: readonly UserPreference[] = []) {
    const map = new Map<string, UserPreference>();
    for (const p of initial) {
      map.set(p.id, Object.freeze(p));
    }
    this.store = Object.freeze(new Map(map));
  }

  get(id: string): UserPreference | null {
    return this.store.get(id) ?? null;
  }

  getAll(): readonly UserPreference[] {
    return Object.freeze([...this.store.values()]);
  }
}
