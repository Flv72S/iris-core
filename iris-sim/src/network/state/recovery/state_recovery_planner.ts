/**
 * Phase 14E — State Recovery Engine. Optimal recovery path (deterministic).
 */

import type { RecoveryPlan } from './recovery_types.js';

export interface DiffMeta {
  readonly base_version: number;
  readonly target_version: number;
}

/**
 * Plan recovery path from snapshot_version to target_version.
 * Uses available_diff_ids and getDiffMeta to build shortest valid chain.
 * Returns ordered diff_chain; out-of-order or non-contiguous diffs are excluded.
 */
export class StateRecoveryPlanner {
  static planRecovery(
    snapshot_version: number,
    target_version: number,
    available_diff_ids: readonly string[],
    getDiffMeta: (id: string) => DiffMeta | null
  ): RecoveryPlan {
    if (snapshot_version > target_version) {
      return { snapshot_version, target_version, diff_chain: [] };
    }
    const withMeta: { id: string; base: number; target: number }[] = [];
    for (const id of available_diff_ids) {
      const meta = getDiffMeta(id);
      if (meta == null) continue;
      if (meta.base_version >= snapshot_version && meta.target_version <= target_version) {
        withMeta.push({ id, base: meta.base_version, target: meta.target_version });
      }
    }
    withMeta.sort((a, b) => a.base - b.base || a.target - b.target);

    const chain: string[] = [];
    let current = snapshot_version;
    while (current < target_version) {
      const candidates = withMeta.filter((d) => d.base === current);
      if (candidates.length === 0) break;
      const next = candidates.reduce((best, d) => (d.target > best.target ? d : best));
      chain.push(next.id);
      current = next.target;
    }

    return { snapshot_version, target_version, diff_chain: chain };
  }
}
