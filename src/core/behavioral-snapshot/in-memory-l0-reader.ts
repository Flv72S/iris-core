/**
 * Reader L0 in-memory — solo per test e wiring (6.2.2)
 *
 * Implementazione minimale di BehavioralSnapshotL0Reader.
 * Permette di popolare dati L0 e far girare il deriver L1 senza un vero store L0.
 */

import type { BehavioralSnapshotL0Reader } from './level0-reader';
import type { ThreadSnapshotL0 } from './level0-types';
import type { UserSnapshotL0 } from './level0-types';

export class InMemoryBehavioralSnapshotL0Reader implements BehavioralSnapshotL0Reader {
  private readonly threads = new Map<string, ThreadSnapshotL0>();
  private readonly users = new Map<string, UserSnapshotL0>();

  setThreadSnapshot(threadId: string, data: ThreadSnapshotL0): void {
    this.threads.set(threadId, { ...data });
  }

  setUserSnapshot(userId: string, data: UserSnapshotL0): void {
    this.users.set(userId, { ...data });
  }

  getThreadSnapshot(threadId: string): ThreadSnapshotL0 | null {
    return this.threads.get(threadId) ?? null;
  }

  getUserSnapshot(userId: string): UserSnapshotL0 | null {
    return this.users.get(userId) ?? null;
  }

  getKnownThreadIds(): string[] {
    return Array.from(this.threads.keys());
  }

  getKnownUserIds(): string[] {
    return Array.from(this.users.keys());
  }

  /** Cancellazione immediata per privacy (6.2.3). Solo dati shadow. */
  clearForPrivacy(): void {
    this.threads.clear();
    this.users.clear();
  }
}
