/**
 * Microstep 10H — Governance Trust State Replay Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { TrustEventPayload } from '../../trust_event_log/types/trust_event_types.js';
import { buildTrustEvent } from '../../trust_event_log/builder/trust_event_builder.js';
import { TrustEventLogEngine } from '../../trust_event_log/engine/trust_event_log_engine.js';
import { readEventStream } from '../reader/event_stream_reader.js';
import { processReplay } from '../processor/replay_processor.js';
import { verifySnapshotFromReplay } from '../verification/replay_verification_engine.js';
import { getReplayState, getProcessedEventCount } from '../query/replay_query_api.js';
import { buildTrustSnapshot } from '../../trust_snapshot/builder/trust_snapshot_builder.js';
import { makeGraph } from './test_helpers.js';

const FIXED_TS = 1000000;

describe('Governance Trust State Replay Engine', () => {
  it('1 — Replay con log vuoto', () => {
    const engine = new TrustEventLogEngine();
    const log = engine.getLog();
    const events = readEventStream(log);
    const result = processReplay(events);
    assert.strictEqual(result.processed_events, 0);
    assert.strictEqual(result.state.trust_graph.nodes.size, 0);
    assert.strictEqual(result.state.trust_graph.edges.length, 0);
    assert.strictEqual(result.state.decisions.length, 0);
  });

  it('2 — Replay con evento di verifica', () => {
    const engine = new TrustEventLogEngine();
    const payload: TrustEventPayload = {
      source: 'verifier-node',
      reference_id: 'cert-1',
      metadata: { target_node: 'issuer-node', certificate_id: 'cert-1' },
    };
    const event = buildTrustEvent('CROSS_NODE_VERIFICATION', payload, FIXED_TS);
    engine.appendEvent(event);
    const payloadMap = new Map<string, TrustEventPayload>();
    payloadMap.set(event.event_id, payload);
    const events = readEventStream(engine.getLog());
    const result = processReplay(events, (e) => payloadMap.get(e.event_id));
    assert.strictEqual(result.processed_events, 1);
    assert.strictEqual(result.state.trust_graph.nodes.size, 2);
    assert.ok(result.state.trust_graph.nodes.has('verifier-node'));
    assert.ok(result.state.trust_graph.nodes.has('issuer-node'));
    assert.strictEqual(result.state.trust_graph.edges.length, 1);
    assert.strictEqual(result.state.trust_graph.edges[0].target_node, 'issuer-node');
  });

  it('3 — Replay con aggiornamento trust graph', () => {
    const engine = new TrustEventLogEngine();
    const payload: TrustEventPayload = {
      source: 'sys',
      reference_id: 'graph-update',
      metadata: {
        nodes: [
          { node_id: 'n1', public_key: 'pk1' },
          { node_id: 'n2', public_key: 'pk2' },
        ],
        edges: [
          { source_node: 'n1', target_node: 'n2', certificate_id: 'c1' },
        ],
      },
    };
    const event = buildTrustEvent('TRUST_GRAPH_UPDATED', payload, FIXED_TS);
    engine.appendEvent(event);
    const payloadMap = new Map<string, TrustEventPayload>();
    payloadMap.set(event.event_id, payload);
    const result = processReplay(readEventStream(engine.getLog()), (e) => payloadMap.get(e.event_id));
    assert.strictEqual(result.state.trust_graph.nodes.size, 2);
    assert.strictEqual(result.state.trust_graph.edges.length, 1);
  });

  it('4 — Replay con decisione policy', () => {
    const engine = new TrustEventLogEngine();
    const payload: TrustEventPayload = {
      source: 'policy-engine',
      reference_id: 'node-x',
      metadata: { node_id: 'node-x', decision: 'ACCEPT', policy_id: 'pol-1' },
    };
    const event = buildTrustEvent('TRUST_POLICY_DECISION', payload, FIXED_TS);
    engine.appendEvent(event);
    const payloadMap = new Map<string, TrustEventPayload>();
    payloadMap.set(event.event_id, payload);
    const result = processReplay(readEventStream(engine.getLog()), (e) => payloadMap.get(e.event_id));
    assert.strictEqual(result.state.decisions.length, 1);
    assert.strictEqual(result.state.decisions[0].node_id, 'node-x');
    assert.strictEqual(result.state.decisions[0].decision, 'ACCEPT');
    assert.strictEqual(result.state.decisions[0].policy_id, 'pol-1');
  });

  it('5 — Replay con snapshot', () => {
    const engine = new TrustEventLogEngine();
    const payload: TrustEventPayload = {
      source: 'snapshot-engine',
      reference_id: 'snap-1',
      metadata: { snapshot_id: 'snap-1' },
    };
    const event = buildTrustEvent('TRUST_SNAPSHOT_CREATED', payload, FIXED_TS);
    engine.appendEvent(event);
    const payloadMap = new Map<string, TrustEventPayload>();
    payloadMap.set(event.event_id, payload);
    const result = processReplay(readEventStream(engine.getLog()), (e) => payloadMap.get(e.event_id));
    assert.strictEqual(result.processed_events, 1);
    assert.strictEqual(result.state.trust_graph.nodes.size, 0);
  });

  it('6 — Costruzione stato corretta', () => {
    const engine = new TrustEventLogEngine();
    const payloads = new Map<string, TrustEventPayload>();
    const e1 = buildTrustEvent('CROSS_NODE_VERIFICATION', {
      source: 'v',
      reference_id: 'r1',
      metadata: { target_node: 't1', certificate_id: 'c1' },
    }, FIXED_TS);
    engine.appendEvent(e1);
    payloads.set(e1.event_id, { source: 'v', reference_id: 'r1', metadata: { target_node: 't1', certificate_id: 'c1' } });
    const e2 = buildTrustEvent('TRUST_POLICY_DECISION', {
      source: 'p',
      reference_id: 't1',
      metadata: { node_id: 't1', decision: 'ACCEPT', policy_id: 'pol' },
    }, FIXED_TS + 1);
    engine.appendEvent(e2);
    payloads.set(e2.event_id, { source: 'p', reference_id: 't1', metadata: { node_id: 't1', decision: 'ACCEPT', policy_id: 'pol' } });
    const result = processReplay(readEventStream(engine.getLog()), (e) => payloads.get(e.event_id));
    assert.strictEqual(result.state.trust_graph.nodes.size, 2);
    assert.strictEqual(result.state.trust_scores.length, 2);
    assert.strictEqual(result.state.decisions.length, 1);
  });

  it('7 — Verifica snapshot da replay', () => {
    const graph = makeGraph(
      [{ node_id: 'a', public_key: 'pk1' }, { node_id: 'b', public_key: 'pk2' }],
      [{ source: 'a', target: 'b', cert_id: 'c1' }]
    );
    const scores = [{ node_id: 'a', score: 0 }, { node_id: 'b', score: 1 }];
    const decisions = [{ node_id: 'b', decision: 'ACCEPT' as const, policy_id: 'pol' }];
    const snapshot = buildTrustSnapshot({
      trust_graph: graph,
      trust_scores: scores,
      policies: [],
      decisions,
      timestamp: FIXED_TS,
    });
    const replay_state = {
      trust_graph: graph,
      trust_scores: scores,
      decisions,
    };
    const verification = verifySnapshotFromReplay(snapshot, replay_state);
    assert.strictEqual(verification.valid, true);
    assert.strictEqual(verification.snapshot_id, snapshot.snapshot_id);
  });

  it('8 — Replay deterministico', () => {
    const engine = new TrustEventLogEngine();
    const payload: TrustEventPayload = {
      source: 'v',
      reference_id: 'r',
      metadata: { target_node: 't', certificate_id: 'c' },
    };
    const event = buildTrustEvent('CROSS_NODE_VERIFICATION', payload, FIXED_TS);
    engine.appendEvent(event);
    const getPayload = () => payload;
    const events = readEventStream(engine.getLog());
    const r1 = processReplay(events, getPayload);
    const r2 = processReplay(events, getPayload);
    assert.strictEqual(r1.state.trust_graph.nodes.size, r2.state.trust_graph.nodes.size);
    assert.strictEqual(r1.state.trust_graph.edges.length, r2.state.trust_graph.edges.length);
    assert.strictEqual(r1.processed_events, r2.processed_events);
  });

  it('9 — Numero eventi processati corretto', () => {
    const engine = new TrustEventLogEngine();
    const payload: TrustEventPayload = { source: 's', reference_id: 'r' };
    for (let i = 0; i < 5; i++) {
      const e = buildTrustEvent('TRUST_SNAPSHOT_CREATED', { ...payload, reference_id: `r-${i}` }, FIXED_TS + i);
      engine.appendEvent(e);
    }
    const events = readEventStream(engine.getLog());
    const result = processReplay(events);
    assert.strictEqual(getProcessedEventCount(result), 5);
    assert.strictEqual(result.processed_events, 5);
  });

  it('10 — Stesso log → stesso stato ricostruito', () => {
    const engine = new TrustEventLogEngine();
    const payload: TrustEventPayload = {
      source: 'verifier',
      reference_id: 'ref',
      metadata: { target_node: 'target', certificate_id: 'cert-x' },
    };
    const event = buildTrustEvent('CROSS_NODE_VERIFICATION', payload, FIXED_TS);
    engine.appendEvent(event);
    const getPayload = (e: { event_id: string }) => (e.event_id === event.event_id ? payload : undefined);
    const events = readEventStream(engine.getLog());
    const result1 = processReplay(events, getPayload);
    const result2 = processReplay(events, getPayload);
    const s1 = getReplayState(result1);
    const s2 = getReplayState(result2);
    assert.strictEqual(s1.trust_graph.nodes.size, s2.trust_graph.nodes.size);
    assert.strictEqual(s1.trust_graph.edges.length, s2.trust_graph.edges.length);
    assert.strictEqual(s1.decisions.length, s2.decisions.length);
    assert.strictEqual(s1.trust_scores.length, s2.trust_scores.length);
  });
});
