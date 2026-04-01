/**
 * Phase 16E.X1.FIX — Label rendering and validation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { escapeLabelValue, renderLabels } from '../exporter.js';
import { mapMetricsToPrometheus, isValidLabelSet } from '../registry_adapter.js';

describe('Observability / Prometheus labels', () => {
  it('renderLabels sorts keys alphabetically', () => {
    assert.strictEqual(
      renderLabels({ z: '1', a: '2', m: '3' }),
      '{a="2",m="3",z="1"}',
    );
  });

  it('escapeLabelValue escapes backslash and quotes', () => {
    assert.strictEqual(escapeLabelValue('a\\b"c'), 'a\\\\b\\"c');
  });

  it('every exported metric includes node_id label', () => {
    const out = mapMetricsToPrometheus({
      generatedAt: 't',
      nodeId: 'my-node',
      metrics: { messages_sent: 1, active_sessions: 0 },
    });
    assert.ok(out.length > 0);
    assert.ok(out.every((m) => typeof m.labels.node_id === 'string' && m.labels.node_id === 'my-node'));
  });

  it('isValidLabelSet rejects empty values', () => {
    assert.strictEqual(isValidLabelSet({ node_id: '' }), false);
    assert.strictEqual(isValidLabelSet({ node_id: 'ok' }), true);
  });
});
