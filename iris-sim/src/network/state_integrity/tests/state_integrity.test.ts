/**
 * Microstep 14G — State Integrity Verification. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeStateHash, type NetworkState, type StateMetadata } from '../../state/index.js';
import type { ConsensusProposal, ConsensusResult, ConsensusVote } from '../../consensus/index.js';
import {
  ConsensusTraceObserver,
  ConsensusTraceStore,
  IntegrityViolationType,
  StateIntegrityEngine,
  StateIntegrityValidator,
} from '../index.js';

function metadata(version: number): StateMetadata {
  return {
    version,
    vector_clock: {},
    timestamp: 1000 + version,
    author_node: 'node-0',
  };
}

function state(version: number): NetworkState {
  return {
    metadata: metadata(version),
    nodes: { n1: { node_id: 'n1', passport_version: version, last_seen: 0, status: 'ACTIVE' } },
    trust: {},
    governance: {},
    topology: {},
    policies: {},
  };
}

function proposalForState(state: NetworkState, proposal_id: string): ConsensusProposal {
  return {
    proposal_id,
    author_node: 'node-0',
    state_version: state.metadata.version,
    // In 14F types there is no state_hash field; we use diff_hash as state hash for integrity checks.
    diff_hash: computeStateHash(state).global_hash,
    created_at: state.metadata.timestamp,
  };
}

function acceptedResult(proposal_id: string): ConsensusResult {
  return { proposal_id, accepted: true, quorum_reached: true, total_votes: 3 };
}

describe('State Integrity Verification (14G)', () => {
  describe('valid state', () => {
    it('state matches consensus traces → valid=true', () => {
      const s = state(1);
      const store = new ConsensusTraceStore();
      const p = proposalForState(s, 'p1');
      store.registerProposal(p);
      const votes: ConsensusVote[] = [
        { node_id: 'a', proposal_id: 'p1', accepted: true, timestamp: 1 },
        { node_id: 'b', proposal_id: 'p1', accepted: true, timestamp: 1 },
      ];
      for (const v of votes) store.registerVote(v);
      store.registerResult(acceptedResult('p1'));

      const report = StateIntegrityEngine.verify(s, store);
      assert.strictEqual(report.valid, true);
      assert.strictEqual(report.violations.length, 0);
    });
  });

  describe('missing consensus', () => {
    it('state update without matching accepted trace → MISSING_CONSENSUS', () => {
      const s = state(2);
      const store = new ConsensusTraceStore();
      const violations = StateIntegrityValidator.validateState(s, store);
      assert.ok(violations.some((v) => v.type === IntegrityViolationType.MISSING_CONSENSUS));
    });
  });

  describe('state mismatch', () => {
    it('tampered state → STATE_MISMATCH', () => {
      const s = state(1);
      const store = new ConsensusTraceStore();
      const p = proposalForState(s, 'p1');
      // Tamper expected hash
      store.registerProposal({ ...p, diff_hash: 'b'.repeat(64) });
      store.registerVote({ node_id: 'a', proposal_id: 'p1', accepted: true, timestamp: 1 });
      store.registerVote({ node_id: 'b', proposal_id: 'p1', accepted: true, timestamp: 1 });
      store.registerResult(acceptedResult('p1'));

      const violations = StateIntegrityValidator.validateState(s, store);
      assert.ok(violations.some((v) => v.type === IntegrityViolationType.STATE_MISMATCH));
    });
  });

  describe('incomplete trace', () => {
    it('proposal without votes or result → INCOMPLETE_TRACE', () => {
      const s = state(1);
      const store = new ConsensusTraceStore();
      store.registerProposal(proposalForState(s, 'p1'));
      const violations = StateIntegrityValidator.validateState(s, store);
      assert.ok(violations.some((v) => v.type === IntegrityViolationType.INCOMPLETE_TRACE));
    });
  });

  describe('fork detection', () => {
    it('multiple accepted results for same version → FORK_DETECTED', () => {
      const s = state(1);
      const store = new ConsensusTraceStore();
      const p1 = proposalForState(s, 'p1');
      const p2 = proposalForState(s, 'p2');
      store.registerProposal(p1);
      store.registerProposal(p2);
      store.registerVote({ node_id: 'a', proposal_id: 'p1', accepted: true, timestamp: 1 });
      store.registerVote({ node_id: 'b', proposal_id: 'p1', accepted: true, timestamp: 1 });
      store.registerResult(acceptedResult('p1'));
      store.registerVote({ node_id: 'a', proposal_id: 'p2', accepted: true, timestamp: 1 });
      store.registerVote({ node_id: 'b', proposal_id: 'p2', accepted: true, timestamp: 1 });
      store.registerResult(acceptedResult('p2'));

      const violations = StateIntegrityValidator.validateState(s, store);
      assert.ok(violations.some((v) => v.type === IntegrityViolationType.FORK_DETECTED));
    });
  });

  describe('invalid transition', () => {
    it('state version jump without intermediate accepted traces → INVALID_TRANSITION', () => {
      const s3 = state(3);
      const store = new ConsensusTraceStore();
      // Only version 3 accepted; missing 1 and 2
      const p3 = proposalForState(s3, 'p3');
      store.registerProposal(p3);
      store.registerVote({ node_id: 'a', proposal_id: 'p3', accepted: true, timestamp: 1 });
      store.registerVote({ node_id: 'b', proposal_id: 'p3', accepted: true, timestamp: 1 });
      store.registerResult(acceptedResult('p3'));

      const violations = StateIntegrityValidator.validateState(s3, store);
      assert.ok(violations.some((v) => v.type === IntegrityViolationType.INVALID_TRANSITION));
    });
  });

  describe('integration: observer feeds trace store', () => {
    it('ConsensusTraceObserver registers proposal, votes, and result', () => {
      const s = state(1);
      const store = new ConsensusTraceStore();
      const observer = new ConsensusTraceObserver(store);
      const p = proposalForState(s, 'p1');
      observer.onProposalCreated(p);
      observer.onVoteCollected({ node_id: 'a', proposal_id: 'p1', accepted: true, timestamp: 1 });
      observer.onVoteCollected({ node_id: 'b', proposal_id: 'p1', accepted: true, timestamp: 1 });
      observer.onConsensusReached(acceptedResult('p1'));
      const trace = store.getTrace('p1');
      assert.ok(trace);
      assert.strictEqual(trace!.proposal.proposal_id, 'p1');
      assert.strictEqual(trace!.votes.length, 2);
      assert.strictEqual(trace!.result?.accepted, true);
    });
  });
});

