/**
 * UxStateSnapshot — C.6
 * Snapshot immutabile degli stati UX. Ordine preservato, nessuna deduplicazione semantica.
 */

import type { UxState } from './UxState';

export interface UxStateSnapshot {
  readonly states: readonly UxState[];
  readonly derivedAt: number;
}
