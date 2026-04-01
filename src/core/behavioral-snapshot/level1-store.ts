/**
 * Behavioral Snapshot Level 1 — store (6.2.2)
 *
 * Shadow, minimale, non queryabile per feature.
 * Leggibile solo da livelli successivi (6.3+). Tollerante alla perdita.
 */

import type { ThreadSnapshotL1 } from './level1-types';
import type { UserSnapshotL1 } from './level1-types';

export interface BehavioralSnapshotL1Store {
  writeThreadSnapshot(threadId: string, data: ThreadSnapshotL1): void;
  writeUserSnapshot(userId: string, data: UserSnapshotL1): void;
}

/** Store in-memory L1. Solo per test/observability: readForTest. */
export class InMemoryBehavioralSnapshotL1Store implements BehavioralSnapshotL1Store {
  private readonly threads = new Map<string, ThreadSnapshotL1>();
  private readonly users = new Map<string, UserSnapshotL1>();

  writeThreadSnapshot(threadId: string, data: ThreadSnapshotL1): void {
    try {
      this.threads.set(threadId, { ...data });
    } catch {
      // perdita tollerata
    }
  }

  writeUserSnapshot(userId: string, data: UserSnapshotL1): void {
    try {
      this.users.set(userId, { ...data });
    } catch {
      // perdita tollerata
    }
  }

  /** Solo per test. Non usare dal dominio o da feature. */
  getThreadSnapshotForTest(threadId: string): ThreadSnapshotL1 | null {
    return this.threads.get(threadId) ?? null;
  }

  /** Solo per test. Non usare dal dominio o da feature. */
  getUserSnapshotForTest(userId: string): UserSnapshotL1 | null {
    return this.users.get(userId) ?? null;
  }

  /** Cancellazione immediata per privacy (6.2.3). Solo dati shadow. */
  clearForPrivacy(): void {
    this.threads.clear();
    this.users.clear();
  }
}

/** Store NoOp: nessuna scrittura, nessun effetto. Disattivazione completa. */
export class NoOpBehavioralSnapshotL1Store implements BehavioralSnapshotL1Store {
  writeThreadSnapshot(_threadId: string, _data: ThreadSnapshotL1): void {}
  writeUserSnapshot(_userId: string, _data: UserSnapshotL1): void {}
  clearForPrivacy(): void {}
}
