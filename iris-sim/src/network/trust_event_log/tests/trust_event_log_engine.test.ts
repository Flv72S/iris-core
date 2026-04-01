/**
 * Microstep 10G — Governance Trust Event Log Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { TrustEventPayload } from '../types/trust_event_types.js';
import { buildTrustEvent } from '../builder/trust_event_builder.js';
import { hashPayload, computeEventHash } from '../hashing/event_hash_engine.js';
import { TrustEventLogEngine } from '../engine/trust_event_log_engine.js';
import {
  getEventsByType,
  getEventsByTimeRange,
  getLastEvent,
} from '../query/event_log_query.js';
import { serializeEventPayload, generateEventId } from '../utils/event_utils.js';

const FIXED_TS = 1000000;

describe('Governance Trust Event Log Engine', () => {
  it('1 — Creazione evento valida', () => {
    const payload: TrustEventPayload = {
      source: 'node-1',
      reference_id: 'ref-001',
    };
    const event = buildTrustEvent('CROSS_NODE_VERIFICATION', payload, FIXED_TS);
    assert.strictEqual(typeof event.event_id, 'string');
    assert.strictEqual(event.event_id.length > 0, true);
    assert.strictEqual(event.type, 'CROSS_NODE_VERIFICATION');
    assert.strictEqual(event.timestamp, FIXED_TS);
    assert.strictEqual(typeof event.payload_hash, 'string');
    assert.strictEqual(typeof event.event_hash, 'string');
  });

  it('2 — Hash payload deterministico', () => {
    const payload: TrustEventPayload = {
      source: 's',
      reference_id: 'r',
    };
    const h1 = hashPayload(payload);
    const h2 = hashPayload({ ...payload });
    assert.strictEqual(h1, h2);
  });

  it('3 — Hash evento deterministico', () => {
    const h1 = computeEventHash('TRUST_SNAPSHOT_CREATED', FIXED_TS, 'phash123');
    const h2 = computeEventHash('TRUST_SNAPSHOT_CREATED', FIXED_TS, 'phash123');
    assert.strictEqual(h1, h2);
    const h3 = computeEventHash('TRUST_SNAPSHOT_CREATED', FIXED_TS + 1, 'phash123');
    assert.notStrictEqual(h1, h3);
  });

  it('4 — Append event nel log', () => {
    const engine = new TrustEventLogEngine();
    const payload: TrustEventPayload = { source: 's', reference_id: 'r' };
    const event = buildTrustEvent('TRUST_GRAPH_UPDATED', payload, FIXED_TS);
    engine.appendEvent(event);
    assert.strictEqual(engine.getEventCount(), 1);
    const events = engine.getEvents();
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].event_id, event.event_id);
  });

  it('5 — Append multipli eventi', () => {
    const engine = new TrustEventLogEngine();
    const e1 = buildTrustEvent(
      'CROSS_NODE_VERIFICATION',
      { source: 'a', reference_id: 'r1' },
      FIXED_TS
    );
    const e2 = buildTrustEvent(
      'TRUST_POLICY_DECISION',
      { source: 'b', reference_id: 'r2' },
      FIXED_TS + 1
    );
    engine.appendEvent(e1);
    engine.appendEvent(e2);
    assert.strictEqual(engine.getEventCount(), 2);
    const events = engine.getEvents();
    assert.strictEqual(events[0].type, 'CROSS_NODE_VERIFICATION');
    assert.strictEqual(events[1].type, 'TRUST_POLICY_DECISION');
  });

  it('6 — Query eventi per tipo', () => {
    const engine = new TrustEventLogEngine();
    engine.appendEvent(
      buildTrustEvent('TRUST_SNAPSHOT_CREATED', { source: 'x', reference_id: 'sn1' }, FIXED_TS)
    );
    engine.appendEvent(
      buildTrustEvent('TRUST_GRAPH_UPDATED', { source: 'x', reference_id: 'g1' }, FIXED_TS + 1)
    );
    engine.appendEvent(
      buildTrustEvent('TRUST_SNAPSHOT_CREATED', { source: 'x', reference_id: 'sn2' }, FIXED_TS + 2)
    );
    const log = engine.getLog();
    const snapshots = getEventsByType(log, 'TRUST_SNAPSHOT_CREATED');
    assert.strictEqual(snapshots.length, 2);
    const graph = getEventsByType(log, 'TRUST_GRAPH_UPDATED');
    assert.strictEqual(graph.length, 1);
  });

  it('7 — Query eventi per intervallo temporale', () => {
    const engine = new TrustEventLogEngine();
    const base = FIXED_TS;
    engine.appendEvent(
      buildTrustEvent('CROSS_NODE_VERIFICATION', { source: 'a', reference_id: '1' }, base)
    );
    engine.appendEvent(
      buildTrustEvent('CROSS_NODE_VERIFICATION', { source: 'a', reference_id: '2' }, base + 10)
    );
    engine.appendEvent(
      buildTrustEvent('CROSS_NODE_VERIFICATION', { source: 'a', reference_id: '3' }, base + 20)
    );
    const log = engine.getLog();
    const range = getEventsByTimeRange(log, base + 5, base + 15);
    assert.strictEqual(range.length, 1);
    assert.strictEqual(range[0].timestamp, base + 10);
    const allInRange = getEventsByTimeRange(log, base, base + 20);
    assert.strictEqual(allInRange.length, 3);
  });

  it('8 — Recupero ultimo evento', () => {
    const engine = new TrustEventLogEngine();
    assert.strictEqual(getLastEvent(engine.getLog()), null);
    const e1 = buildTrustEvent('TRUST_POLICY_DECISION', { source: 'p', reference_id: '1' }, FIXED_TS);
    engine.appendEvent(e1);
    assert.strictEqual(getLastEvent(engine.getLog())?.event_id, e1.event_id);
    const e2 = buildTrustEvent('TRUST_POLICY_DECISION', { source: 'p', reference_id: '2' }, FIXED_TS + 1);
    engine.appendEvent(e2);
    assert.strictEqual(getLastEvent(engine.getLog())?.event_id, e2.event_id);
  });

  it('9 — Append-only garantito', () => {
    const engine = new TrustEventLogEngine();
    const e = buildTrustEvent('TRUST_GRAPH_UPDATED', { source: 's', reference_id: 'r' }, FIXED_TS);
    engine.appendEvent(e);
    const events1 = engine.getEvents();
    engine.appendEvent(
      buildTrustEvent('TRUST_SNAPSHOT_CREATED', { source: 's', reference_id: 'r2' }, FIXED_TS + 1)
    );
    const events2 = engine.getEvents();
    assert.strictEqual(events1.length, 1);
    assert.strictEqual(events2.length, 2);
    assert.strictEqual(events1[0].event_id, events2[0].event_id);
    assert.strictEqual(events2[0].event_id, e.event_id);
  });

  it('10 — Determinismo completo: stesso payload → stesso event_hash', () => {
    const payload: TrustEventPayload = {
      source: 'node-x',
      reference_id: 'ref-same',
      metadata: { k: 'v' },
    };
    const event1 = buildTrustEvent('CROSS_NODE_VERIFICATION', payload, FIXED_TS);
    const event2 = buildTrustEvent('CROSS_NODE_VERIFICATION', payload, FIXED_TS);
    assert.strictEqual(event1.event_hash, event2.event_hash);
    assert.strictEqual(event1.event_id, event2.event_id);
    assert.strictEqual(event1.payload_hash, event2.payload_hash);
  });
});

describe('Event utils', () => {
  it('serializeEventPayload and generateEventId', () => {
    const p: TrustEventPayload = { source: 'a', reference_id: 'b' };
    const s1 = serializeEventPayload(p);
    const s2 = serializeEventPayload(p);
    assert.strictEqual(s1, s2);
    const id = generateEventId('abc123hash');
    assert.strictEqual(id, 'abc123hash');
  });
});
