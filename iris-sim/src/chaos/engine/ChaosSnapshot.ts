/**
 * S-2 — Chaos snapshot for restore. Serializable.
 */

import type { ChaosLayerSnapshot } from './ChaosTypes.js';

export interface ChaosSnapshotData {
  readonly tick: string;
  readonly chaosHash: string;
  readonly attackCount: number;
  readonly hardViolationCount: number;
  readonly softEventCount: number;
  readonly metrics: unknown;
}

export function createChaosSnapshot(data: ChaosLayerSnapshot, chaosHash: string): ChaosSnapshotData {
  return Object.freeze({
    tick: data.tick,
    chaosHash,
    attackCount: data.attackCount,
    hardViolationCount: data.hardViolationCount,
    softEventCount: data.softEventCount,
    metrics: data.metricsSnapshot,
  });
}
