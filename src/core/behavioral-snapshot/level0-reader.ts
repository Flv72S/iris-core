/**
 * Behavioral Snapshot Level 0 — interfaccia di lettura (6.2.1)
 *
 * Il Livello 1 dipende solo da questa interfaccia per leggere L0.
 * Nessun evento, nessun dominio.
 */

import type { ThreadSnapshotL0 } from './level0-types';
import type { UserSnapshotL0 } from './level0-types';

export interface BehavioralSnapshotL0Reader {
  getThreadSnapshot(threadId: string): ThreadSnapshotL0 | null;
  getUserSnapshot(userId: string): UserSnapshotL0 | null;
  /** Id thread per cui esiste uno snapshot L0. Consente al deriver L1 di iterare. */
  getKnownThreadIds(): string[];
  /** Id utenti per cui esiste uno snapshot L0. Consente al deriver L1 di iterare. */
  getKnownUserIds(): string[];
}
