/**
 * Phase 13A — Node Reputation Engine. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  computeReputationScore,
  applyReputationDecay,
  computeNodeReputation,
  computeReputationBatch,
  DEFAULT_REPUTATION_WEIGHTS,
} from '../index.js';
import type { NormalizedBehaviorMetrics } from '../../trust_normalization/index.js';
import type { ReputationWeights } from '../reputation_types.js';

function metrics(
  node_id: string,
  activity: number,
  consensus: number,
  validation: number,
  governance: number,
  baseline: number,
  norm_ts: number
): NormalizedBehaviorMetrics {
  return Object.freeze({
    node_id,
    normalized_activity_score: activity,
    normalized_consensus_score: consensus,
    normalized_validation_score: validation,
    normalized_governance_score: governance,
    activity_baseline: baseline,
    normalization_timestamp: norm_ts,
  });
}

describe('Node Reputation Engine (13A)', () => {
  it('Test 1 — Reputation Score Calculation: returns expected weighted value', () => {
    const m = metrics('n1', 0.4, 0.6, 0.8, 0.2, 10, 1000);
    const w = DEFAULT_REPUTATION_WEIGHTS;
    const score = computeReputationScore(m, w);
    const expected =
      m.normalized_activity_score * w.activity_weight +
      m.normalized_consensus_score * w.consensus_weight +
      m.normalized_validation_score * w.validation_weight +
      m.normalized_governance_score * w.governance_weight;
    assert.strictEqual(score, Math.min(1, Math.max(0, expected)));
  });

  it('Test 2 — Score Range Validation: 0 ≤ reputation_score ≤ 1', () => {
    const w = DEFAULT_REPUTATION_WEIGHTS;
    const low = metrics('n2', 0, 0, 0, 0, 1, 2000);
    const high = metrics('n3', 1, 1, 1, 1, 1, 3000);
    assert.strictEqual(computeReputationScore(low, w), 0);
    assert.strictEqual(computeReputationScore(high, w), 1);
  });

  it('Test 3 — Reputation Decay: inactive node → decayed_score < original_score', () => {
    const current = 0.8;
    const lastActivity = 1000;
    const now = 2000;
    const decayFactor = 0.98;
    const decayed = applyReputationDecay(current, lastActivity, now, decayFactor);
    assert.ok(decayed < current);
    assert.strictEqual(decayed, current * decayFactor);
  });

  it('Test 4 — Reputation Profile Creation: node_id, reputation_score, previous_score, last_updated', () => {
    const m = metrics('n4', 0.5, 0.5, 0.5, 0.5, 10, 4000);
    const w = DEFAULT_REPUTATION_WEIGHTS;
    const profile = computeNodeReputation(m, w, undefined, 5000);
    assert.strictEqual(profile.node_id, 'n4');
    assert.ok(typeof profile.reputation_score === 'number');
    assert.ok(profile.reputation_score >= 0 && profile.reputation_score <= 1);
    assert.strictEqual(profile.last_updated, 5000);
    const prevProfile = Object.freeze({
      node_id: 'n4',
      reputation_score: 0.3,
      last_updated: 4000,
    });
    const profile2 = computeNodeReputation(m, w, prevProfile, 6000);
    assert.strictEqual(profile2.previous_score, 0.3);
  });

  it('Test 5 — Batch Reputation Calculation: deterministic result list', () => {
    const list: NormalizedBehaviorMetrics[] = [
      metrics('node-b', 0.2, 0.3, 0.4, 0.1, 5, 7000),
      metrics('node-a', 0.5, 0.5, 0.5, 0.5, 5, 7000),
    ];
    const batch = computeReputationBatch(list, DEFAULT_REPUTATION_WEIGHTS, 8000);
    assert.strictEqual(batch.length, 2);
    assert.strictEqual(batch[0]!.node_id, 'node-a');
    assert.strictEqual(batch[1]!.node_id, 'node-b');
    const batch2 = computeReputationBatch(list, DEFAULT_REPUTATION_WEIGHTS, 8000);
    assert.deepStrictEqual(batch, batch2);
  });

  it('Test 6 — Deterministic Results: compute twice, result1 === result2', () => {
    const m = metrics('n6', 0.7, 0.6, 0.5, 0.4, 10, 9000);
    const w: ReputationWeights = Object.freeze({
      activity_weight: 0.25,
      consensus_weight: 0.25,
      validation_weight: 0.25,
      governance_weight: 0.25,
    });
    const r1 = computeNodeReputation(m, w, undefined, 10000);
    const r2 = computeNodeReputation(m, w, undefined, 10000);
    assert.deepStrictEqual(r1, r2);
  });
});
