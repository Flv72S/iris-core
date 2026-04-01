/**
 * Phase 11C.3 — SLA Consensus Diagnostics builder.
 */

import type { SLAConsensusCheckResult, SLAConsensusDiagnostics } from './sla_consensus_types.js';

export function buildSlaConsensusDiagnostics(result: SLAConsensusCheckResult): SLAConsensusDiagnostics {
  const consensus_node_count = result.consensus_nodes.length;
  const sla_node_count = result.sla_nodes.length;
  const mismatch_count = result.nodes_missing_sla.length + result.nodes_outside_consensus.length;
  return Object.freeze({
    consensus_node_count,
    sla_node_count,
    mismatch_count,
  });
}
