/**
 * Microstep 10L — Governance Consensus Preparation Layer. Consensus query API.
 */

import type {
  ConsensusContext,
  ConsensusProposal,
  QuorumDefinition,
  GovernanceProof,
} from '../types/consensus_types.js';

/**
 * Get the consensus proposal from context.
 */
export function getConsensusProposal(ctx: ConsensusContext): ConsensusProposal {
  return ctx.proposal;
}

/**
 * Get the quorum definition from context.
 */
export function getConsensusQuorum(ctx: ConsensusContext): QuorumDefinition {
  return ctx.quorum;
}

/**
 * Get the governance proof from context.
 */
export function getGovernanceProof(ctx: ConsensusContext): GovernanceProof {
  return ctx.proposal.proof;
}
