import { describe, it } from 'node:test';
import assert from 'node:assert';

import { Span } from '../../tracing/span.js';
import { DEFAULT_OTEL_EVENTS_CONFIG } from '../otel_types.js';
import { mapIrisSpanToOtel } from '../span_mapper.js';
import { resolveOtelConfig } from '../otel_config.js';

describe('OTel events config (16E.X2.FINAL.PATCH)', () => {
  it('defaults: events present, lifecycle + exception on error', () => {
    const span = new Span('x', { traceId: 't-def', metadata: { error: true, message: 'bad' } });
    span.end();
    const ot = mapIrisSpanToOtel(span, { events: {} });
    assert.ok(ot?.events);
    assert.strictEqual(ot!.events!.some((e) => e.name === 'span.start'), true);
    assert.strictEqual(ot!.events!.some((e) => e.name === 'span.end'), true);
    assert.strictEqual(ot!.events!.some((e) => e.name === 'exception'), true);
  });

  it('events: { enabled: false } → no events field', () => {
    const span = new Span('x', { traceId: 't-off' });
    span.end();
    const ot = mapIrisSpanToOtel(span, { events: { enabled: false } });
    assert.ok(ot);
    assert.strictEqual(ot!.events, undefined);
  });

  it('lifecycle only: start/end, no exception even on error', () => {
    const span = new Span('e', { traceId: 't-lc', metadata: { error: true, message: 'x' } });
    span.end();
    const ot = mapIrisSpanToOtel(span, { events: { includeLifecycle: true, includeExceptions: false } });
    assert.ok(ot?.events);
    assert.strictEqual(ot!.events!.map((e) => e.name).sort().join(','), 'span.end,span.start');
    assert.strictEqual(ot!.events!.some((e) => e.name === 'exception'), false);
  });

  it('exceptions only: exception event when error; no lifecycle', () => {
    const span = new Span('e', { traceId: 't-ex', metadata: { error: true, message: 'boom' } });
    span.end();
    const ot = mapIrisSpanToOtel(span, { events: { includeLifecycle: false, includeExceptions: true } });
    assert.ok(ot?.events);
    assert.deepStrictEqual(
      ot!.events!.map((e) => e.name),
      ['exception'],
    );
  });

  it('exceptions only + OK span → no events', () => {
    const span = new Span('ok', { traceId: 't-ok2' });
    span.end();
    const ot = mapIrisSpanToOtel(span, { events: { includeLifecycle: false, includeExceptions: true } });
    assert.strictEqual(ot!.events, undefined);
  });

  it('disabled lifecycle + no error → no events', () => {
    const span = new Span('ok', { traceId: 't-empty' });
    span.end();
    const ot = mapIrisSpanToOtel(span, { events: { includeLifecycle: false, includeExceptions: false } });
    assert.strictEqual(ot!.events, undefined);
  });

  it('events sorted deterministically by time then name', () => {
    const span = new Span('e', { traceId: 't-sort', metadata: { error: true, message: 'm' } });
    span.end();
    const ot = mapIrisSpanToOtel(span);
    const times = ot!.events!.map((e) => e.timeUnixNano);
    const sorted = [...times].sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0));
    assert.deepStrictEqual(times, sorted);
  });

  it('resolveOtelConfig merges events with defaults', () => {
    const r = resolveOtelConfig({ enabled: true, events: { includeLifecycle: false } });
    assert.deepStrictEqual(r.events, {
      ...DEFAULT_OTEL_EVENTS_CONFIG,
      includeLifecycle: false,
    });
  });

  it('missing events in config uses full defaults', () => {
    const r = resolveOtelConfig({ enabled: true });
    assert.deepStrictEqual(r.events, DEFAULT_OTEL_EVENTS_CONFIG);
  });
});
