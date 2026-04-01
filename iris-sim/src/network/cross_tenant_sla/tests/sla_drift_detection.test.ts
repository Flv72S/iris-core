/**
 * Phase 11C.1 — SLA Drift Detection tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  runCrossTenantSlaCoordinator,
  buildServiceMetricHistory,
  calculateMetricSlope,
  detectMetricDrift,
  classifyDriftSeverity,
  calculateFederatedSlaHash,
  verifyFederatedSlaReport,
  type LocalNodeSLA,
  type SLAMetricSnapshot,
} from '../index.js';

function sla(overrides: Partial<LocalNodeSLA> & { node_id: string; tenant_id: string; service_name: string }): LocalNodeSLA {
  return Object.freeze({
    node_id: overrides.node_id,
    tenant_id: overrides.tenant_id,
    service_name: overrides.service_name,
    uptime_target: overrides.uptime_target ?? 0.999,
    latency_target_ms: overrides.latency_target_ms ?? 200,
    throughput_target: overrides.throughput_target ?? 1000,
    reporting_window_seconds: overrides.reporting_window_seconds ?? 60,
    timestamp: overrides.timestamp ?? 1000,
  });
}

function snapshot(overrides: Partial<SLAMetricSnapshot> & { node_id: string; tenant_id: string; service_name: string; timestamp: number }): SLAMetricSnapshot {
  return Object.freeze({
    node_id: overrides.node_id,
    tenant_id: overrides.tenant_id,
    service_name: overrides.service_name,
    observed_uptime: overrides.observed_uptime ?? 0.99,
    observed_latency_ms: overrides.observed_latency_ms ?? 100,
    observed_throughput: overrides.observed_throughput ?? 500,
    timestamp: overrides.timestamp,
  });
}

describe('SLA Drift Detection', () => {
  it('Drift detection: worsening latency → drift_direction = degrading', () => {
    const snapshots: SLAMetricSnapshot[] = [
      snapshot({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA', observed_latency_ms: 50, timestamp: 1000 }),
      snapshot({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA', observed_latency_ms: 150, timestamp: 2000 }),
    ];
    const signals = detectMetricDrift(snapshots);
    const latencySignal = signals.find((s) => s.metric === 'latency' && s.tenant_id === 't1' && s.service_name === 'svcA');
    assert.ok(latencySignal !== undefined);
    assert.strictEqual(latencySignal.drift_direction, 'degrading');
  });

  it('Drift severity classification: LOW / MEDIUM / HIGH', () => {
    assert.strictEqual(classifyDriftSeverity(0.0005), 'LOW');
    assert.strictEqual(classifyDriftSeverity(0.005), 'MEDIUM');
    assert.strictEqual(classifyDriftSeverity(0.05), 'HIGH');
    assert.strictEqual(classifyDriftSeverity(-0.0005), 'LOW');
    assert.strictEqual(classifyDriftSeverity(-0.02), 'HIGH');
  });

  it('Determinism: same snapshot input → identical drift signals', () => {
    const snapshots: SLAMetricSnapshot[] = [
      snapshot({ node_id: 'n1', tenant_id: 't2', service_name: 'svcB', observed_uptime: 0.99, timestamp: 100 }),
      snapshot({ node_id: 'n1', tenant_id: 't2', service_name: 'svcB', observed_uptime: 0.97, timestamp: 200 }),
    ];
    const a = detectMetricDrift(snapshots);
    const b = detectMetricDrift(snapshots);
    assert.strictEqual(a.length, b.length);
    for (let i = 0; i < a.length; i++) {
      assert.strictEqual(a[i].tenant_id, b[i].tenant_id);
      assert.strictEqual(a[i].service_name, b[i].service_name);
      assert.strictEqual(a[i].metric, b[i].metric);
      assert.strictEqual(a[i].drift_direction, b[i].drift_direction);
      assert.strictEqual(a[i].drift_severity, b[i].drift_severity);
    }
  });

  it('Report integration: coordinator with metricSnapshots → drift_signals present, hash includes drift', () => {
    const nodeSlas: LocalNodeSLA[] = [
      sla({ node_id: 'n1', tenant_id: 't3', service_name: 'svcA' }),
      sla({ node_id: 'n2', tenant_id: 't3', service_name: 'svcA' }),
    ];
    const metricSnapshots: SLAMetricSnapshot[] = [
      snapshot({ node_id: 'n1', tenant_id: 't3', service_name: 'svcA', observed_latency_ms: 80, timestamp: 1000 }),
      snapshot({ node_id: 'n1', tenant_id: 't3', service_name: 'svcA', observed_latency_ms: 120, timestamp: 2000 }),
    ];
    const report = runCrossTenantSlaCoordinator(nodeSlas, metricSnapshots);
    assert.ok(report.drift_signals !== undefined);
    assert.ok(Array.isArray(report.drift_signals));
    assert.ok(report.drift_signals.length >= 1);
    assert.strictEqual(verifyFederatedSlaReport(report), true);
    const expectedHash = calculateFederatedSlaHash({
      timestamp: report.timestamp,
      tenant_states: report.tenant_states,
      detected_gaps: report.detected_gaps,
      drift_signals: report.drift_signals,
    });
    assert.strictEqual(expectedHash, report.report_hash);
  });

  it('buildServiceMetricHistory and calculateMetricSlope', () => {
    const snapshots: SLAMetricSnapshot[] = [
      snapshot({ node_id: 'n1', tenant_id: 't4', service_name: 'svcX', observed_throughput: 100, timestamp: 0 }),
      snapshot({ node_id: 'n1', tenant_id: 't4', service_name: 'svcX', observed_throughput: 80, timestamp: 100 }),
    ];
    const history = buildServiceMetricHistory(snapshots);
    const key = 't4\0svcX';
    assert.ok(history.has(key));
    const list = history.get(key)!;
    assert.strictEqual(list.length, 2);
    const slope = calculateMetricSlope(
      list.map((s) => s.observed_throughput),
      list.map((s) => s.timestamp)
    );
    assert.ok(slope < 0);
  });
});
