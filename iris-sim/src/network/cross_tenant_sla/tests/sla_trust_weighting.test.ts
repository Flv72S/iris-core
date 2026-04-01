/**
 * Phase 11C.2 — SLA Trust Weighting tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  runCrossTenantSlaCoordinator,
  normalizeTrustScores,
  buildNodeTrustMap,
  weightsForNodes,
  computeWeightedTenantSla,
  calculateFederatedSlaHash,
  verifyFederatedSlaReport,
  type LocalNodeSLA,
  type NodeTrustScore,
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

function trust(node_id: string, trust_score: number, trust_source = 'test'): NodeTrustScore {
  return Object.freeze({ node_id, trust_score, trust_source });
}

describe('SLA Trust Weighting', () => {
  it('Trust normalization: input scores sum > 1 → normalized weights sum to 1', () => {
    const scores: NodeTrustScore[] = [
      trust('n1', 0.5),
      trust('n2', 0.8),
      trust('n3', 0.7),
    ];
    const normalized = normalizeTrustScores(scores);
    const map = buildNodeTrustMap(normalized);
    const weights = weightsForNodes(['n1', 'n2', 'n3'], map);
    const sum = [...weights.values()].reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-10);
  });

  it('Weighted aggregation: multiple nodes with different trust → weighted metrics correct', () => {
    const nodeSlas: LocalNodeSLA[] = [
      sla({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA', uptime_target: 0.99, latency_target_ms: 100, throughput_target: 500 }),
      sla({ node_id: 'n2', tenant_id: 't1', service_name: 'svcA', uptime_target: 0.95, latency_target_ms: 200, throughput_target: 1000 }),
    ];
    const trustScores: NodeTrustScore[] = [trust('n1', 0.8), trust('n2', 0.2)];
    const weighted = computeWeightedTenantSla(nodeSlas, trustScores);
    assert.strictEqual(weighted.length, 1);
    const w = weighted[0]!;
    assert.strictEqual(w.tenant_id, 't1');
    assert.strictEqual(w.service_name, 'svcA');
    // 0.8 and 0.2 normalize to same (sum=1): weights 0.8, 0.2
    assert.ok(Math.abs(w.weighted_uptime_target - (0.99 * 0.8 + 0.95 * 0.2)) < 1e-6);
    assert.ok(Math.abs(w.weighted_latency_target_ms - (100 * 0.8 + 200 * 0.2)) < 1e-6);
  });

  it('Determinism: same SLA + trust input → identical weighted results', () => {
    const nodeSlas: LocalNodeSLA[] = [
      sla({ node_id: 'n1', tenant_id: 't2', service_name: 'svcB' }),
      sla({ node_id: 'n2', tenant_id: 't2', service_name: 'svcB' }),
    ];
    const trustScores: NodeTrustScore[] = [trust('n1', 0.6), trust('n2', 0.4)];
    const a = computeWeightedTenantSla(nodeSlas, trustScores);
    const b = computeWeightedTenantSla(nodeSlas, trustScores);
    assert.strictEqual(a.length, b.length);
    for (let i = 0; i < a.length; i++) {
      assert.strictEqual(a[i]!.tenant_id, b[i]!.tenant_id);
      assert.strictEqual(a[i]!.service_name, b[i]!.service_name);
      assert.strictEqual(a[i]!.weighted_uptime_target, b[i]!.weighted_uptime_target);
      assert.strictEqual(a[i]!.weighted_latency_target_ms, b[i]!.weighted_latency_target_ms);
      assert.strictEqual(a[i]!.weighted_throughput_target, b[i]!.weighted_throughput_target);
    }
  });

  it('Coordinator integration: run with trust scores → report.weighted_service_slas exists, hash includes weighted', () => {
    const nodeSlas: LocalNodeSLA[] = [
      sla({ node_id: 'n1', tenant_id: 't3', service_name: 'svcA' }),
      sla({ node_id: 'n2', tenant_id: 't3', service_name: 'svcA' }),
    ];
    const trustScores: NodeTrustScore[] = [trust('n1', 0.7), trust('n2', 0.3)];
    const report = runCrossTenantSlaCoordinator(nodeSlas, undefined, trustScores);
    assert.ok(report.weighted_service_slas !== undefined);
    assert.ok(Array.isArray(report.weighted_service_slas));
    assert.ok(report.weighted_service_slas.length >= 1);
    assert.strictEqual(verifyFederatedSlaReport(report), true);
    const hashPayload: Parameters<typeof calculateFederatedSlaHash>[0] = {
      timestamp: report.timestamp,
      tenant_states: report.tenant_states,
      detected_gaps: report.detected_gaps,
    };
    if (report.weighted_service_slas !== undefined) hashPayload.weighted_service_slas = report.weighted_service_slas;
    const expectedHash = calculateFederatedSlaHash(hashPayload);
    assert.strictEqual(expectedHash, report.report_hash);
  });
});
