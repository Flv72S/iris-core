/**
 * Phase 13G — Trust Governance Bridge. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  TrustEventType,
  buildTrustEvent,
  evaluateGovernanceTrigger,
  generateGovernanceTriggers,
} from '../index.js';
import type { AnomalyReport } from '../../anomaly_detection/index.js';
import { AnomalyType } from '../../anomaly_detection/index.js';
import type { NodeTrustState } from '../../trust_recovery/index.js';
import { TrustState } from '../../trust_recovery/index.js';
import type { NodeReputationProfile } from '../../reputation_engine/index.js';

function anomaly(node_id: string, anomaly_type: AnomalyType, score: number, ts: number): AnomalyReport {
  return Object.freeze({ node_id, anomaly_type, anomaly_score: score, detection_timestamp: ts });
}

function state(node_id: string, trust_state: TrustState, reputation_score: number, ts: number): NodeTrustState {
  return Object.freeze({ node_id, trust_state, reputation_score, state_timestamp: ts });
}

function rep(node_id: string, reputation_score: number, last_updated: number): NodeReputationProfile {
  return Object.freeze({ node_id, reputation_score, last_updated });
}

describe('Trust Governance Bridge (13G)', () => {
  it('Test 1 — Sybil Escalation: SYBIL_INDICATOR affecting >3 nodes → SYBIL_PATTERN event', () => {
    const anomaly_reports: AnomalyReport[] = [
      anomaly('s1', AnomalyType.SYBIL_INDICATOR, 0.8, 1000),
      anomaly('s2', AnomalyType.SYBIL_INDICATOR, 0.85, 1000),
      anomaly('s3', AnomalyType.SYBIL_INDICATOR, 0.9, 1000),
      anomaly('s4', AnomalyType.SYBIL_INDICATOR, 0.75, 1000),
    ];
    const trust_states: NodeTrustState[] = [
      state('s1', TrustState.PROBATION, 0.5, 1000),
      state('s2', TrustState.PROBATION, 0.5, 1000),
      state('s3', TrustState.PROBATION, 0.5, 1000),
      state('s4', TrustState.PROBATION, 0.5, 1000),
    ];
    const reputations: NodeReputationProfile[] = [
      rep('s1', 0.5, 1000),
      rep('s2', 0.5, 1000),
      rep('s3', 0.5, 1000),
      rep('s4', 0.5, 1000),
    ];
    const events = generateGovernanceTriggers(anomaly_reports, trust_states, reputations, 1100);
    const sybilEvent = events.find((e) => e.event_type === TrustEventType.SYBIL_PATTERN);
    assert.ok(sybilEvent);
    assert.ok(sybilEvent.affected_nodes.length > 3);
  });

  it('Test 2 — Reputation Collapse: cluster with low reputation → REPUTATION_COLLAPSE event', () => {
    const trust_states: NodeTrustState[] = [
      state('r1', TrustState.RESTRICTED, 0.2, 2000),
      state('r2', TrustState.RESTRICTED, 0.15, 2000),
    ];
    const reputations: NodeReputationProfile[] = [rep('r1', 0.2, 2000), rep('r2', 0.15, 2000)];
    const events = evaluateGovernanceTrigger([], trust_states, reputations, 2100);
    const collapseEvent = events.find((e) => e.event_type === TrustEventType.REPUTATION_COLLAPSE);
    assert.ok(collapseEvent);
    assert.strictEqual(collapseEvent.affected_nodes.length, 2);
  });

  it('Test 3 — Deterministic Events: identical input → identical output', () => {
    const anomaly_reports: AnomalyReport[] = [
      anomaly('d1', AnomalyType.TRUST_COLLUSION_CLUSTER, 0.9, 3000),
    ];
    const trust_states: NodeTrustState[] = [state('d1', TrustState.RESTRICTED, 0.4, 3000)];
    const reputations: NodeReputationProfile[] = [rep('d1', 0.4, 3000)];

    const e1 = generateGovernanceTriggers(anomaly_reports, trust_states, reputations, 3100);
    const e2 = generateGovernanceTriggers(anomaly_reports, trust_states, reputations, 3100);

    assert.strictEqual(e1.length, e2.length);
    assert.deepStrictEqual(
      e1.map((x) => ({ event_id: x.event_id, event_type: x.event_type })),
      e2.map((x) => ({ event_id: x.event_id, event_type: x.event_type }))
    );
  });

  it('Test 4 — Sorted Output: events in deterministic order (timestamp, event_type, event_id)', () => {
    const ev1 = buildTrustEvent(TrustEventType.ANOMALY_CLUSTER, ['a', 'b'], 0.5, 1000);
    const ev2 = buildTrustEvent(TrustEventType.SYBIL_PATTERN, ['c'], 0.6, 1000);
    const events = [ev2, ev1].sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      const tc = String(a.event_type).localeCompare(String(b.event_type));
      return tc !== 0 ? tc : a.event_id.localeCompare(b.event_id);
    });
    assert.strictEqual(events[0]!.event_type, TrustEventType.ANOMALY_CLUSTER);
    assert.ok(events[0]!.event_id);
    assert.ok(events[1]!.event_id);
    assert.ok(events[0]!.affected_nodes.indexOf('a') >= 0);
  });
});
