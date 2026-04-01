import { describe, it } from 'node:test';
import assert from 'node:assert';

import { Span } from '../../tracing/span.js';
import type { SpanModel } from '../../tracing/span.js';
import { mapIrisSpanToOtel } from '../span_mapper.js';
import { SpanKind, SpanStatusCode, type OTelSpan } from '../otel_types.js';

function attrString(ot: OTelSpan, key: string): string | undefined {
  const a = ot.attributes.find((x) => x.key === key);
  return a?.value.stringValue;
}

function attrInt(ot: OTelSpan, key: string): number | undefined {
  const a = ot.attributes.find((x) => x.key === key);
  return a?.value.intValue;
}

function attrDouble(ot: OTelSpan, key: string): number | undefined {
  const a = ot.attributes.find((x) => x.key === key);
  return a?.value.doubleValue;
}

describe('OpenTelemetry span_mapper', () => {
  it('maps IRIS Span to OTel span (timestamps ns strings, OTLP attributes, hex ids)', () => {
    const span = new Span('message_send', { traceId: 'trace-a', metadata: { k: 'v' } });
    span.end({ extra: 1 });
    const ot = mapIrisSpanToOtel(span, { nodeId: 'node-1' });
    assert.ok(ot);
    assert.strictEqual(ot!.name, 'message_send');
    assert.strictEqual(ot!.kind, SpanKind.CLIENT);
    assert.match(ot!.startTimeUnixNano, /^\d+$/);
    assert.match(ot!.endTimeUnixNano, /^\d+$/);
    assert.ok(BigInt(ot!.endTimeUnixNano) >= BigInt(ot!.startTimeUnixNano));
    assert.strictEqual(attrString(ot!, 'iris.trace_id'), 'trace-a');
    assert.strictEqual(attrString(ot!, 'iris.span_id'), span.id);
    assert.strictEqual(attrString(ot!, 'iris.node_id'), 'node-1');
    assert.strictEqual(attrString(ot!, 'iris.meta.k'), 'v');
    assert.strictEqual(attrInt(ot!, 'iris.meta.extra'), 1);
    assert.strictEqual(ot!.traceId.length, 32);
    assert.strictEqual(ot!.spanId.length, 16);
    assert.match(ot!.traceId, /^[0-9a-f]+$/);
    assert.match(ot!.spanId, /^[0-9a-f]+$/);
    assert.strictEqual(ot!.parentSpanId, undefined);
    assert.strictEqual(ot!.status.code, SpanStatusCode.OK);
    assert.ok(ot!.events && ot!.events.length >= 2);
    assert.strictEqual(ot!.events!.some((e) => e.name === 'span.start'), true);
    assert.strictEqual(ot!.events!.some((e) => e.name === 'span.end'), true);
  });

  it('maps float metadata to doubleValue', () => {
    const span = new Span('x', { traceId: 't-float', metadata: { ratio: 1.25 } });
    span.end();
    const ot = mapIrisSpanToOtel(span);
    assert.ok(ot);
    assert.strictEqual(attrDouble(ot!, 'iris.meta.ratio'), 1.25);
  });

  it('maps error metadata to ERROR status and exception event', () => {
    const span = new Span('fail', { traceId: 't-err', metadata: { error: true, message: 'boom' } });
    span.end();
    const ot = mapIrisSpanToOtel(span);
    assert.ok(ot);
    assert.strictEqual(ot!.status.code, SpanStatusCode.ERROR);
    assert.strictEqual(ot!.status.message, 'boom');
    assert.ok(ot!.events!.some((e) => e.name === 'exception'));
  });

  it('preserves parent-child via parentSpanId encoding', () => {
    const parent = new Span('message_receive', { traceId: 't1' });
    parent.end();
    const parentModel = parent.toJSON();
    const child = new Span('nested', { traceId: 't1', parentSpanId: parent.id });
    child.end();
    const p = mapIrisSpanToOtel(parentModel);
    const c = mapIrisSpanToOtel(child);
    assert.ok(p && c);
    assert.strictEqual(attrString(c!, 'iris.parent_span_id'), parent.id);
    assert.strictEqual(c!.parentSpanId !== undefined, true);
    assert.strictEqual(c!.parentSpanId!.length, 16);
  });

  it('maps SpanModel without mutating', () => {
    const m: SpanModel = {
      id: 's1',
      name: 'x',
      startTime: 1000,
      endTime: 1005,
      traceId: 'tr',
    };
    const before = JSON.stringify(m);
    const ot = mapIrisSpanToOtel(m);
    assert.ok(ot);
    assert.strictEqual(JSON.stringify(m), before);
  });

  it('returns null for missing trace id', () => {
    const m: SpanModel = {
      id: 's1',
      name: 'x',
      startTime: 1000,
      endTime: 1005,
    };
    assert.strictEqual(mapIrisSpanToOtel(m), null);
  });

  it('uses startTime as end when endTime missing (open span edge case)', () => {
    const span = new Span('openish', { traceId: 't-open' });
    const ot = mapIrisSpanToOtel(span);
    assert.ok(ot);
    assert.strictEqual(ot!.endTimeUnixNano, ot!.startTimeUnixNano);
  });
});
