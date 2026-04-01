/**
 * S-1 — Deterministic network partition manager.
 */

import type { PartitionSpec } from './NetworkTypes.js';

export class NetworkPartitionManager {
  private _partitions: Map<string, PartitionSpec> = new Map();

  private _key(a: string, b: string): string {
    return a < b ? a + '|' + b : b + '|' + a;
  }

  partition(clusterA: string, clusterB: string): void {
    const key = this._key(clusterA, clusterB);
    this._partitions.set(key, Object.freeze({ clusterA, clusterB, active: true }));
  }

  heal(clusterA: string, clusterB: string): void {
    const key = this._key(clusterA, clusterB);
    this._partitions.set(key, Object.freeze({ clusterA, clusterB, active: false }));
  }

  isPartitioned(clusterA: string, clusterB: string): boolean {
    const spec = this._partitions.get(this._key(clusterA, clusterB));
    return spec?.active === true;
  }

  getPartitions(): readonly PartitionSpec[] {
    return [...this._partitions.values()];
  }
}
