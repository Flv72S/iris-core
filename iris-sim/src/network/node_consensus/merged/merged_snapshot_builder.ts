/**
 * Phase 11A — Build and validate merged (agreed) governance snapshot.
 */

import type { SnapshotData, MergedGovernanceSnapshot } from '../types/consensus_engine_types.js';
import { CONSENSUS_ENGINE_SCHEMA_VERSION } from '../types/consensus_engine_types.js';

/**
 * Build merged snapshot from chosen snapshot data and participating node ids.
 */
export function buildMergedSnapshot(
  chosen: SnapshotData,
  participatingNodeIds: readonly string[]
): MergedGovernanceSnapshot {
  return Object.freeze({
    snapshot: chosen.governance_state,
    participating_node_ids: participatingNodeIds,
    chosen_node_id: chosen.node_id,
    version: CONSENSUS_ENGINE_SCHEMA_VERSION,
  });
}

/**
 * Validate merged snapshot: chosen snapshot is included in participating set and has required fields.
 */
export function validateMergedSnapshot(merged: MergedGovernanceSnapshot): boolean {
  if (!merged.participating_node_ids.includes(merged.chosen_node_id)) return false;
  if (!merged.snapshot?.global_hash) return false;
  if (merged.version !== CONSENSUS_ENGINE_SCHEMA_VERSION) return false;
  return true;
}
