/**
 * Phase 14D — Conflict Resolution Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { computeStateHash } from '../../index.js';
import type { NetworkState, StateMetadata } from '../../index.js';
import {
  ConflictDetector,
  ConflictPolicy,
  ConflictResolver,
  ConflictValidator,
} from '../../conflict/index.js';

function metadata(version: number, author = 'node-0', ts?: number): StateMetadata {
  return {
    version,
    vector_clock: {},
    timestamp: ts ?? 1000 + version,
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

describe('Conflict Resolution Engine (Phase 14D)', () => {
  describe('conflict detection', () => {
    it('identical states produce no conflicts', () => {
      const state = emptyState(metadata(1));
      const conflicts = ConflictDetector.detect(state, state);
      assert.strictEqual(conflicts.length, 0);
    });

    it('different node value for same key produces one conflict', () => {
      const local: NetworkState = {
        ...emptyState(metadata(1)),
        nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
      };
      const remote: NetworkState = {
        ...emptyState(metadata(2)),
        nodes: { n1: { node_id: 'n1', passport_version: 1, last_seen: 1000, status: 'SUSPICIOUS' } },
      };
      const conflicts = ConflictDetector.detect(local, remote);
      assert.strictEqual(conflicts.length, 1);
      assert.strictEqual(conflicts[0].entity_type, 'NODE');
      assert.strictEqual(conflicts[0].entity_id, 'n1');
      assert.strictEqual(conflicts[0].local_version, 1);
      assert.strictEqual(conflicts[0].remote_version, 2);
    });

    it('key only in remote produces conflict (local_value undefined)', () => {
      const local = emptyState(metadata(1));
      const remote: NetworkState = {
        ...emptyState(metadata(2)),
        nodes: { n2: { node_id: 'n2', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
      };
      const conflicts = ConflictDetector.detect(local, remote);
      assert.strictEqual(conflicts.length, 1);
      assert.strictEqual(conflicts[0].entity_id, 'n2');
      assert.strictEqual(conflicts[0].local_value, undefined);
    });
  });

  describe('vector clock and resolution policy', () => {
    it('higher version wins (vector_clock_priority)', () => {
      const conflict = {
        entity_type: 'TRUST' as const,
        entity_id: 'n1',
        local_version: 1,
        remote_version: 2,
        local_value: { node_id: 'n1', trust_score: 0.5, reputation_score: 0.5 },
        remote_value: { node_id: 'n1', trust_score: 0.8, reputation_score: 0.7 },
      };
      const result = ConflictPolicy.resolve(conflict);
      assert.strictEqual(result.resolution_strategy, 'vector_clock_priority');
      assert.strictEqual((result.resolved_value as { trust_score: number }).trust_score, 0.8);
    });

    it('governance_priority for GOVERNANCE entity type', () => {
      const conflict = {
        entity_type: 'GOVERNANCE' as const,
        entity_id: 'd1',
        local_version: 2,
        remote_version: 1,
        local_value: { decision_id: 'd1', decision_type: 'REVOKE', affected_node: 'n1', timestamp: 2000 },
        remote_value: { decision_id: 'd1', decision_type: 'WARN', affected_node: 'n1', timestamp: 1000 },
      };
      const result = ConflictPolicy.resolve(conflict);
      assert.strictEqual(result.resolution_strategy, 'governance_priority');
      assert.strictEqual((result.resolved_value as { decision_type: string }).decision_type, 'REVOKE');
    });

    it('latest_timestamp when versions equal', () => {
      const conflict = {
        entity_type: 'NODE' as const,
        entity_id: 'n1',
        local_version: 1,
        remote_version: 1,
        local_value: { node_id: 'n1', passport_version: 0, last_seen: 1000, status: 'ACTIVE' as const },
        remote_value: { node_id: 'n1', passport_version: 0, last_seen: 2000, status: 'ACTIVE' as const },
        local_timestamp: 1000,
        remote_timestamp: 2000,
      };
      const result = ConflictPolicy.resolve(conflict);
      assert.strictEqual(result.resolution_strategy, 'latest_timestamp');
      assert.strictEqual((result.resolved_value as { last_seen: number }).last_seen, 2000);
    });
  });

  describe('deterministic resolution', () => {
    it('local_state + remote_state → resolved_state identical across runs', () => {
      const local: NetworkState = {
        ...emptyState(metadata(1, 'A', 1000)),
        nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
        trust: { n1: { node_id: 'n1', trust_score: 0.5, reputation_score: 0.5 } },
      };
      const remote: NetworkState = {
        ...emptyState(metadata(2, 'B', 2000)),
        nodes: { n1: { node_id: 'n1', passport_version: 1, last_seen: 2000, status: 'ACTIVE' } },
        trust: { n1: { node_id: 'n1', trust_score: 0.8, reputation_score: 0.7 } },
      };
      const r1 = ConflictResolver.resolveState(local, remote);
      const r2 = ConflictResolver.resolveState(local, remote);
      assert.strictEqual(computeStateHash(r1).global_hash, computeStateHash(r2).global_hash);
    });
  });

  describe('invalid resolution rejection', () => {
    it('resolved state with invalid trust score throws on validate', () => {
      const state: NetworkState = {
        ...emptyState(),
        nodes: { n1: { node_id: 'n1', passport_version: 0, last_seen: 0, status: 'ACTIVE' } },
        trust: { n1: { node_id: 'n1', trust_score: 1.5, reputation_score: 0.5 } },
      };
      assert.throws(
        () => ConflictValidator.validate(state),
        (e: Error) => e instanceof Error && e.name === 'StateError'
      );
    });
  });

  describe('critical: local + remote → resolved_state', () => {
    it('resolved state merges non-conflicting keys and resolves conflicts', () => {
      const local: NetworkState = {
        ...emptyState(metadata(1)),
        nodes: {
          a: { node_id: 'a', passport_version: 0, last_seen: 0, status: 'ACTIVE' },
          b: { node_id: 'b', passport_version: 0, last_seen: 0, status: 'ACTIVE' },
        },
      };
      const remote: NetworkState = {
        ...emptyState(metadata(2)),
        nodes: {
          a: { node_id: 'a', passport_version: 1, last_seen: 1000, status: 'ACTIVE' },
          c: { node_id: 'c', passport_version: 0, last_seen: 0, status: 'ACTIVE' },
        },
      };
      const resolved = ConflictResolver.resolveState(local, remote);
      assert.strictEqual(resolved.nodes['a']?.passport_version, 1);
      assert.ok(resolved.nodes['c']);
      assert.strictEqual(ConflictValidator.validate(resolved), true);
    });
  });
});
