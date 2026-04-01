/**
 * Phase 14E — State Recovery Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  StateRecoveryEngine,
  StateRecoveryPlanner,
  StateRecoveryExecutor,
  StateRecoveryValidator,
  StateDiffEngine,
  RecoveryError,
  RecoveryErrorCode,
  computeStateHash,
} from '../../index.js';
import type { NetworkState, StateMetadata } from '../../index.js';
import type { StateDiff } from '../../diff/index.js';

function metadata(version: number, author = 'node-0'): StateMetadata {
  return {
    version,
    vector_clock: {},
    timestamp: 1000 + version,
    author_node: author,
  };
}

function emptyState(version: number): NetworkState {
  return {
    metadata: metadata(version),
    nodes: {},
    trust: {},
    governance: {},
    topology: {},
    policies: {},
  };
}

describe('State Recovery Engine (Phase 14E)', () => {
  describe('snapshot recovery', () => {
    it('recover with no diffs returns snapshot when snapshot_version === target_version', () => {
      const snapshot = emptyState(5);
      const out = StateRecoveryEngine.recoverState({
        snapshot,
        target_version: 5,
        available_diff_ids: [],
        getDiffMeta: () => null,
        getDiff: () => null,
      });
      assert.strictEqual(out.result.success, true);
      assert.strictEqual(out.result.recovered_version, 5);
      assert.strictEqual(out.result.applied_diffs, 0);
      assert.strictEqual(computeStateHash(out.state).global_hash, computeStateHash(snapshot).global_hash);
    });

    it('recover with snapshot_version > target_version returns snapshot unchanged', () => {
      const snapshot = emptyState(10);
      const out = StateRecoveryEngine.recoverState({
        snapshot,
        target_version: 5,
        available_diff_ids: [],
        getDiffMeta: () => null,
        getDiff: () => null,
      });
      assert.strictEqual(out.result.recovered_version, 10);
      assert.strictEqual(out.result.applied_diffs, 0);
    });
  });

  describe('diff replay correctness', () => {
    it('snapshot + diff_chain = canonical_state (critical test)', () => {
      const s0 = emptyState(0);
      const s1: NetworkState = {
        ...emptyState(1),
        nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
      };
      const s2: NetworkState = {
        ...emptyState(2),
        nodes: {
          n1: s1.nodes['n1']!,
          n2: { node_id: 'n2', passport_version: 0, last_seen: 0, status: 'ACTIVE' },
        },
      };
      const diff1 = StateDiffEngine.createDiff(s0, s1);
      const diff2 = StateDiffEngine.createDiff(s1, s2);

      const id1 = 'd1';
      const id2 = 'd2';
      const diffs = new Map<string, StateDiff>([[id1, diff1], [id2, diff2]]);
      const getDiffMeta = (id: string) => {
        const d = diffs.get(id);
        return d ? { base_version: d.metadata.base_version, target_version: d.metadata.target_version } : null;
      };
      const getDiff = (id: string) => diffs.get(id) ?? null;

      const out = StateRecoveryEngine.recoverState({
        snapshot: s0,
        target_version: 2,
        available_diff_ids: [id1, id2],
        getDiffMeta,
        getDiff,
      });

      assert.strictEqual(out.result.success, true);
      assert.strictEqual(out.result.recovered_version, 2);
      assert.strictEqual(out.result.applied_diffs, 2);
      assert.strictEqual(computeStateHash(out.state).global_hash, computeStateHash(s2).global_hash);
    });
  });

  describe('planner selects shortest chain', () => {
    it('planner builds contiguous diff chain', () => {
      const plan = StateRecoveryPlanner.planRecovery(
        0,
        2,
        ['a', 'b'],
        (id) => (id === 'a' ? { base_version: 0, target_version: 1 } : id === 'b' ? { base_version: 1, target_version: 2 } : null)
      );
      assert.strictEqual(plan.snapshot_version, 0);
      assert.strictEqual(plan.target_version, 2);
      assert.strictEqual(plan.diff_chain.length, 2);
      assert.strictEqual(plan.diff_chain[0], 'a');
      assert.strictEqual(plan.diff_chain[1], 'b');
    });

    it('planner prefers single diff when one jump exists', () => {
      const plan = StateRecoveryPlanner.planRecovery(
        0,
        2,
        ['short', 'a', 'b'],
        (id) => {
          if (id === 'short') return { base_version: 0, target_version: 2 };
          if (id === 'a') return { base_version: 0, target_version: 1 };
          if (id === 'b') return { base_version: 1, target_version: 2 };
          return null;
        }
      );
      assert.strictEqual(plan.diff_chain.length, 1);
      assert.strictEqual(plan.diff_chain[0], 'short');
    });
  });

  describe('executor enforces sequential order', () => {
    it('executor throws when diff base_version does not match state', () => {
      const base = emptyState(0);
      const diff = StateDiffEngine.createDiff(emptyState(1), emptyState(2));
      const plan = { snapshot_version: 0, target_version: 2, diff_chain: ['bad'] };
      assert.throws(
        () => StateRecoveryExecutor.execute(base, plan, () => diff),
        (e: Error) => e instanceof RecoveryError && e.code === RecoveryErrorCode.DIFF_APPLICATION_FAILED
      );
    });
  });

  describe('recovery validation failures', () => {
    it('invalid snapshot state throws on validate', () => {
      const invalidState: NetworkState = {
        ...emptyState(1),
        nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
        trust: { n1: { node_id: 'n1', trust_score: 1.5, reputation_score: 0.5 } },
      };
      assert.throws(
        () => StateRecoveryValidator.validate(invalidState),
        (e: Error) => e instanceof RecoveryError && e.code === RecoveryErrorCode.STATE_VALIDATION_FAILED
      );
    });
  });

  describe('recovery resume capability', () => {
    it('can resume by starting from intermediate state and remaining diffs', () => {
      const s0 = emptyState(0);
      const s1: NetworkState = { ...emptyState(1), nodes: { a: { node_id: 'a', passport_version: 0, last_seen: 0, status: 'ACTIVE' } } };
      const s2: NetworkState = { ...emptyState(2), nodes: { a: s1.nodes['a']!, b: { node_id: 'b', passport_version: 0, last_seen: 0, status: 'ACTIVE' } } };
      const diff1 = StateDiffEngine.createDiff(s0, s1);
      const diff2 = StateDiffEngine.createDiff(s1, s2);
      const diffs = new Map<string, StateDiff>([['d1', diff1], ['d2', diff2]]);
      const getMeta = (id: string) => {
        const d = diffs.get(id);
        return d ? { base_version: d.metadata.base_version, target_version: d.metadata.target_version } : null;
      };
      const getDiff = (id: string) => diffs.get(id) ?? null;

      const full = StateRecoveryEngine.recoverState({
        snapshot: s0,
        target_version: 2,
        available_diff_ids: ['d1', 'd2'],
        getDiffMeta: getMeta,
        getDiff,
      });

      const resumed = StateRecoveryEngine.recoverState({
        snapshot: s1,
        target_version: 2,
        available_diff_ids: ['d2'],
        getDiffMeta: getMeta,
        getDiff,
      });

      assert.strictEqual(computeStateHash(full.state).global_hash, computeStateHash(resumed.state).global_hash);
    });
  });
});
