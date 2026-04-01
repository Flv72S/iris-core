import { describe, it } from 'node:test';
import assert from 'node:assert';

import { Span } from '../../tracing/span.js';
import type { OTelSpan } from '../otel_types.js';
import { SpanKind, SpanStatusCode } from '../otel_types.js';
import { exportSpansToOtlpJson } from '../otlp_exporter.js';
import { mapIrisSpanToOtel, mapAttributes, msToUnixNanoString, toHexId } from '../span_mapper.js';

const HEX32 = /^[0-9a-f]{32}$/;
const HEX16 = /^[0-9a-f]{16}$/;

describe('OTLP compliance (16E.X2.FIX)', () => {
  it('toHexId produces fixed-length lowercase hex', () => {
    const t = toHexId('iris-trace-key', 16);
    const s = toHexId('iris-span-key', 8);
    assert.strictEqual(t.length, 32);
    assert.strictEqual(s.length, 16);
    assert.match(t, HEX32);
    assert.match(s, HEX16);
    assert.strictEqual(toHexId('same', 16), toHexId('same', 16));
    assert.notStrictEqual(toHexId('a', 16), toHexId('b', 16));
  });

  it('mapAttributes produces OTLP key/value structure and sorts keys', () => {
    const kvs = mapAttributes({
      z: 1,
      a: 'x',
      b: true,
      skip: null,
      also: undefined,
    });
    const keys = kvs.map((k) => k.key);
    assert.deepStrictEqual(keys, ['a', 'b', 'z']);
    assert.strictEqual(kvs[0]!.value.stringValue, 'x');
    assert.strictEqual(kvs[1]!.value.boolValue, true);
    assert.strictEqual(kvs[2]!.value.intValue, 1);
  });

  it('mapAttributes stringifies object metadata as stringValue', () => {
    const kvs = mapAttributes({ ok: 'yes', nested: { x: 1 } });
    const nested = kvs.find((k) => k.key === 'nested');
    assert.strictEqual(nested?.value.stringValue, '{"x":1}');
  });

  it('timestamps are decimal strings with no precision loss vs BigInt', () => {
    const ms = 1700000000123;
    const ns = msToUnixNanoString(ms);
    assert.strictEqual(typeof ns, 'string');
    assert.strictEqual(ns, (BigInt(ms) * 1_000_000n).toString());
    assert.match(ns, /^\d+$/);
  });

  it('very large ms still maps via BigInt', () => {
    const ms = Number.MAX_SAFE_INTEGER;
    const ns = msToUnixNanoString(ms);
    assert.strictEqual(ns, (BigInt(ms) * 1_000_000n).toString());
  });

  it('mapped span has strict id lengths and hex', () => {
    const span = new Span('message_send', { traceId: 'trace-compliance', metadata: {} });
    span.end();
    const ot = mapIrisSpanToOtel(span);
    assert.ok(ot);
    assert.match(ot!.traceId, HEX32);
    assert.match(ot!.spanId, HEX16);
  });

  it('full payload JSON is valid, deterministic, and has required resource attributes', () => {
    const s1: OTelSpan = {
      traceId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      spanId: 'bbbbbbbbbbbbbbbb',
      name: 's',
      kind: SpanKind.INTERNAL,
      startTimeUnixNano: '2000',
      endTimeUnixNano: '3000',
      attributes: [],
      status: { code: SpanStatusCode.OK },
    };
    const j1 = exportSpansToOtlpJson([s1], 'svc', 'nid');
    const j2 = exportSpansToOtlpJson([s1], 'svc', 'nid');
    assert.strictEqual(j1, j2);
    const parsed = JSON.parse(j1) as {
      resourceSpans: Array<{
        resource: { attributes: Array<{ key: string; value: Record<string, unknown> }> };
        scopeSpans: Array<{ spans: Array<Record<string, unknown>> }>;
      }>;
    };
    const rAttrs = parsed.resourceSpans[0]!.resource.attributes;
    const rKeys = rAttrs.map((a) => a.key).sort();
    assert.deepStrictEqual(rKeys, [
      'service.instance.id',
      'service.name',
      'telemetry.sdk.language',
      'telemetry.sdk.name',
    ]);
    const span = parsed.resourceSpans[0]!.scopeSpans[0]!.spans[0]!;
    assert.strictEqual(span.startTimeUnixNano, '2000');
    assert.strictEqual(span.endTimeUnixNano, '3000');
    assert.strictEqual(Array.isArray(span.attributes), true);
  });

  it('missing parentSpanId omitted from JSON span object', () => {
    const s: OTelSpan = {
      traceId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      spanId: 'bbbbbbbbbbbbbbbb',
      name: 'n',
      kind: SpanKind.INTERNAL,
      startTimeUnixNano: '1',
      endTimeUnixNano: '2',
      attributes: [],
      status: { code: SpanStatusCode.OK },
    };
    const j = exportSpansToOtlpJson([s], 'svc', 'nid');
    const span = JSON.parse(j).resourceSpans[0].scopeSpans[0].spans[0];
    assert.strictEqual(span.parentSpanId, undefined);
  });

  it('preserves parentSpanId when set', () => {
    const s: OTelSpan = {
      traceId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      spanId: 'bbbbbbbbbbbbbbbb',
      parentSpanId: 'cccccccccccccccc',
      name: 'n',
      kind: SpanKind.INTERNAL,
      startTimeUnixNano: '1',
      endTimeUnixNano: '2',
      attributes: [],
      status: { code: SpanStatusCode.OK },
    };
    const j = exportSpansToOtlpJson([s], 'svc', 'nid');
    const span = JSON.parse(j).resourceSpans[0].scopeSpans[0].spans[0];
    assert.strictEqual(span.parentSpanId, 'cccccccccccccccc');
    assert.match(span.parentSpanId, HEX16);
  });
});
