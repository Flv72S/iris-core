/**
 * Phase 11C — Cross-Tenant SLA Coordinator tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  runCrossTenantSlaCoordinator,
  aggregateTenantStates,
  detectMissingSlaNodes,
  detectSlaConflicts,
  calculateFederatedSlaHash,
  verifyFederatedSlaReport,
  type LocalNodeSLA,
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

describe('Cross-Tenant SLA Coordinator', () => {
  it('Aggregation test: deterministic conservative aggregation', () => {
    const inputs: LocalNodeSLA[] = [
      sla({ node_id: 'n2', tenant_id: 't1', service_name: 'svcA', uptime_target: 0.99, latency_target_ms: 250, throughput_target: 900 }),
      sla({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA', uptime_target: 0.995, latency_target_ms: 200, throughput_target: 1000 }),
      sla({ node_id: 'n3', tenant_id: 't1', service_name: 'svcA', uptime_target: 0.98, latency_target_ms: 300, throughput_target: 800 }),
    ];
    const states = aggregateTenantStates(inputs);
    assert.strictEqual(states.length, 1);
    assert.strictEqual(states[0].tenant_id, 't1');
    assert.strictEqual(states[0].services.length, 1);
    const svc = states[0].services[0];
    assert.deepStrictEqual(svc.participating_nodes, ['n1', 'n2', 'n3']);
    assert.strictEqual(svc.aggregated_uptime_target, 0.98); // min
    assert.strictEqual(svc.aggregated_latency_target_ms, 300); // max
    assert.strictEqual(svc.aggregated_throughput_target, 800); // min
  });

  it('Determinism test: same input twice → identical FederatedSLAReport hash', () => {
    const inputs: LocalNodeSLA[] = [
      sla({ node_id: 'n2', tenant_id: 't2', service_name: 'svcB', latency_target_ms: 100 }),
      sla({ node_id: 'n1', tenant_id: 't2', service_name: 'svcB', latency_target_ms: 120 }),
    ];
    const r1 = runCrossTenantSlaCoordinator(inputs);
    const r2 = runCrossTenantSlaCoordinator(inputs);
    assert.strictEqual(r1.report_hash, r2.report_hash);
  });

  it('Missing SLA detection test: node missing SLA for tenant service → NODE_MISSING_SLA gap', () => {
    const inputs: LocalNodeSLA[] = [
      sla({ node_id: 'n1', tenant_id: 't3', service_name: 'svcA' }),
      sla({ node_id: 'n2', tenant_id: 't3', service_name: 'svcA' }),
      sla({ node_id: 'n1', tenant_id: 't3', service_name: 'svcB' }), // n2 missing svcB
    ];
    const gaps = detectMissingSlaNodes(inputs);
    assert.ok(gaps.some((g) => g.tenant_id === 't3' && g.service_name === 'svcB' && g.gap_type === 'NODE_MISSING_SLA'));
  });

  it('SLA conflict test: incompatible latency targets → SLA_CONFLICT gap', () => {
    const inputs: LocalNodeSLA[] = [
      sla({ node_id: 'n1', tenant_id: 't4', service_name: 'svcA', latency_target_ms: 50 }),
      sla({ node_id: 'n2', tenant_id: 't4', service_name: 'svcA', latency_target_ms: 250 }),
    ];
    const gaps = detectSlaConflicts(inputs);
    assert.ok(gaps.some((g) => g.tenant_id === 't4' && g.service_name === 'svcA' && g.gap_type === 'SLA_CONFLICT'));
  });

  it('Federated report integrity test: calculateFederatedSlaHash matches report_hash', () => {
    const inputs: LocalNodeSLA[] = [
      sla({ node_id: 'n1', tenant_id: 't5', service_name: 'svcA' }),
      sla({ node_id: 'n2', tenant_id: 't5', service_name: 'svcA' }),
    ];
    const report = runCrossTenantSlaCoordinator(inputs);
    const expected = calculateFederatedSlaHash({
      timestamp: report.timestamp,
      tenant_states: report.tenant_states,
      detected_gaps: report.detected_gaps,
    });
    assert.strictEqual(expected, report.report_hash);
    assert.strictEqual(verifyFederatedSlaReport(report), true);
  });
});

