import { describe, it } from 'node:test';
import assert from 'node:assert';

import { MetricsRegistry } from '../metrics/metrics_registry.js';

describe('Observability / Metrics', () => {
  it('increment and gauge export to JSON', () => {
    const m = new MetricsRegistry();
    m.increment('messages_sent');
    m.increment('messages_received', 2);
    m.gauge('active_sessions', 3);
    m.gauge('node_uptime_seconds', 1.5);
    const snap = m.exportJson();
    assert.strictEqual(snap.metrics.messages_sent, 1);
    assert.strictEqual(snap.metrics.messages_received, 2);
    assert.strictEqual(snap.metrics.active_sessions, 3);
    assert.strictEqual(snap.metrics.node_uptime_seconds, 1.5);
    assert.ok(snap.generatedAt.length > 10);
  });

  it('reset clears user metrics but restores default counters', () => {
    const m = new MetricsRegistry();
    m.increment('messages_sent', 5);
    m.reset();
    assert.strictEqual(m.getCounter('messages_sent'), 0);
  });
});
