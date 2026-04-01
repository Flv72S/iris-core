/**
 * Phase 11C.3 / 11C.3.1 — SLA Consensus Verifier.
 * Deterministic: extract consensus/SLA node IDs, compute mismatch, classify status.
 */

import type { ConsensusResult } from '../../node_consensus/types/consensus_engine_types.js';
import type { LocalNodeSLA } from '../types/cross_tenant_sla_types.js';
import type { SLAConsensusCheckResult } from './sla_consensus_types.js';

export function extractConsensusNodeIds(consensusResult: ConsensusResult): string[] {
  return [...new Set(consensusResult.consensus_proof.participating_nodes)].sort();
}

export function extractSlaNodeIds(nodeSlas: readonly LocalNodeSLA[]): string[] {
  return [...new Set(nodeSlas.map((s) => s.node_id))].sort();
}

export function verifySlaConsensusAlignment(
  consensusResult: ConsensusResult,
  nodeSlas: readonly LocalNodeSLA[]
): SLAConsensusCheckResult {
  const consensus_hash = consensusResult.consensus_proof.consensus_hash;
  const consensus_nodes = extractConsensusNodeIds(consensusResult);
  const sla_nodes = extractSlaNodeIds(nodeSlas);

  const consensusSet = new Set(consensus_nodes);
  const slaSet = new Set(sla_nodes);

  const nodes_missing_sla = consensus_nodes.filter((id) => !slaSet.has(id));
  const nodes_outside_consensus = sla_nodes.filter((id) => !consensusSet.has(id));

  if (consensus_nodes.length === 0) {
    return Object.freeze({
      consensus_hash,
      consensus_nodes: [],
      sla_nodes,
      nodes_missing_sla: [],
      nodes_outside_consensus: [...sla_nodes].sort(),
      mismatch_ratio: 1,
      verification_status: 'ERROR',
    });
  }

  const mismatch_count = nodes_missing_sla.length + nodes_outside_consensus.length;
  const mismatch_ratio = mismatch_count / consensus_nodes.length;

  let verification_status: SLAConsensusCheckResult['verification_status'];
  if (mismatch_count === 0) verification_status = 'OK';
  else if (mismatch_ratio < 0.2) verification_status = 'WARNING';
  else verification_status = 'ERROR';

  return Object.freeze({
    consensus_hash,
    consensus_nodes,
    sla_nodes,
    nodes_missing_sla: [...nodes_missing_sla].sort(),
    nodes_outside_consensus: [...nodes_outside_consensus].sort(),
    mismatch_ratio,
    verification_status,
  });
}
