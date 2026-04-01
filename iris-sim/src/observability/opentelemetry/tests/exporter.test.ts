import { describe, it } from 'node:test';
import assert from 'node:assert';

import type { OTelSpan } from '../otel_types.js';
import { SpanKind, SpanStatusCode } from '../otel_types.js';
import { exportSpansToOtlpJson } from '../otlp_exporter.js';

function sampleSpan(overrides: Partial<OTelSpan> = {}): OTelSpan {
  return {
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    spanId: '00f067aa0ba902b7',
    name: 'n1',
    kind: SpanKind.INTERNAL,
    startTimeUnixNano: '1000',
    endTimeUnixNano: '2000',
    attributes: [
      { key: 'a', value: { stringValue: 'x' } },
      { key: 'iris.span_name', value: { stringValue: 'n1' } },
      { key: 'z', value: { intValue: 1 } },
    ],
    status: { code: SpanStatusCode.OK },
    ...overrides,
  };
}

describe('OpenTelemetry otlp_exporter', () => {
  it('produces valid JSON and deterministic output for same spans (sorted by start time)', () => {
    const later = sampleSpan({
      spanId: 'bbbbbbbbbbbbbbbb',
      name: 'b',
      startTimeUnixNano: '2000',
      endTimeUnixNano: '3000',
    });
    const earlier = sampleSpan({
      spanId: 'aaaaaaaaaaaaaaaa',
      name: 'a',
      startTimeUnixNano: '1000',
      endTimeUnixNano: '2000',
    });
    const j1 = exportSpansToOtlpJson([later, earlier], 'svc', 'inst-1');
    const j2 = exportSpansToOtlpJson([earlier, later], 'svc', 'inst-1');
    assert.strictEqual(j1, j2);
    const parsed = JSON.parse(j1) as { resourceSpans: Array<{ scopeSpans: Array<{ spans: Array<{ name: string; status: { code: number } }> }> }> };
    assert.strictEqual(parsed.resourceSpans.length, 1);
    const spans = parsed.resourceSpans[0]!.scopeSpans[0]!.spans;
    assert.strictEqual(spans.length, 2);
    assert.strictEqual(spans[0]!.name, 'a');
    assert.strictEqual(spans[1]!.name, 'b');
    assert.strictEqual(spans[0]!.status.code, SpanStatusCode.OK);
  });

  it('handles empty span list', () => {
    const j = exportSpansToOtlpJson([], 'iris-node', 'nid');
    const parsed = JSON.parse(j) as { resourceSpans: Array<{ scopeSpans: Array<{ spans: unknown[] }> }> };
    assert.strictEqual(parsed.resourceSpans[0]!.scopeSpans[0]!.spans.length, 0);
  });

  it('includes resource metadata (service.name, instance, sdk)', () => {
    const j = exportSpansToOtlpJson([sampleSpan()], 'my-service', 'node-xyz');
    const parsed = JSON.parse(j) as {
      resourceSpans: Array<{ resource: { attributes: Array<{ key: string; value: { stringValue?: string } }> } }>;
    };
    const attrs = parsed.resourceSpans[0]!.resource.attributes;
    const keys = attrs.map((a) => a.key).sort();
    assert.deepStrictEqual(keys, [
      'service.instance.id',
      'service.name',
      'telemetry.sdk.language',
      'telemetry.sdk.name',
    ]);
    const byKey = Object.fromEntries(attrs.map((a) => [a.key, a.value.stringValue]));
    assert.strictEqual(byKey['service.name'], 'my-service');
    assert.strictEqual(byKey['service.instance.id'], 'node-xyz');
    assert.strictEqual(byKey['telemetry.sdk.name'], 'iris');
    assert.strictEqual(byKey['telemetry.sdk.language'], 'nodejs');
  });

  it('exports doubleValue on attributes', () => {
    const s = sampleSpan({
      attributes: [{ key: 'pi', value: { doubleValue: 3.14 } }],
    });
    const j = exportSpansToOtlpJson([s], 'svc', 'nid');
    const span = JSON.parse(j).resourceSpans[0].scopeSpans[0].spans[0];
    const attr = span.attributes.find((x: { key: string }) => x.key === 'pi');
    assert.strictEqual(attr.value.doubleValue, 3.14);
  });

  it('exports status and sorted events', () => {
    const s = sampleSpan({
      status: { code: SpanStatusCode.ERROR, message: 'x' },
      events: [
        { name: 'span.end', timeUnixNano: '2000' },
        { name: 'span.start', timeUnixNano: '1000' },
      ],
    });
    const j = exportSpansToOtlpJson([s], 'svc', 'nid');
    const span = JSON.parse(j).resourceSpans[0].scopeSpans[0].spans[0];
    assert.strictEqual(span.status.code, SpanStatusCode.ERROR);
    assert.strictEqual(span.status.message, 'x');
    assert.deepStrictEqual(
      span.events.map((e: { name: string }) => e.name),
      ['span.start', 'span.end'],
    );
  });
});
