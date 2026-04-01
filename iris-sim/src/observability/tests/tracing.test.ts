import { describe, it } from 'node:test';
import assert from 'node:assert';

import { Tracer } from '../tracing/tracer.js';

describe('Observability / Tracing', () => {
  it('span lifecycle and duration', () => {
    const tr = new Tracer();
    const s = tr.startSpan('op', { k: 1 });
    assert.ok(s.id.length > 0);
    const t0 = s.startTime;
    tr.endSpan(s);
    const exported = tr.exportSpans();
    assert.strictEqual(exported.length, 1);
    assert.strictEqual(exported[0].name, 'op');
    assert.ok(exported[0].endTime != null);
    assert.ok((exported[0].endTime as number) >= t0);
    assert.ok(s.durationMs() != null && (s.durationMs() as number) >= 0);
  });
});
