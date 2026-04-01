/**
 * Phase 14B — Snapshot Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  SnapshotBuilder,
  SnapshotLoader,
  SnapshotValidator,
  SnapshotCompressor,
  SnapshotSignature,
  SnapshotID,
  SnapshotError,
  SnapshotErrorCode,
  computeStateHash,
  type NetworkState,
  type StateMetadata,
  type StateSnapshot,
} from '../../index.js';

function metadata(vc: Record<string, number> = {}): StateMetadata {
  return {
    version: 1,
    vector_clock: vc,
    timestamp: 1000,
    author_node: 'node-0',
  };
}

function emptyState(meta?: StateMetadata): NetworkState {
  return {
    metadata: meta ?? metadata(),
    nodes: {},
    trust: {},
    governance: {},
    topology: {},
    policies: {},
  };
}

describe('Snapshot Engine (Phase 14B)', () => {
  describe('snapshot creation', () => {
    it('build produces snapshot with snapshot_id and state_hash_root', () => {
      const state = emptyState();
      const snapshot = SnapshotBuilder.build(state, 'author-1', 2000, false);
      assert.ok(snapshot.snapshot_id.length > 0);
      assert.strictEqual(snapshot.author_node, 'author-1');
      assert.strictEqual(snapshot.created_at, 2000);
      assert.strictEqual(snapshot.compressed, false);
      assert.ok(snapshot.state_hash_root.global_hash.length > 0);
      assert.ok(snapshot.payload.length > 0);
    });

    it('build with compress=true produces compressed payload', () => {
      const state: NetworkState = {
        ...emptyState(),
        nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
      };
      const uncompressed = SnapshotBuilder.build(state, 'a', 1000, false);
      const compressed = SnapshotBuilder.build(state, 'a', 1000, true);
      assert.strictEqual(compressed.compressed, true);
      assert.ok(compressed.payload.length > 0);
      assert.strictEqual(compressed.snapshot_id, uncompressed.snapshot_id);
    });
  });

  describe('snapshot hashing integrity', () => {
    it('same state produces same snapshot_id and global_hash', () => {
      const state = emptyState();
      const s1 = SnapshotBuilder.build(state, 'n1', 1000, false);
      const s2 = SnapshotBuilder.build(state, 'n1', 1000, false);
      assert.strictEqual(s1.snapshot_id, s2.snapshot_id);
      assert.strictEqual(s1.state_hash_root.global_hash, s2.state_hash_root.global_hash);
    });

    it('different author or timestamp produces different snapshot_id', () => {
      const state = emptyState();
      const s1 = SnapshotBuilder.build(state, 'n1', 1000, false);
      const s2 = SnapshotBuilder.build(state, 'n2', 1000, false);
      const s3 = SnapshotBuilder.build(state, 'n1', 2000, false);
      assert.notStrictEqual(s1.snapshot_id, s2.snapshot_id);
      assert.notStrictEqual(s1.snapshot_id, s3.snapshot_id);
    });
  });

  describe('compression/decompression', () => {
    it('decompress(compress(payload)) round-trips', () => {
      const text = '{"metadata":{"version":1,"vector_clock":{},"timestamp":1000,"author_node":"n0"},"nodes":{},"trust":{},"governance":{},"topology":{},"policies":{}}';
      const compressed = SnapshotCompressor.compress(text);
      const decompressed = SnapshotCompressor.decompress(compressed);
      assert.strictEqual(decompressed, text);
    });

    it('compression is deterministic (same input → same output)', () => {
      const text = 'hello world';
      const a = SnapshotCompressor.compress(text);
      const b = SnapshotCompressor.compress(text);
      assert.strictEqual(a, b);
    });
  });

  describe('snapshot signature verification', () => {
    it('verify returns true for valid signature', () => {
      const payload = 'test payload';
      const key = 'secret-key';
      const sig = SnapshotSignature.sign(payload, key);
      assert.strictEqual(SnapshotSignature.verify(payload, sig, key), true);
    });

    it('verify returns false for tampered payload', () => {
      const payload = 'test payload';
      const key = 'secret-key';
      const sig = SnapshotSignature.sign(payload, key);
      assert.strictEqual(SnapshotSignature.verify('tampered', sig, key), false);
    });

    it('verify returns false for wrong key', () => {
      const payload = 'test payload';
      const sig = SnapshotSignature.sign(payload, 'key1');
      assert.strictEqual(SnapshotSignature.verify(payload, sig, 'key2'), false);
    });
  });

  describe('snapshot validation', () => {
    it('valid snapshot passes validate', () => {
      const state = emptyState();
      const snapshot = SnapshotBuilder.build(state, 'n1', 1000, false);
      assert.strictEqual(SnapshotValidator.validate(snapshot), true);
    });

    it('invalid snapshot_id throws INVALID_SNAPSHOT', () => {
      const state = emptyState();
      const snapshot = SnapshotBuilder.build(state, 'n1', 1000, false);
      const bad = { ...snapshot, snapshot_id: 'wrong-id' };
      assert.throws(
        () => SnapshotValidator.validate(bad as unknown as StateSnapshot),
        (e: Error) => e instanceof SnapshotError && e.code === SnapshotErrorCode.INVALID_SNAPSHOT
      );
    });

    it('invalid vector_clock format throws INVALID_VECTOR_CLOCK', () => {
      const state = emptyState();
      const snapshot = SnapshotBuilder.build(state, 'n1', 1000, false);
      const bad = { ...snapshot, vector_clock: { n1: 'not-a-number' } };
      assert.throws(
        () => SnapshotValidator.validate(bad as unknown as StateSnapshot),
        (e: Error) => e instanceof SnapshotError && e.code === SnapshotErrorCode.INVALID_VECTOR_CLOCK
      );
    });
  });

  describe('snapshot restore correctness', () => {
    it('restore( build(state) ) returns equivalent state', () => {
      const state: NetworkState = {
        ...emptyState(metadata({ n1: 1 })),
        nodes: { n1: { node_id: 'n1', passport_version: 1, last_seen: 2000, status: 'ACTIVE' } },
        trust: { n1: { node_id: 'n1', trust_score: 0.8, reputation_score: 0.7 } },
      };
      const snapshot = SnapshotBuilder.build(state, 'author', 3000, false);
      const restored = SnapshotLoader.restore(snapshot);
      assert.strictEqual(restored.metadata.version, state.metadata.version);
      assert.strictEqual(restored.nodes.n1?.node_id, 'n1');
      assert.strictEqual(restored.trust.n1?.trust_score, 0.8);
      const hashRestored = computeStateHash(restored);
      const hashOriginal = computeStateHash(state);
      assert.strictEqual(hashRestored.global_hash, hashOriginal.global_hash);
    });

    it('restore with compressed snapshot works', () => {
      const state: NetworkState = {
        ...emptyState(),
        nodes: { a: { node_id: 'a', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
      };
      const snapshot = SnapshotBuilder.build(state, 'n', 1000, true);
      const restored = SnapshotLoader.restore(snapshot);
      assert.strictEqual(restored.nodes.a?.node_id, 'a');
    });

    it('restore rejects tampered payload (hash mismatch)', () => {
      const state: NetworkState = { ...emptyState(), nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } } };
      const snapshot = SnapshotBuilder.build(state, 'n', 1000, false);
      // Tamper payload so restored state has different nodes → different global hash
      const tamperedPayload = JSON.stringify({
        metadata: state.metadata,
        nodes: { n1: { node_id: 'n1', passport_version: 99, last_seen: 0, status: 'REMOVED' } },
        trust: {},
        governance: {},
        topology: {},
        policies: {},
      });
      const tampered = { ...snapshot, payload: tamperedPayload };
      assert.throws(
        () => SnapshotLoader.restore(tampered as unknown as StateSnapshot),
        (e: Error) => e instanceof SnapshotError && e.code === SnapshotErrorCode.HASH_MISMATCH
      );
    });
  });

  describe('SnapshotID', () => {
    it('generate is deterministic', () => {
      const a = SnapshotID.generate('hash1', 'node1', 1000);
      const b = SnapshotID.generate('hash1', 'node1', 1000);
      assert.strictEqual(a, b);
    });

    it('generate differs for different inputs', () => {
      const a = SnapshotID.generate('hash1', 'n', 1000);
      const b = SnapshotID.generate('hash2', 'n', 1000);
      assert.notStrictEqual(a, b);
    });
  });
});
