/**
 * Snapshot Deriver Level 1 — derivazione da L0 (6.2.2)
 *
 * Legge solo dal Livello 0. Scrive solo su Livello 1.
 * Trasformazioni consentite: normalizzazione, Δ, rapporti, smoothing, last-known-state.
 * Nessuna soglia, euristica, peso semantico, inferenza.
 */

import type { BehavioralSnapshotL0Reader } from './level0-reader';
import type { ThreadSnapshotL0 } from './level0-types';
import type { UserSnapshotL0 } from './level0-types';
import type { BehavioralSnapshotL1Store } from './level1-store';
import type { ThreadSnapshotL1, UserSnapshotL1 } from './level1-types';

/** Finestra temporale fissa (ms) per normalizzazione frequenza. Default 1h. */
const DEFAULT_WINDOW_MS = 60 * 60 * 1000;

export interface SnapshotDeriverLevel1Options {
  /** Finestra (ms) per normalizzare frequenza. Default 3600000. */
  normalizationWindowMs?: number;
}

export class SnapshotDeriverLevel1 {
  private readonly l0Reader: BehavioralSnapshotL0Reader;
  private readonly l1Store: BehavioralSnapshotL1Store;
  private readonly windowMs: number;
  private lastThreadL0 = new Map<string, ThreadSnapshotL0>();
  private lastUserL0 = new Map<string, UserSnapshotL0>();

  constructor(
    l0Reader: BehavioralSnapshotL0Reader,
    l1Store: BehavioralSnapshotL1Store,
    options?: SnapshotDeriverLevel1Options
  ) {
    this.l0Reader = l0Reader;
    this.l1Store = l1Store;
    this.windowMs = options?.normalizationWindowMs ?? DEFAULT_WINDOW_MS;
  }

  /**
   * Deriva snapshot L1 da L0. Legge solo da L0, scrive solo su L1.
   * Tollerante a L0 vuoto o errore: non propaga.
   */
  derive(): void {
    try {
      this.deriveThreads();
      this.deriveUsers();
    } catch {
      // degradazione: L1 non rompe l'app
    }
  }

  private deriveThreads(): void {
    const threadIds = this.l0Reader.getKnownThreadIds();
    for (const threadId of threadIds) {
      const current = this.l0Reader.getThreadSnapshot(threadId);
      if (current == null) continue;
      const previous = this.lastThreadL0.get(threadId);
      const normalizedFrequency =
        this.windowMs > 0 ? (current.rawFrequency / this.windowMs) * DEFAULT_WINDOW_MS : current.rawFrequency;
      const temporalDensity = current.messageCount > 0 ? current.rawFrequency / current.messageCount : 0;
      const frequencyDelta = previous != null ? current.rawFrequency - previous.rawFrequency : 0;
      const now = Date.now();
      const technicalInactivityMs = Math.max(0, now - current.lastMessageTimestamp);
      this.lastThreadL0.set(threadId, current);
      this.l1Store.writeThreadSnapshot(threadId, {
        normalizedFrequency,
        temporalDensity,
        frequencyDelta,
        technicalInactivityMs,
      });
    }
  }

  private deriveUsers(): void {
    const userIds = this.l0Reader.getKnownUserIds();
    for (const userId of userIds) {
      const current = this.l0Reader.getUserSnapshot(userId);
      if (current == null) continue;
      const previous = this.lastUserL0.get(userId);
      const totalBucket = current.bucketCounts.reduce((a, b) => a + b, 0);
      const bucketDistributionPercent =
        totalBucket > 0
          ? current.bucketCounts.map((c) => (c / totalBucket) * 100)
          : current.bucketCounts.map(() => 0);
      const normalizedFrequency =
        this.windowMs > 0
          ? (current.messageCount / this.windowMs) * DEFAULT_WINDOW_MS
          : current.messageCount;
      const activityDelta = previous != null ? current.messageCount - previous.messageCount : 0;
      const now = Date.now();
      const timeSinceLastActivityMs = Math.max(0, now - current.lastActivityTimestamp);
      this.lastUserL0.set(userId, current);
      this.l1Store.writeUserSnapshot(userId, {
        normalizedFrequency,
        activityDelta,
        timeSinceLastActivityMs,
        bucketDistributionPercent,
      });
    }
  }
}
