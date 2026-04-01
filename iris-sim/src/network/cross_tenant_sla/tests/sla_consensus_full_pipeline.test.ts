/**
 * Phase 11C.3.1 — SLA Consensus full pipeline integration test.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  runCrossTenantSlaCoordinator,
  calculateFederatedSlaHash,
  verifyFederatedSlaReport,
  type LocalNodeSLA,
} from '../index.js';

function sla(overrides: Partial<LocalNodeSLA> & { node_id: string; tenant_id: string; service_name: string }): LocalNodeSLA {
  return Object.freeze({
    node_id: overrides.node_id,
    tenant_id: overrides.tenant_id ?? 't1',
    service_name: overrides.service_name ?? 'svcA',
    uptime_target: overrides.uptime_target ?? 0.999,
    latency_target_ms: overrides.latency_target_ms ?? 200,
    throughput_target: overrides.throughput_target ?? 1000,
    reporting_window_seconds: overrides.reporting_window_seconds ?? 60,
    timestamp: overrides.timestamp ?? 1000,
  });
}

function mockConsensusResult(participating_nodes: string[], consensus_hash: string): import('../../node_consensus/types/consensus_engine_types.js').ConsensusResult {
  return Object.freeze({
    merged_snapshot: null,
    consensus_proof: Object.freeze({
      consensus_hash,
      timestamp: 1000,
      participating_nodes: [...participating_nodes].sort(),
      quorum_reached: true,
      conflict_report: Object.freeze({ conflicts: [], missing_nodes: [], out_of_tolerance_nodes: [], version: '1.0' }),
      version: '1.0',
    }),
    status: 'OK',
    diagnostics: Object.freeze({
      aggregated_count: participating_nodes.length,
      conflict_count: 0,
      resolution_count: 0,
      quorum_met: true,
      chosen_node_id: participating_nodes[0] ?? '',
      version: '1.0',
    }),
    version: '1.0',
  });
}

describe('SLA Consensus Full Pipeline', () => {
  it('Run coordinator with consensusResult → report.sla_consensus_check defined, hash includes verification', () => {
    const nodeSlas: LocalNodeSLA[] = [
      sla({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA' }),
      sla({ node_id: 'n2', tenant_id: 't1', service_name: 'svcA' }),
    ];
    const consensusResult = mockConsensusResult(['n1', 'n2'], 'fed_consensus_hash_xyz');

    const report = runCrossTenantSlaCoordinator(nodeSlas, undefined, undefined, consensusResult);

    assert.ok(report.sla_consensus_check !== undefined);
    assert.strictEqual(report.sla_consensus_check!.consensus_hash, 'fed_consensus_hash_xyz');
    assert.strictEqual(report.sla_consensus_check!.consensus_hash, consensusResult.consensus_proof.consensus_hash);
    assert.ok(typeof report.sla_consensus_check!.mismatch_ratio === 'number');

    assert.strictEqual(verifyFederatedSlaReport(report), true);

    const hashPayload: Parameters<typeof calculateFederatedSlaHash>[0] = {
      timestamp: report.timestamp,
      tenant_states: report.tenant_states,
      detected_gaps: report.detected_gaps,
    };
    if (report.sla_consensus_check !== undefined) hashPayload.sla_consensus_check = report.sla_consensus_check;
    const recomputedHash = calculateFederatedSlaHash(hashPayload);
    assert.strictEqual(recomputedHash, report.report_hash);
  });
});
