/**
 * Phase 14A — State Model Definition. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  StateSerializer,
  computeStateHash,
  StateValidator,
  StateError,
  StateErrorCode,
  createTopologyEdge,
  topologyEdgeId,
  mergeVectorClocks,
  vectorClockKeys,
} from '../index.js';
import type { NetworkState, StateMetadata, NodeState, PolicyState } from '../index.js';

function metadata(overrides: Partial<StateMetadata>): StateMetadata {
  return {
    version: 1,
    vector_clock: {},
    timestamp: 1000,
    author_node: 'node-0',
    ...overrides,
  };
}

function emptyState(meta?: StateMetadata): NetworkState {
  return {
    metadata: meta ?? metadata({}),
    nodes: {},
    trust: {},
    governance: {},
    topology: {},
    policies: {},
  };
}

describe('State Model (Phase 14A)', () => {
  describe('deterministic serialization', () => {
    it('same state produces same serialized output', () => {
      const state: NetworkState = {
        metadata: metadata({ version: 2 }),
        nodes: {
          n1: { node_id: 'n1', passport_version: 1, last_seen: 2000, status: 'ACTIVE' },
        },
        trust: {},
        governance: {},
        topology: {},
        policies: {},
      };
      const a = StateSerializer.serialize(state);
      const b = StateSerializer.serialize(state);
      assert.strictEqual(a, b);
    });

    it('deserialize(serialize(state)) round-trips', () => {
      const state: NetworkState = {
        ...emptyState(),
        metadata: metadata({ vector_clock: { n1: 2 } }),
      };
      const payload = StateSerializer.serialize(state);
      const back = StateSerializer.deserialize(payload);
      assert.strictEqual(back.metadata.version, state.metadata.version);
      assert.strictEqual(back.metadata.vector_clock['n1'], 2);
    });

    it('key ordering is deterministic (different key order → same string)', () => {
      const state1: NetworkState = {
        metadata: metadata({}),
        nodes: { a: { node_id: 'a', passport_version: 0, last_seen: 0, status: 'ACTIVE' } as NodeState, b: { node_id: 'b', passport_version: 0, last_seen: 0, status: 'ACTIVE' } as NodeState },
        trust: {},
        governance: {},
        topology: {},
        policies: {},
      };
      const state2: NetworkState = {
        ...state1,
        nodes: { b: state1.nodes.b!, a: state1.nodes.a! },
      };
      const s1 = StateSerializer.serialize(state1);
      const s2 = StateSerializer.serialize(state2);
      assert.strictEqual(s1, s2);
    });
  });

  describe('vector clock compatibility', () => {
    it('mergeVectorClocks merges pointwise max', () => {
      const a = { n1: 1, n2: 3 };
      const b = { n1: 2, n2: 1 };
      const m = mergeVectorClocks(a, b);
      assert.strictEqual(m.n1, 2);
      assert.strictEqual(m.n2, 3);
    });

    it('vectorClockKeys returns sorted keys', () => {
      const clock = { z: 1, a: 2, m: 3 };
      const keys = vectorClockKeys(clock);
      assert.deepStrictEqual(keys, ['a', 'm', 'z']);
    });
  });

  describe('deterministic state hashing', () => {
    it('same state produces same hash', () => {
      const state: NetworkState = {
        metadata: metadata({ version: 1 }),
        nodes: { n1: { node_id: 'n1', passport_version: 1, last_seen: 1000, status: 'ACTIVE' } },
        trust: { n1: { node_id: 'n1', trust_score: 0.8, reputation_score: 0.7 } },
        governance: {},
        topology: {},
        policies: {},
      };
      const h1 = computeStateHash(state);
      const h2 = computeStateHash(state);
      assert.strictEqual(h1.global_hash, h2.global_hash);
      assert.strictEqual(h1.node_state_hash, h2.node_state_hash);
      assert.strictEqual(h1.trust_state_hash, h2.trust_state_hash);
    });

    it('different state produces different hash', () => {
      const s1: NetworkState = { ...emptyState(), nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } } };
      const s2: NetworkState = { ...emptyState(), nodes: { n2: { node_id: 'n2', passport_version: 0, last_seen: 0, status: 'ACTIVE' } } };
      const h1 = computeStateHash(s1);
      const h2 = computeStateHash(s2);
      assert.notStrictEqual(h1.global_hash, h2.global_hash);
    });

    it('sub-state hashes are deterministic', () => {
      const state: NetworkState = {
        ...emptyState(),
        nodes: { a: { node_id: 'a', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
      };
      const h = computeStateHash(state);
      assert.ok(typeof h.node_state_hash === 'string' && h.node_state_hash.length > 0);
      assert.ok(typeof h.global_hash === 'string');
    });
  });

  describe('duplicate node detection', () => {
    it('node key must equal node_id (mismatch throws)', () => {
      const state: NetworkState = {
        metadata: metadata({}),
        nodes: {
          keyA: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' },
        },
        trust: {},
        governance: {},
        topology: {},
        policies: {},
      };
      assert.throws(
        () => StateValidator.validate(state),
        (e: Error) => e instanceof StateError && e.code === StateErrorCode.DUPLICATE_NODE
      );
    });
  });

  describe('state validation correctness', () => {
    it('valid state passes', () => {
      const state: NetworkState = {
        metadata: metadata({}),
        nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
        trust: { n1: { node_id: 'n1', trust_score: 0.5, reputation_score: 0.5 } },
        governance: {},
        topology: {},
        policies: {},
      };
      assert.strictEqual(StateValidator.validate(state), true);
    });

    it('trust scores in range pass', () => {
      const state: NetworkState = {
        metadata: metadata({}),
        nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
        trust: { n1: { node_id: 'n1', trust_score: 0, reputation_score: 1 } },
        governance: {},
        topology: {},
        policies: {},
      };
      assert.strictEqual(StateValidator.validate(state), true);
    });
  });

  describe('invalid trust values rejected', () => {
    it('trust_score > 1 throws INVALID_TRUST_VALUE', () => {
      const state: NetworkState = {
        metadata: metadata({}),
        nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
        trust: { n1: { node_id: 'n1', trust_score: 1.5, reputation_score: 0.5 } },
        governance: {},
        topology: {},
        policies: {},
      };
      assert.throws(
        () => StateValidator.validate(state),
        (e: Error) => e instanceof StateError && e.code === StateErrorCode.INVALID_TRUST_VALUE
      );
    });

    it('reputation_score < 0 throws INVALID_TRUST_VALUE', () => {
      const state: NetworkState = {
        metadata: metadata({}),
        nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
        trust: { n1: { node_id: 'n1', trust_score: 0.5, reputation_score: -0.1 } },
        governance: {},
        topology: {},
        policies: {},
      };
      assert.throws(
        () => StateValidator.validate(state),
        (e: Error) => e instanceof StateError && e.code === StateErrorCode.INVALID_TRUST_VALUE
      );
    });
  });

  describe('invalid topology edges rejected', () => {
    it('topology edge with source_node not in nodes throws', () => {
      const edge = createTopologyEdge('missing', 'n1', 0.8);
      const state: NetworkState = {
        metadata: metadata({}),
        nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
        trust: {},
        governance: {},
        topology: { [edge.edge_id]: edge },
        policies: {},
      };
      assert.throws(
        () => StateValidator.validate(state),
        (e: Error) => e instanceof StateError && e.code === StateErrorCode.INVALID_TOPOLOGY_EDGE
      );
    });

    it('topology edge with target_node not in nodes throws', () => {
      const edge = createTopologyEdge('n1', 'missing', 0.8);
      const state: NetworkState = {
        metadata: metadata({}),
        nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
        trust: {},
        governance: {},
        topology: { [edge.edge_id]: edge },
        policies: {},
      };
      assert.throws(
        () => StateValidator.validate(state),
        (e: Error) => e instanceof StateError && e.code === StateErrorCode.INVALID_TOPOLOGY_EDGE
      );
    });
  });

  describe('governance references valid nodes', () => {
    it('governance decision referencing unknown node throws', () => {
      const state: NetworkState = {
        metadata: metadata({}),
        nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
        trust: {},
        governance: {
          d1: { decision_id: 'd1', decision_type: 'REVOKE', affected_node: 'unknown', timestamp: 2000 },
        },
        topology: {},
        policies: {},
      };
      assert.throws(
        () => StateValidator.validate(state),
        (e: Error) => e instanceof StateError && e.code === StateErrorCode.INVALID_STATE
      );
    });
  });

  describe('policies reference valid domains', () => {
    it('policy with empty source_domain throws INVALID_POLICY_REFERENCE', () => {
      const state: NetworkState = {
        metadata: metadata({}),
        nodes: {},
        trust: {},
        governance: {},
        topology: {},
        policies: {
          p1: { policy_id: 'p1', source_domain: '', target_domain: 'IRIS_INTERNAL', parameters: {} } as PolicyState,
        },
      };
      assert.throws(
        () => StateValidator.validate(state),
        (e: Error) => e instanceof StateError && e.code === StateErrorCode.INVALID_POLICY_REFERENCE
      );
    });
  });

  describe('deterministic topology edge_id', () => {
    it('topologyEdgeId is deterministic', () => {
      const id1 = topologyEdgeId('a', 'b');
      const id2 = topologyEdgeId('a', 'b');
      assert.strictEqual(id1, id2);
    });

    it('createTopologyEdge produces edge with correct edge_id', () => {
      const edge = createTopologyEdge('src', 'tgt', 0.7);
      assert.strictEqual(edge.source_node, 'src');
      assert.strictEqual(edge.target_node, 'tgt');
      assert.strictEqual(edge.trust_weight, 0.7);
      assert.strictEqual(edge.edge_id, topologyEdgeId('src', 'tgt'));
    });
  });
});
