/**
 * Phase 14C — State Diff Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeStateHash } from '../../index.js';
import type { NetworkState, StateMetadata } from '../../index.js';
import {
  StateDiffEngine,
  StateDiffGenerator,
  StateDiffMerger,
  StateDiffValidator,
  StateDiffError,
  StateDiffErrorCode,
} from '../../diff/index.js';

function metadata(version: number, author = 'node-0'): StateMetadata {
  return {
    version,
    vector_clock: {},
    timestamp: 1000 + version,
    author_node: author,
  };
}

function emptyState(meta?: StateMetadata): NetworkState {
  return {
    metadata: meta ?? metadata(1),
    nodes: {},
    trust: {},
    governance: {},
    topology: {},
    policies: {},
  };
}

function stateWithNodes(nodeIds: string[]): NetworkState {
  const nodes: Record<string, { node_id: string; passport_version: number; last_seen: number; status: 'ACTIVE' }> = {};
  for (const id of nodeIds) {
    nodes[id] = { node_id: id, passport_version: 0, last_seen: 1000, status: 'ACTIVE' };
  }
  return { ...emptyState(metadata(1)), nodes };
}

describe('State Diff Engine (Phase 14C)', () => {
  describe('diff generation correctness', () => {
    it('empty base and target produces empty diff', () => {
      const base = emptyState(metadata(1));
      const target = emptyState(metadata(2));
      const diff = StateDiffGenerator.generate(base, target);
      assert.strictEqual(Object.keys(diff.nodes.added).length, 0);
      assert.strictEqual(Object.keys(diff.nodes.updated).length, 0);
      assert.strictEqual(diff.nodes.removed.length, 0);
      assert.strictEqual(diff.metadata.base_version, 1);
      assert.strictEqual(diff.metadata.target_version, 2);
    });

    it('added node in target appears in diff.nodes.added', () => {
      const base = emptyState(metadata(1));
      const target: NetworkState = {
        ...emptyState(metadata(2)),
        nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 2000, status: 'ACTIVE' } },
      };
      const diff = StateDiffGenerator.generate(base, target);
      assert.strictEqual(diff.nodes.added['n1']?.node_id, 'n1');
      assert.strictEqual(diff.nodes.removed.length, 0);
    });

    it('removed node in target appears in diff.nodes.removed', () => {
      const base = stateWithNodes(['a', 'b']);
      const target: NetworkState = { ...emptyState(metadata(2)), nodes: { a: base.nodes['a']! } };
      const diff = StateDiffGenerator.generate(base, target);
      assert.ok(diff.nodes.removed.includes('b'));
      assert.strictEqual(Object.keys(diff.nodes.added).length, 0);
    });

    it('updated node appears in diff.nodes.updated', () => {
      const base = stateWithNodes(['n1']);
      const target: NetworkState = {
        ...emptyState(metadata(2)),
        nodes: { n1: { node_id: 'n1', passport_version: 1, last_seen: 3000, status: 'SUSPICIOUS' } },
      };
      const diff = StateDiffGenerator.generate(base, target);
      assert.strictEqual(diff.nodes.updated['n1']?.status, 'SUSPICIOUS');
      assert.strictEqual(diff.nodes.updated['n1']?.passport_version, 1);
    });
  });

  describe('diff merge correctness', () => {
    it('base_state + diff = target_state (critical test)', () => {
      const base: NetworkState = {
        ...emptyState(metadata(1)),
        nodes: { a: { node_id: 'a', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
      };
      const target: NetworkState = {
        ...emptyState(metadata(2)),
        nodes: {
          a: { node_id: 'a', passport_version: 1, last_seen: 1000, status: 'ACTIVE' },
          b: { node_id: 'b', passport_version: 0, last_seen: 1000, status: 'ACTIVE' },
        },
      };
      const diff = StateDiffGenerator.generate(base, target);
      const merged = StateDiffMerger.merge(base, diff);
      assert.strictEqual(merged.metadata.version, 2);
      assert.strictEqual(merged.nodes['a']?.passport_version, 1);
      assert.strictEqual(merged.nodes['b']?.node_id, 'b');
      assert.strictEqual(Object.keys(merged.nodes).length, 2);
      const mergedHash = computeStateHash(merged);
      const targetHash = computeStateHash(target);
      assert.strictEqual(mergedHash.global_hash, targetHash.global_hash);
    });

    it('applyDiff via engine produces same result', () => {
      const base = stateWithNodes(['x']);
      const target: NetworkState = {
        ...emptyState(metadata(2)),
        nodes: {},
      };
      const diff = StateDiffEngine.createDiff(base, target);
      const merged = StateDiffEngine.applyDiff(base, diff);
      assert.strictEqual(Object.keys(merged.nodes).length, 0);
    });
  });

  describe('deterministic diff generation', () => {
    it('same base and target produce same diff', () => {
      const base = stateWithNodes(['a', 'b']);
      const target: NetworkState = {
        ...emptyState(metadata(2)),
        nodes: { a: base.nodes['a']!, b: base.nodes['b']!, c: { node_id: 'c', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
      };
      const d1 = StateDiffGenerator.generate(base, target);
      const d2 = StateDiffGenerator.generate(base, target);
      assert.strictEqual(d1.metadata.target_version, d2.metadata.target_version);
      assert.deepStrictEqual(d1.nodes.added, d2.nodes.added);
      assert.deepStrictEqual(d1.nodes.removed, d2.nodes.removed);
    });
  });

  describe('diff validation failures', () => {
    it('invalid version order throws INVALID_VERSION_ORDER', () => {
      const base = emptyState(metadata(2));
      const target = emptyState(metadata(1));
      const diff = StateDiffGenerator.generate(base, target);
      const badDiff = { ...diff, metadata: { ...diff.metadata, base_version: 2, target_version: 1 } };
      assert.throws(
        () => StateDiffValidator.validate(badDiff as typeof diff),
        (e: Error) => e instanceof StateDiffError && e.code === StateDiffErrorCode.INVALID_VERSION_ORDER
      );
    });

    it('duplicate key in added and removed throws INVALID_OPERATION', () => {
      const base = emptyState(metadata(1));
      const diff = StateDiffGenerator.generate(base, emptyState(metadata(2)));
      const badDiff = {
        ...diff,
        nodes: { ...diff.nodes, added: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' as const } }, removed: ['n1'] },
      };
      assert.throws(
        () => StateDiffValidator.validate(badDiff as typeof diff),
        (e: Error) => e instanceof StateDiffError && e.code === StateDiffErrorCode.INVALID_OPERATION
      );
    });
  });

  describe('replay operations', () => {
    it('apply diff_1 then diff_2 then diff_3 yields final_state', () => {
      const s0 = emptyState(metadata(0));
      const s1: NetworkState = { ...emptyState(metadata(1)), nodes: { a: { node_id: 'a', passport_version: 0, last_seen: 0, status: 'ACTIVE' } } };
      const s2: NetworkState = { ...emptyState(metadata(2)), nodes: { a: s1.nodes['a']!, b: { node_id: 'b', passport_version: 0, last_seen: 0, status: 'ACTIVE' } } };
      const s3: NetworkState = { ...emptyState(metadata(3)), nodes: { b: s2.nodes['b']! } };

      const diff1 = StateDiffGenerator.generate(s0, s1);
      const diff2 = StateDiffGenerator.generate(s1, s2);
      const diff3 = StateDiffGenerator.generate(s2, s3);

      const after1 = StateDiffMerger.merge(s0, diff1);
      const after2 = StateDiffMerger.merge(after1, diff2);
      const after3 = StateDiffMerger.merge(after2, diff3);

      assert.strictEqual(computeStateHash(after3).global_hash, computeStateHash(s3).global_hash);
      assert.strictEqual(Object.keys(after3.nodes).length, 1);
      assert.strictEqual(after3.nodes['b']?.node_id, 'b');
    });
  });
});
