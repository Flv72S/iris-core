/**
 * Phase 14F — Consensus Coordination Layer. Proposal validation.
 */

import type { ConsensusProposal } from './consensus_types.js';
import { ConsensusError, ConsensusErrorCode } from './consensus_errors.js';
import type { NodeIdentityRegistry } from '../node_identity/index.js';

export interface ConsensusValidatorConfig {
  /** Optional: if provided, author_node must be ACTIVE in registry. */
  readonly node_registry?: NodeIdentityRegistry;
}

function isHexSha256(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

export class ConsensusValidator {
  private static config: ConsensusValidatorConfig = Object.freeze({});

  static configure(config: ConsensusValidatorConfig): void {
    this.config = Object.freeze({ ...config });
  }

  static validateProposal(proposal: ConsensusProposal): boolean {
    if (proposal == null || typeof proposal !== 'object') {
      throw new ConsensusError(ConsensusErrorCode.INVALID_PROPOSAL, 'Proposal is null or not an object');
    }
    if (typeof proposal.proposal_id !== 'string' || proposal.proposal_id.length === 0) {
      throw new ConsensusError(ConsensusErrorCode.INVALID_PROPOSAL, 'Invalid proposal_id');
    }
    if (typeof proposal.author_node !== 'string' || proposal.author_node.length === 0) {
      throw new ConsensusError(ConsensusErrorCode.INVALID_PROPOSAL, 'Invalid author_node');
    }
    if (typeof proposal.state_version !== 'number' || !Number.isFinite(proposal.state_version) || proposal.state_version < 0) {
      throw new ConsensusError(ConsensusErrorCode.INVALID_PROPOSAL, 'Invalid state_version');
    }
    if (typeof proposal.diff_hash !== 'string' || !isHexSha256(proposal.diff_hash)) {
      throw new ConsensusError(ConsensusErrorCode.INVALID_PROPOSAL, 'Invalid diff_hash');
    }
    if (typeof proposal.created_at !== 'number' || !Number.isFinite(proposal.created_at) || proposal.created_at < 0) {
      throw new ConsensusError(ConsensusErrorCode.INVALID_PROPOSAL, 'Invalid created_at');
    }

    const registry = this.config.node_registry;
    if (registry) {
      if (!registry.isActive(proposal.author_node)) {
        throw new ConsensusError(
          ConsensusErrorCode.INVALID_PROPOSAL,
          `Unauthorized author node (not ACTIVE): ${proposal.author_node}`
        );
      }
    }
    return true;
  }
}
