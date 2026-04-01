/**
 * Phase 11C.3 / 11C.3.1 — SLA Consensus Verification tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  verifySlaConsensusAlignment,
  buildSlaConsensusDiagnostics,
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

describe('SLA Consensus Verification', () => {
  it('Verification contains consensus hash', () => {
    const consensusResult = mockConsensusResult(['n1', 'n2'], 'abc123hash');
    const nodeSlas: LocalNodeSLA[] = [sla({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA' }), sla({ node_id: 'n2', tenant_id: 't1', service_name: 'svcA' })];
    const result = verifySlaConsensusAlignment(consensusResult, nodeSlas);
    assert.strictEqual(result.consensus_hash, consensusResult.consensus_proof.consensus_hash);
    assert.strictEqual(result.consensus_hash, 'abc123hash');
  });

  it('Perfect alignment: all consensus nodes provide SLA → verification_status OK', () => {
    const consensusResult = mockConsensusResult(['n1', 'n2'], 'h1');
    const nodeSlas: LocalNodeSLA[] = [sla({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA' }), sla({ node_id: 'n2', tenant_id: 't1', service_name: 'svcA' })];
    const result = verifySlaConsensusAlignment(consensusResult, nodeSlas);
    assert.strictEqual(result.verification_status, 'OK');
    assert.strictEqual(result.nodes_missing_sla.length, 0);
    assert.strictEqual(result.nodes_outside_consensus.length, 0);
    assert.strictEqual(result.mismatch_ratio, 0);
  });

  it('Missing SLA node: consensus has node without SLA → nodes_missing_sla populated; ratio 0.5 → ERROR', () => {
    const consensusResult = mockConsensusResult(['n1', 'n2'], 'h2');
    const nodeSlas: LocalNodeSLA[] = [sla({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA' })];
    const result = verifySlaConsensusAlignment(consensusResult, nodeSlas);
    assert.ok(result.nodes_missing_sla.includes('n2'));
    assert.strictEqual(result.mismatch_ratio, 0.5);
    assert.strictEqual(result.verification_status, 'ERROR');
  });

  it('Node outside consensus: SLA from non-consensus node → nodes_outside_consensus populated; ratio 1 → ERROR', () => {
    const consensusResult = mockConsensusResult(['n1'], 'h3');
    const nodeSlas: LocalNodeSLA[] = [sla({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA' }), sla({ node_id: 'n2', tenant_id: 't1', service_name: 'svcA' })];
    const result = verifySlaConsensusAlignment(consensusResult, nodeSlas);
    assert.ok(result.nodes_outside_consensus.includes('n2'));
    assert.strictEqual(result.mismatch_ratio, 1);
    assert.strictEqual(result.verification_status, 'ERROR');
  });

  it('WARNING when mismatch_ratio < 0.2: 6 consensus, 5 SLAs (1 missing) → ratio 1/6, WARNING', () => {
    const consensusResult = mockConsensusResult(['n1', 'n2', 'n3', 'n4', 'n5', 'n6'], 'h_warn');
    const nodeSlas: LocalNodeSLA[] = [
      sla({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA' }),
      sla({ node_id: 'n2', tenant_id: 't1', service_name: 'svcA' }),
      sla({ node_id: 'n3', tenant_id: 't1', service_name: 'svcA' }),
      sla({ node_id: 'n4', tenant_id: 't1', service_name: 'svcA' }),
      sla({ node_id: 'n5', tenant_id: 't1', service_name: 'svcA' }),
    ];
    const result = verifySlaConsensusAlignment(consensusResult, nodeSlas);
    assert.strictEqual(result.nodes_missing_sla.length, 1);
    assert.ok(result.mismatch_ratio < 0.2);
    assert.strictEqual(result.verification_status, 'WARNING');
  });

  it('Mismatch ratio correctness: 5 consensus, 1 SLA → mismatch_ratio 0.8, ERROR', () => {
    const consensusResult = mockConsensusResult(['n1', 'n2', 'n3', 'n4', 'n5'], 'h4');
    const nodeSlas: LocalNodeSLA[] = [sla({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA' })];
    const result = verifySlaConsensusAlignment(consensusResult, nodeSlas);
    assert.strictEqual(result.mismatch_ratio, 0.8);
    assert.strictEqual(result.verification_status, 'ERROR');
  });

  it('Zero consensus handling: participating_nodes = [] → ERROR, mismatch_ratio = 1', () => {
    const consensusResult = mockConsensusResult([], 'empty_hash');
    const nodeSlas: LocalNodeSLA[] = [sla({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA' })];
    const result = verifySlaConsensusAlignment(consensusResult, nodeSlas);
    assert.strictEqual(result.verification_status, 'ERROR');
    assert.strictEqual(result.mismatch_ratio, 1);
    assert.strictEqual(result.consensus_nodes.length, 0);
    assert.ok(result.nodes_outside_consensus.includes('n1'));
  });

  it('Determinism: identical consensus + SLA but shuffled order → identical result', () => {
    const consensusResult = mockConsensusResult(['n1', 'n2', 'n3'], 'h5');
    const nodeSlas1: LocalNodeSLA[] = [sla({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA' }), sla({ node_id: 'n2', tenant_id: 't1', service_name: 'svcA' }), sla({ node_id: 'n3', tenant_id: 't1', service_name: 'svcA' })];
    const nodeSlas2: LocalNodeSLA[] = [sla({ node_id: 'n3', tenant_id: 't1', service_name: 'svcA' }), sla({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA' }), sla({ node_id: 'n2', tenant_id: 't1', service_name: 'svcA' })];
    const result1 = verifySlaConsensusAlignment(consensusResult, nodeSlas1);
    const result2 = verifySlaConsensusAlignment(consensusResult, nodeSlas2);
    assert.strictEqual(JSON.stringify(result1), JSON.stringify(result2));
  });

  it('buildSlaConsensusDiagnostics', () => {
    const consensusResult = mockConsensusResult(['n1', 'n2'], 'h6');
    const nodeSlas: LocalNodeSLA[] = [sla({ node_id: 'n1', tenant_id: 't1', service_name: 'svcA' })];
    const check = verifySlaConsensusAlignment(consensusResult, nodeSlas);
    const diag = buildSlaConsensusDiagnostics(check);
    assert.strictEqual(diag.consensus_node_count, 2);
    assert.strictEqual(diag.sla_node_count, 1);
    assert.strictEqual(diag.mismatch_count, 1);
  });
});
