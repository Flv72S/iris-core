/**
 * Phase 14F.1 — Consensus Observability Hook. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ConsensusCoordinator,
  ConsensusQuorum,
  ConsensusValidator,
  type ConsensusProposal,
  type ConsensusResult,
  type ConsensusVote,
  type ConsensusTransport,
  type IConsensusObserver,
} from '../index.js';

class MockObserver implements IConsensusObserver {
  proposals: ConsensusProposal[] = [];
  votes: ConsensusVote[] = [];
  results: ConsensusResult[] = [];
  failures: ConsensusProposal[] = [];

  onProposalCreated(p: ConsensusProposal): void {
    this.proposals.push(p);
  }
  onVoteCollected(v: ConsensusVote): void {
    this.votes.push(v);
  }
  onConsensusReached(r: ConsensusResult): void {
    this.results.push(r);
  }
  onConsensusFailed(p: ConsensusProposal): void {
    this.failures.push(p);
  }
}

function proposal(overrides: Partial<ConsensusProposal> & { proposal_id: string }): ConsensusProposal {
  return {
    proposal_id: overrides.proposal_id,
    author_node: overrides.author_node ?? 'n1',
    state_version: overrides.state_version ?? 1,
    diff_hash: overrides.diff_hash ?? 'a'.repeat(64),
    created_at: overrides.created_at ?? 1000,
  };
}

describe('Consensus Observer (14F.1)', () => {
  it('tracks proposal created', async () => {
    ConsensusValidator.configure({});
    ConsensusQuorum.configure({ quorum_ratio: 2 / 3 });
    const observer = new MockObserver();
    const transport: ConsensusTransport = {
      async broadcastProposal(): Promise<void> {},
      async collectVotes(): Promise<ConsensusVote[]> {
        return [];
      },
      async getTotalActiveNodes(): Promise<number> {
        return 1;
      },
    };
    const coordinator = new ConsensusCoordinator(transport, observer);
    await coordinator.proposeUpdate(proposal({ proposal_id: 'p1' }));
    assert.strictEqual(observer.proposals.length, 1);
  });

  it('tracks vote collection and emits votes in deterministic order', async () => {
    ConsensusValidator.configure({});
    ConsensusQuorum.configure({ quorum_ratio: 2 / 3 });
    const observer = new MockObserver();
    const votes: ConsensusVote[] = [
      { node_id: 'b', proposal_id: 'p1', accepted: true, timestamp: 2 },
      { node_id: 'a', proposal_id: 'p1', accepted: true, timestamp: 3 },
      { node_id: 'a', proposal_id: 'p1', accepted: true, timestamp: 1 },
    ];
    const transport: ConsensusTransport = {
      async broadcastProposal(): Promise<void> {},
      async collectVotes(): Promise<ConsensusVote[]> {
        return [votes[0], votes[1], votes[2]];
      },
      async getTotalActiveNodes(): Promise<number> {
        return 3;
      },
    };
    const coordinator = new ConsensusCoordinator(transport, observer);
    await coordinator.proposeUpdate(proposal({ proposal_id: 'p1' }));
    assert.strictEqual(observer.votes.length, 3);
    // sorted by node_id then timestamp => a(t=1), a(t=3), b(t=2)
    assert.strictEqual(observer.votes[0].node_id, 'a');
    assert.strictEqual(observer.votes[0].timestamp, 1);
    assert.strictEqual(observer.votes[1].node_id, 'a');
    assert.strictEqual(observer.votes[1].timestamp, 3);
    assert.strictEqual(observer.votes[2].node_id, 'b');
  });

  it('tracks consensus success', async () => {
    ConsensusValidator.configure({});
    ConsensusQuorum.configure({ quorum_ratio: 2 / 3 });
    const observer = new MockObserver();
    const transport: ConsensusTransport = {
      async broadcastProposal(): Promise<void> {},
      async collectVotes(): Promise<ConsensusVote[]> {
        return [
          { node_id: 'a', proposal_id: 'p1', accepted: true, timestamp: 1 },
          { node_id: 'b', proposal_id: 'p1', accepted: true, timestamp: 1 },
        ];
      },
      async getTotalActiveNodes(): Promise<number> {
        return 3;
      },
    };
    const coordinator = new ConsensusCoordinator(transport, observer);
    await coordinator.proposeUpdate(proposal({ proposal_id: 'p1' }));
    assert.strictEqual(observer.results.length, 1);
    assert.strictEqual(observer.failures.length, 0);
  });

  it('tracks consensus failure when quorum not reached', async () => {
    ConsensusValidator.configure({});
    ConsensusQuorum.configure({ quorum_ratio: 2 / 3 });
    const observer = new MockObserver();
    const transport: ConsensusTransport = {
      async broadcastProposal(): Promise<void> {},
      async collectVotes(): Promise<ConsensusVote[]> {
        return [{ node_id: 'a', proposal_id: 'p1', accepted: true, timestamp: 1 }];
      },
      async getTotalActiveNodes(): Promise<number> {
        return 3;
      },
    };
    const coordinator = new ConsensusCoordinator(transport, observer);
    await coordinator.proposeUpdate(proposal({ proposal_id: 'p1' }));
    assert.strictEqual(observer.results.length, 0);
    assert.strictEqual(observer.failures.length, 1);
  });
});

