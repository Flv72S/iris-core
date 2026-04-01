/**
 * Phase 16E.X1 / 16E.X1.FIX — Prometheus text exporter tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { renderPrometheusMetrics } from '../exporter.js';
import type { PromMetric } from '../registry_adapter.js';

const L = { node_id: 'n1' };

describe('Observability / Prometheus exporter', () => {
  it('renders HELP, TYPE, and labeled sample lines', () => {
    const metrics: PromMetric[] = [
      {
        name: 'iris_errors_total',
        type: 'counter',
        help: 'Total errors',
        value: 5,
        labels: L,
      },
    ];
    const text = renderPrometheusMetrics(metrics);
    assert.ok(text.includes('# HELP iris_errors_total'));
    assert.ok(text.includes('# TYPE iris_errors_total counter'));
    assert.ok(text.includes('iris_errors_total{node_id="n1"} 5'));
    assert.ok(text.endsWith('\n'));
  });

  it('deterministic ordering by name', () => {
    const a: PromMetric = {
      name: 'iris_zebra',
      type: 'gauge',
      help: 'z',
      value: 1,
      labels: L,
    };
    const b: PromMetric = {
      name: 'iris_alpha',
      type: 'counter',
      help: 'a',
      value: 2,
      labels: L,
    };
    const t1 = renderPrometheusMetrics([a, b]);
    const t2 = renderPrometheusMetrics([b, a]);
    assert.strictEqual(t1, t2);
    const idxAlpha = t1.indexOf('iris_alpha');
    const idxZebra = t1.indexOf('iris_zebra');
    assert.ok(idxAlpha < idxZebra);
  });

  it('skips non-finite values', () => {
    const text = renderPrometheusMetrics([
      { name: 'iris_x', type: 'gauge', help: 'h', value: NaN, labels: L },
      { name: 'iris_y', type: 'gauge', help: 'h', value: 1, labels: L },
    ]);
    assert.ok(!text.includes('iris_x'));
    assert.ok(text.includes('iris_y'));
  });

  it('empty input yields empty string', () => {
    assert.strictEqual(renderPrometheusMetrics([]), '');
  });

  it('escapes backslash and newline in HELP', () => {
    const text = renderPrometheusMetrics([
      { name: 'iris_t', type: 'gauge', help: 'line\\break\nnext', value: 0, labels: L },
    ]);
    assert.ok(text.includes('\\\\'));
    assert.ok(text.includes('\\n'));
  });
});
