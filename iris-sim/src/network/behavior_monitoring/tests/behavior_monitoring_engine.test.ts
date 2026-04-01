/**
 * Phase 13C — Behavior Monitoring Engine. Test suite.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  recordBehaviorEvent,
  getEventsByNode,
  getEventsInTimeRange,
  computeNodeBehaviorProfile,
  recordNodeAction,
  getNodeBehaviorProfile,
  getActiveNodes,
} from '../index.js';
import type { NodeBehaviorEvent } from '../node_behavior_types.js';

function event(
  node_id: string,
  event_type: string,
  event_timestamp: number,
  metadata?: Record<string, unknown>
): NodeBehaviorEvent {
  return Object.freeze({
    node_id,
    event_type,
    event_timestamp,
    ...(metadata !== undefined && { metadata: Object.freeze(metadata) }),
  });
}

describe('Behavior Monitoring Engine (13C)', () => {
  it('Test 1 — Event Recording: event exists in store, fields correct', () => {
    const ev = event('node-1', 'action_submission', 1000);
    const stored = recordBehaviorEvent(ev);
    assert.strictEqual(stored.node_id, 'node-1');
    assert.strictEqual(stored.event_type, 'action_submission');
    assert.strictEqual(stored.event_timestamp, 1000);
    const byNode = getEventsByNode('node-1');
    assert.ok(byNode.some((e) => e.node_id === 'node-1' && e.event_timestamp === 1000));
  });

  it('Test 2 — Node Event Retrieval: getEventsByNode returns only that node events', () => {
    recordNodeAction('nodeA', 'consensus_vote', 2000);
    recordNodeAction('nodeB', 'validation_performed', 2100);
    recordNodeAction('nodeA', 'action_submission', 2200);
    const forA = getEventsByNode('nodeA');
    assert.strictEqual(forA.filter((e) => e.node_id !== 'nodeA').length, 0);
    assert.ok(forA.length >= 2);
    const forB = getEventsByNode('nodeB');
    assert.strictEqual(forB.filter((e) => e.node_id !== 'nodeB').length, 0);
    assert.ok(forB.length >= 1);
  });

  it('Test 3 — Time Range Query: getEventsInTimeRange returns correct subset', () => {
    const t1 = 3000;
    const t2 = 3100;
    const t3 = 3200;
    const t4 = 3300;
    recordNodeAction('nodeT', 'action_submission', t1);
    recordNodeAction('nodeT', 'consensus_vote', t2);
    recordNodeAction('nodeT', 'validation_performed', t3);
    recordNodeAction('nodeT', 'governance_participation', t4);
    const mid = getEventsInTimeRange(t2, t3);
    assert.ok(mid.every((e) => e.event_timestamp >= t2 && e.event_timestamp <= t3));
    const all = getEventsInTimeRange(t1, t4);
    assert.ok(all.length >= 4);
  });

  it('Test 4 — Behavior Profile Computation: action_count, consensus_votes, validations_performed correct', () => {
    const events: NodeBehaviorEvent[] = [
      event('nodeP', 'action_submission', 4000),
      event('nodeP', 'action_submission', 4010),
      event('nodeP', 'consensus_vote', 4020),
      event('nodeP', 'validation_performed', 4030),
      event('nodeP', 'validation_performed', 4040),
      event('nodeP', 'validation_performed', 4050),
    ];
    for (const e of events) {
      recordBehaviorEvent(e);
    }
    const profile = computeNodeBehaviorProfile('nodeP', getEventsByNode('nodeP'));
    assert.strictEqual(profile.action_count, 2);
    assert.strictEqual(profile.consensus_votes, 1);
    assert.strictEqual(profile.validations_performed, 3);
    assert.strictEqual(profile.total_events, profile.action_count + profile.consensus_votes + profile.validations_performed);
    assert.strictEqual(profile.last_activity_timestamp, 4050);
  });

  it('Test 5 — Active Node Detection: getActiveNodes returns unique node list', () => {
    recordNodeAction('active-1', 'action_submission', 5000);
    recordNodeAction('active-2', 'consensus_vote', 5010);
    recordNodeAction('active-1', 'consensus_vote', 5020);
    const active = getActiveNodes();
    assert.ok(active.includes('active-1'));
    assert.ok(active.includes('active-2'));
    const unique = [...new Set(active)];
    assert.strictEqual(active.length, unique.length, 'getActiveNodes must return unique nodes');
  });

  it('Test 6 — Deterministic Profiles: compute twice, profile1 === profile2', () => {
    const nodeId = 'nodeDet';
    recordNodeAction(nodeId, 'action_submission', 6000);
    recordNodeAction(nodeId, 'governance_participation', 6010);
    const profile1 = getNodeBehaviorProfile(nodeId);
    const profile2 = getNodeBehaviorProfile(nodeId);
    assert.strictEqual(profile1.node_id, profile2.node_id);
    assert.strictEqual(profile1.total_events, profile2.total_events);
    assert.strictEqual(profile1.action_count, profile2.action_count);
    assert.strictEqual(profile1.governance_actions, profile2.governance_actions);
    assert.strictEqual(profile1.last_activity_timestamp, profile2.last_activity_timestamp);
    assert.deepStrictEqual(profile1, profile2);
  });
});
