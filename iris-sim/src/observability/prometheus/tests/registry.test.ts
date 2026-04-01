/**
 * Phase 16E.X1.FIX — Strict registry mapping tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { METRIC_DEFINITIONS } from '../metric_definitions.js';
import { mapMetricsToPrometheus } from '../registry_adapter.js';

describe('Observability / Prometheus registry', () => {
  it('METRIC_DEFINITIONS has unique Prometheus names', () => {
    const names = Object.values(METRIC_DEFINITIONS).map((d) => d.name);
    assert.strictEqual(new Set(names).size, names.length);
  });

  it('mapMetricsToPrometheus exports only defined keys with labels and stable order', () => {
    const out = mapMetricsToPrometheus({
      generatedAt: new Date().toISOString(),
      nodeId: 'node-test-1',
      metrics: {
        messages_sent: 3,
        messages_received: 2,
        active_sessions: 1,
        node_uptime_seconds: 42.5,
      },
    });
    const names = out.map((m) => m.name);
    assert.deepStrictEqual(names, [...names].sort((a, b) => a.localeCompare(b)));

    assert.ok(out.every((m) => m.labels.node_id === 'node-test-1'));
    const byName = Object.fromEntries(out.map((m) => [m.name, m])) as Record<string, (typeof out)[0]>;
    assert.strictEqual(byName.iris_messages_sent_total?.type, 'counter');
    assert.strictEqual(byName.iris_messages_received_total?.type, 'counter');
    assert.strictEqual(byName.iris_active_sessions?.type, 'gauge');
    assert.strictEqual(byName.iris_node_uptime_seconds?.type, 'gauge');
    assert.strictEqual(byName.iris_messages_sent_total?.value, 3);
  });

  it('returns empty when nodeId missing or empty', () => {
    const snap = { generatedAt: 't', metrics: { messages_sent: 1 } };
    assert.deepStrictEqual(mapMetricsToPrometheus(snap as never), []);
    assert.deepStrictEqual(
      mapMetricsToPrometheus({
        metrics: { messages_sent: 1 },
        timestamp: 't',
        nodeId: '',
      }),
      [],
    );
  });

  it('skips unknown internal keys', () => {
    const out = mapMetricsToPrometheus({
      generatedAt: 't',
      nodeId: 'n',
      metrics: { messages_sent: 1, mystery_metric: 99 },
    });
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0]?.name, 'iris_messages_sent_total');
  });

  it('skips NaN and Infinity for defined keys', () => {
    const out = mapMetricsToPrometheus({
      generatedAt: 't',
      nodeId: 'n',
      metrics: {
        messages_sent: NaN,
        messages_received: 2,
      },
    });
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0]?.name, 'iris_messages_received_total');
  });

  it('empty metrics record yields empty array when nodeId present', () => {
    assert.deepStrictEqual(
      mapMetricsToPrometheus({ generatedAt: 't', nodeId: 'x', metrics: {} }),
      [],
    );
  });
});
