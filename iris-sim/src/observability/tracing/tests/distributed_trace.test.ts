/**
 * Phase 16E.X3 — Distributed trace propagation (multi-hop, logger, backward compat).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { IrisNode } from '../../../sdk/iris_node.js';
import type { IrisMessage } from '../../../sdk/iris_types.js';
import { Tracer } from '../tracer.js';
import { generateTraceId, isValidTraceContext, runWithTraceContext } from '../trace_context.js';
import type { TraceContext } from '../trace_context.js';

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Mirrors IrisNode `send()` trace injection (Phase 16E.X3). */
function simulateSendTrace(tr: Tracer, parent: TraceContext | undefined): TraceContext {
  return runWithTraceContext(tr, () => {
    const traceId = parent ? parent.traceId : generateTraceId();
    const parentSpanId = parent ? parent.spanId : undefined;
    const span = tr.startSpan('message_send', {
      traceId,
      ...(parentSpanId ? { parentSpanId } : {}),
    });
    const out: TraceContext = {
      traceId,
      spanId: span.id,
      ...(parentSpanId ? { parentSpanId: parentSpanId } : {}),
    };
    tr.endSpan(span);
    return out;
  });
}

/** Mirrors IrisNode `handleTransportReceive` trace handling. */
function simulateReceiveTrace(tr: Tracer, incoming: TraceContext | undefined): void {
  runWithTraceContext(tr, () => {
    const traceId = incoming?.traceId ?? generateTraceId();
    const parentSpanId = incoming?.spanId;
    const span = tr.startSpan('message_receive', {
      traceId,
      ...(parentSpanId ? { parentSpanId: parentSpanId } : {}),
    });
    tr.endSpan(span);
  });
}

describe('Observability / Distributed tracing', () => {
  it('trace_context helpers validate shape', () => {
    assert.ok(isValidTraceContext({ traceId: 't1', spanId: 's1' }));
    assert.ok(isValidTraceContext({ traceId: 't1', spanId: 's1', parentSpanId: 'p1' }));
    assert.ok(!isValidTraceContext({ traceId: '', spanId: 's1' }));
    assert.ok(!isValidTraceContext({ traceId: 't', spanId: '' }));
    assert.ok(!isValidTraceContext(null));
    assert.ok(!isValidTraceContext({ traceId: 1, spanId: 's' }));
    assert.ok(typeof generateTraceId() === 'string' && generateTraceId().length > 4);
  });

  it('Tracer reuses traceId and parents from parentSpanId', () => {
    const tr = new Tracer();
    const tid = generateTraceId();
    const parent = tr.startSpan('root', { traceId: tid });
    const child = tr.startSpan('child', { traceId: tid, parentSpanId: parent.id });
    tr.endSpan(child);
    tr.endSpan(parent);
    const exp = tr.exportSpans();
    assert.strictEqual(exp.length, 2);
    const byName = Object.fromEntries(exp.map((s) => [s.name, s])) as Record<string, (typeof exp)[0]>;
    assert.strictEqual(byName.root?.traceId, tid);
    assert.strictEqual(byName.child?.traceId, tid);
    assert.strictEqual(byName.child?.parentSpanId, parent.id);
  });

  it('propagates same traceId across send → receive → send → receive', async () => {
    const node = new IrisNode({ node_id: 'dist-trace-1' });
    await node.start();
    const received: Array<{ meta?: { trace?: unknown } }> = [];
    node.on('message', (msg: unknown) => {
      received.push(msg as { meta?: { trace?: unknown } });
    });

    await node.send({ type: 'hop-a', payload: { n: 1 } });
    await delay(120);
    assert.strictEqual(received.length, 1);
    const first = received[0].meta?.trace;
    assert.ok(isValidTraceContext(first), 'first message must carry trace');
    const traceId = (first as { traceId: string }).traceId;

    await node.send({
      type: 'hop-b',
      payload: { n: 2 },
      meta: { trace: first as { traceId: string; spanId: string; parentSpanId?: string } },
    });
    await delay(120);
    assert.strictEqual(received.length, 2);
    const second = received[1].meta?.trace;
    assert.ok(isValidTraceContext(second));
    assert.strictEqual((second as { traceId: string }).traceId, traceId);
    assert.strictEqual((second as { parentSpanId?: string }).parentSpanId, (first as { spanId: string }).spanId);

    await node.stop();
  });

  it('every outgoing message has meta.trace after send()', async () => {
    const node = new IrisNode({ node_id: 'dist-trace-2' });
    await node.start();
    const msg: IrisMessage = { type: 'x', payload: {} };
    await node.send(msg);
    assert.ok(isValidTraceContext(msg.meta?.trace));
    await node.stop();
  });

  it('backward compatible: messages without meta.trace still deliver', async () => {
    const node = new IrisNode({ node_id: 'dist-trace-3' });
    await node.start();
    let got = false;
    node.on('message', () => {
      got = true;
    });
    await node.send({ type: 'legacy', payload: { ok: true } });
    await delay(120);
    assert.strictEqual(got, true);
    await node.stop();
  });

  it('multi-hop A → B → C: same traceId and valid parent chain', () => {
    const trA = new Tracer();
    const trB = new Tracer();
    const trC = new Tracer();

    const traceA = simulateSendTrace(trA, undefined);
    assert.ok(isValidTraceContext(traceA));

    simulateReceiveTrace(trB, traceA);
    const traceB = simulateSendTrace(trB, traceA);

    simulateReceiveTrace(trC, traceB);

    assert.strictEqual(traceA.traceId, traceB.traceId);
    assert.strictEqual(traceB.parentSpanId, traceA.spanId);
    assert.notStrictEqual(traceB.spanId, traceA.spanId);

    const exportedA = trA.exportSpans();
    const exportedB = trB.exportSpans();
    const exportedC = trC.exportSpans();
    const sendA = exportedA.find((s) => s.name === 'message_send');
    const recvB = exportedB.find((s) => s.name === 'message_receive');
    const sendB = exportedB.find((s) => s.name === 'message_send');
    const recvC = exportedC.find((s) => s.name === 'message_receive');
    assert.ok(sendA?.traceId === traceA.traceId);
    assert.ok(recvB?.parentSpanId === traceA.spanId);
    assert.ok(sendB?.parentSpanId === traceA.spanId);
    assert.ok(recvC?.parentSpanId === traceB.spanId);
  });

  it('malformed meta.trace is ignored and a new trace is used', async () => {
    const node = new IrisNode({ node_id: 'dist-trace-4' });
    await node.start();
    const received: unknown[] = [];
    node.on('message', (m: unknown) => received.push(m));
    await node.send({
      type: 'bad-trace',
      payload: null,
      meta: { trace: { traceId: '', spanId: 'only' } as any },
    });
    await delay(120);
    assert.strictEqual(received.length, 1);
    const m = received[0] as { meta?: { trace?: unknown } };
    assert.ok(isValidTraceContext(m.meta?.trace));
    await node.stop();
  });
});
