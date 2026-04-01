/**
 * Phase 13F — Trust Data Normalization Layer. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  computeActivityBaseline,
  normalizeBehaviorProfile,
  applyTemporalSmoothing,
} from '../index.js';
import type { NodeBehaviorProfile } from '../../behavior_monitoring/index.js';

function profile(
  node_id: string,
  total_events: number,
  action_count: number,
  consensus_votes: number,
  validations_performed: number,
  governance_actions: number,
  last_activity_timestamp: number
): NodeBehaviorProfile {
  return Object.freeze({
    node_id,
    total_events,
    action_count,
    consensus_votes,
    validations_performed,
    governance_actions,
    last_activity_timestamp,
  });
}

describe('Trust Data Normalization (13F)', () => {
  it('Test 1 — Baseline Calculation: computeActivityBaseline returns correct average', () => {
    const profiles: NodeBehaviorProfile[] = [
      profile('n1', 10, 2, 3, 4, 1, 1000),
      profile('n2', 20, 5, 5, 5, 5, 2000),
      profile('n3', 30, 10, 10, 10, 0, 3000),
    ];
    const baseline = computeActivityBaseline(profiles);
    assert.strictEqual(baseline, 20);
  });

  it('Test 2 — Profile Normalization: normalized scores within 0 ≤ score ≤ 1', () => {
    const p = profile('n1', 10, 2, 3, 4, 1, 1000);
    const normalized = normalizeBehaviorProfile(p, 10, 5000);
    assert.ok(normalized.normalized_activity_score >= 0 && normalized.normalized_activity_score <= 1);
    assert.ok(normalized.normalized_consensus_score >= 0 && normalized.normalized_consensus_score <= 1);
    assert.ok(normalized.normalized_validation_score >= 0 && normalized.normalized_validation_score <= 1);
    assert.ok(normalized.normalized_governance_score >= 0 && normalized.normalized_governance_score <= 1);
    assert.strictEqual(normalized.normalized_consensus_score, 0.3);
    assert.strictEqual(normalized.normalized_validation_score, 0.4);
    assert.strictEqual(normalized.normalized_governance_score, 0.1);
  });

  it('Test 3 — High Activity Clamping: normalized_activity_score ≤ 1', () => {
    const p = profile('nHigh', 1000, 100, 200, 300, 400, 9999);
    const baseline = 10;
    const normalized = normalizeBehaviorProfile(p, baseline, 6000);
    assert.strictEqual(normalized.normalized_activity_score, 1);
  });

  it('Test 4 — Smoothing Function: smoothed value between previous and new', () => {
    const prev = 0.2;
    const newVal = 0.8;
    const factor = 0.7;
    const smoothed = applyTemporalSmoothing(prev, newVal, factor);
    assert.ok(smoothed >= prev && smoothed <= newVal);
    assert.strictEqual(smoothed, prev * factor + newVal * (1 - factor));
  });

  it('Test 5 — Deterministic Output: normalize same profile twice, result1 === result2', () => {
    const p = profile('nDet', 15, 3, 5, 5, 2, 7000);
    const baseline = 15;
    const result1 = normalizeBehaviorProfile(p, baseline, 8000);
    const result2 = normalizeBehaviorProfile(p, baseline, 8000);
    assert.deepStrictEqual(result1, result2);
  });
});
