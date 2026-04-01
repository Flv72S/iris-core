/**
 * Phase 14F — Consensus Coordination Layer. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  ConsensusCoordinator,
  ConsensusQuorum,
  ConsensusState,
  ConsensusStateMachine,
  ConsensusValidator,
  ConsensusError,
  ConsensusErrorCode,
  type ConsensusProposal,
  type ConsensusVote,
  type ConsensusTransport,
} from '../index.js';
import { NodeIdentityRegistry } from '../../node_identity/index.js';

function proposal(overrides: Partial<ConsensusProposal> & { proposal_id: string }): ConsensusProposal {
  return {
    proposal_id: overrides.proposal_id,
    author_node: overrides.author_node ?? 'n1',
    state_version: overrides.state_version ?? 1,
    diff_hash: overrides.diff_hash ?? 'a'.repeat(64),
    created_at: overrides.created_at ?? 1000,
  };
}

describe('Consensus Coordination Layer (Phase 14F)', () => {
  describe('proposal validation', () => {
    it('accepts a valid proposal', () => {
      ConsensusValidator.configure({});
      assert.strictEqual(ConsensusValidator.validateProposal(proposal({ proposal_id: 'p1' })), true);
    });

    it('rejects invalid diff_hash', () => {
      ConsensusValidator.configure({});
      assert.throws(
        () => ConsensusValidator.validateProposal(proposal({ proposal_id: 'p1', diff_hash: 'bad' })),
        (e: Error) => e instanceof ConsensusError && e.code === ConsensusErrorCode.INVALID_PROPOSAL
      );
    });

    it('rejects unauthorized author node when registry configured', () => {
      const reg = new NodeIdentityRegistry();
      ConsensusValidator.configure({ node_registry: reg });
      assert.throws(
        () => ConsensusValidator.validateProposal(proposal({ proposal_id: 'p1', author_node: 'unknown' })),
        (e: Error) => e instanceof ConsensusError && e.code === ConsensusErrorCode.INVALID_PROPOSAL
      );
    });

    it('accepts active author node when registry configured', () => {
      const reg = new NodeIdentityRegistry();
      reg.registerNode({ node_id: 'n1', node_type: 'HUMAN', provider: 'P' });
      ConsensusValidator.configure({ node_registry: reg });
      assert.strictEqual(ConsensusValidator.validateProposal(proposal({ proposal_id: 'p1', author_node: 'n1' })), true);
    });
  });

  describe('quorum detection', () => {
    it('default quorum is 2/3 ceil of total nodes', () => {
      ConsensusQuorum.configure({ quorum_ratio: 2 / 3 });
      const votes: ConsensusVote[] = [
        { node_id: 'a', proposal_id: 'p', accepted: true, timestamp: 1 },
        { node_id: 'b', proposal_id: 'p', accepted: true, timestamp: 1 },
      ];
      // total=3 => required=2, accepted=2 => quorum true
      assert.strictEqual(ConsensusQuorum.hasQuorum(votes, 3), true);
      // total=4 => required=3, accepted=2 => false
      assert.strictEqual(ConsensusQuorum.hasQuorum(votes, 4), false);
    });
  });

  describe('state machine transitions', () => {
    it('transitions are deterministic and follow allowed path', () => {
      const sm = new ConsensusStateMachine();
      let s = ConsensusState.PROPOSED;
      s = sm.transition(s, 'START_VOTING');
      assert.strictEqual(s, ConsensusState.VOTING);
      s = sm.transition(s, 'VOTES_ACCEPTED');
      assert.strictEqual(s, ConsensusState.ACCEPTED);
      s = sm.transition(s, 'FINALIZE');
      assert.strictEqual(s, ConsensusState.FINALIZED);
      // FINALIZED stays FINALIZED
      s = sm.transition(s, 'START_VOTING');
      assert.strictEqual(s, ConsensusState.FINALIZED);
    });
  });

  describe('coordinator vote collection and determinism', () => {
    it('same votes across nodes produce identical consensus result', async () => {
      ConsensusValidator.configure({});
      ConsensusQuorum.configure({ quorum_ratio: 2 / 3 });

      const votes: ConsensusVote[] = [
        { node_id: 'b', proposal_id: 'p1', accepted: true, timestamp: 2 },
        { node_id: 'a', proposal_id: 'p1', accepted: true, timestamp: 1 },
        { node_id: 'c', proposal_id: 'p1', accepted: false, timestamp: 3 },
      ];
      const transport: ConsensusTransport = {
        async broadcastProposal(): Promise<void> {},
        async collectVotes(): Promise<ConsensusVote[]> {
          // Return in arbitrary order; coordinator sorts deterministically.
          return [votes[0], votes[2], votes[1]];
        },
        async getTotalActiveNodes(): Promise<number> {
          return 3;
        },
      };
      const coordinator = new ConsensusCoordinator(transport);

      const p = proposal({ proposal_id: 'p1', state_version: 5 });
      const r1 = await coordinator.proposeUpdate(p);
      const r2 = await coordinator.proposeUpdate(p);

      assert.deepStrictEqual(r1, r2);
      assert.strictEqual(r1.quorum_reached, true);
      assert.strictEqual(r1.total_votes, 3);
      assert.strictEqual(r1.accepted, true);
    });

    it('rejects proposal immediately when invalid', async () => {
      ConsensusValidator.configure({});
      const transport: ConsensusTransport = {
        async broadcastProposal(): Promise<void> {
          throw new Error('should not broadcast');
        },
        async collectVotes(): Promise<ConsensusVote[]> {
          return [];
        },
        async getTotalActiveNodes(): Promise<number> {
          return 1;
        },
      };
      const coordinator = new ConsensusCoordinator(transport);
      await assert.rejects(
        async () => coordinator.proposeUpdate(proposal({ proposal_id: 'p1', diff_hash: 'bad' })),
        (e: Error) => e instanceof ConsensusError && e.code === ConsensusErrorCode.INVALID_PROPOSAL
      );
    });
  });
});

