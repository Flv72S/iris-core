/**
 * Microstep 10L — Governance Consensus Preparation Layer. Consensus context builder.
 */

import type { ConsensusProposal, QuorumDefinition, ConsensusContext } from '../types/consensus_types.js';

/**
 * Build full consensus context (proposal + quorum).
 */
export function buildConsensusContext(
  proposal: ConsensusProposal,
  quorum: QuorumDefinition
): ConsensusContext {
  return Object.freeze({
    proposal,
    quorum,
  });
}
