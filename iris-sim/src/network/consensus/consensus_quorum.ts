/**
 * Phase 14F — Consensus Coordination Layer. Quorum engine.
 */

import type { ConsensusVote } from './consensus_types.js';

export interface QuorumConfig {
  /** Fraction in (0,1]. Default: 2/3. */
  readonly quorum_ratio: number;
}

const DEFAULT_CONFIG: QuorumConfig = Object.freeze({ quorum_ratio: 2 / 3 });

function requiredVotes(total_nodes: number, ratio: number): number {
  const r = Math.max(0, Math.min(1, ratio));
  return Math.max(1, Math.ceil(total_nodes * r));
}

export class ConsensusQuorum {
  private static config: QuorumConfig = DEFAULT_CONFIG;

  static configure(config: Partial<QuorumConfig>): void {
    const next: QuorumConfig = Object.freeze({
      quorum_ratio: config.quorum_ratio ?? this.config.quorum_ratio,
    });
    this.config = next;
  }

  /** Default rule: quorum = ceil(2/3 of active nodes). */
  static hasQuorum(votes: readonly ConsensusVote[], total_nodes: number): boolean {
    const required = requiredVotes(total_nodes, this.config.quorum_ratio);
    const accepted = votes.filter((v) => v.accepted).length;
    return accepted >= required;
  }
}
