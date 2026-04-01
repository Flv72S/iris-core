import { describe, it } from 'node:test';
import assert from 'node:assert';

import { Span } from '../../tracing/span.js';
import type { OTelSpan } from '../otel_types.js';
import { SpanKind, SpanStatusCode } from '../otel_types.js';
import { exportSpansToOtlpJson } from '../otlp_exporter.js';
import { mapAttributes, mapIrisSpanToOtel } from '../span_mapper.js';

describe('OpenTelemetry semantics (16E.X2.FINAL)', () => {
  it('events disabled via opts leaves OTelSpan.events undefined', () => {
    const span = new Span('x', { traceId: 't-no-ev' });
    span.end();
    const ot = mapIrisSpanToOtel(span, { events: { enabled: false } });
    assert.strictEqual(ot!.events, undefined);
  });

  it('mapAttributes: integer → intValue, float → doubleValue', () => {
    const kvs = mapAttributes({ i: 42, f: 2.5, z: -0.25 });
    const byKey = Object.fromEntries(kvs.map((k) => [k.key, k.value]));
    assert.strictEqual(byKey.i?.intValue, 42);
    assert.strictEqual(byKey.f?.doubleValue, 2.5);
    assert.strictEqual(byKey.z?.doubleValue, -0.25);
  });

  it('mapAttributes: NaN and Infinity → stringValue', () => {
    const kvs = mapAttributes({ a: NaN, b: Infinity });
    assert.strictEqual(kvs.find((x) => x.key === 'a')?.value.stringValue, 'NaN');
    assert.strictEqual(kvs.find((x) => x.key === 'b')?.value.stringValue, 'Infinity');
  });

  it('default span status is OK', () => {
    const span = new Span('ok', { traceId: 't-ok' });
    span.end();
    const ot = mapIrisSpanToOtel(span);
    assert.ok(ot);
    assert.strictEqual(ot!.status.code, SpanStatusCode.OK);
    assert.strictEqual(ot!.status.message, undefined);
  });

  it('error string in metadata → ERROR with message', () => {
    const span = new Span('e', { traceId: 't-es', metadata: { error: 'failed op' } });
    span.end();
    const ot = mapIrisSpanToOtel(span);
    assert.ok(ot);
    assert.strictEqual(ot!.status.code, SpanStatusCode.ERROR);
    assert.strictEqual(ot!.status.message, 'failed op');
  });

  it('events include span.start and span.end with correct nano timestamps', () => {
    const span = new Span('ev', { traceId: 't-ev' });
    span.end();
    const ot = mapIrisSpanToOtel(span);
    assert.ok(ot);
    const startEv = ot!.events!.find((e) => e.name === 'span.start');
    const endEv = ot!.events!.find((e) => e.name === 'span.end');
    assert.strictEqual(startEv?.timeUnixNano, ot!.startTimeUnixNano);
    assert.strictEqual(endEv?.timeUnixNano, ot!.endTimeUnixNano);
    assert.ok(BigInt(endEv!.timeUnixNano) >= BigInt(startEv!.timeUnixNano));
  });

  it('full OTLP JSON has no undefined fields in parsed span', () => {
    const s: OTelSpan = {
      traceId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      spanId: 'bbbbbbbbbbbbbbbb',
      name: 'n',
      kind: SpanKind.INTERNAL,
      startTimeUnixNano: '10',
      endTimeUnixNano: '20',
      attributes: [{ key: 'k', value: { doubleValue: 0.5 } }],
      status: { code: SpanStatusCode.OK },
      events: [{ name: 'span.start', timeUnixNano: '10' }],
    };
    const j = exportSpansToOtlpJson([s], 'svc', 'nid');
    const str = JSON.stringify(JSON.parse(j));
    assert.strictEqual(str.includes('undefined'), false);
    const span = JSON.parse(j).resourceSpans[0].scopeSpans[0].spans[0];
    assert.strictEqual(span.status.code, 1);
    assert.ok(Array.isArray(span.attributes));
  });

  it('deterministic: same spans → identical JSON string', () => {
    const s: OTelSpan = {
      traceId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      spanId: 'bbbbbbbbbbbbbbbb',
      name: 'n',
      kind: SpanKind.INTERNAL,
      startTimeUnixNano: '5',
      endTimeUnixNano: '6',
      attributes: [],
      status: { code: SpanStatusCode.OK },
    };
    assert.strictEqual(exportSpansToOtlpJson([s], 'x', 'y'), exportSpansToOtlpJson([s], 'x', 'y'));
  });
});
