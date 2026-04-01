/**
 * Phase 11F — Predictive Governance Engine tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  runPredictiveGovernanceEngine,
  computeDriftSeverityScore,
  generateRiskForecast,
  type DriftSignalWithNode,
} from '../index.js';
import type { NodeTrustIndex } from '../../inter_org_trust/index.js';
import type { FederatedTrustCertificate } from '../../trust_certification/types/trust_certificate_types.js';
import type { SLADriftSignal } from '../../cross_tenant_sla/drift/sla_drift_types.js';
import {
  runInterOrgTrustEngine,
  evaluateCertificateEligibility,
  type InterOrgTrustEngineParams,
} from '../../inter_org_trust/index.js';
import { runTrustCertificationEngine } from '../../trust_certification/index.js';
import {
  createEmptyRegistry,
  registerTrustAnchor,
  registerFederatedNode,
  getNodeMetadataForConsensus,
  computeCertificateHash,
  type GovernanceCertificate,
  type TrustAnchor,
  type FederatedNodeRecordRegistrationInput,
} from '../../federated_node_registry/index.js';
import type { NodeTrustScore } from '../../cross_tenant_sla/trust/sla_trust_types.js';

function makeCertificate(overrides: Partial<GovernanceCertificate> & { issued_to_node: string; issuer: string }): GovernanceCertificate {
  const base = {
    certificate_id: 'cert-' + overrides.issued_to_node,
    issuer: overrides.issuer,
    issued_to_node: overrides.issued_to_node,
    public_key: 'pk-' + overrides.issued_to_node,
    signature: 'sig-' + overrides.issued_to_node,
    issued_at: overrides.issued_at ?? 1000,
    expires_at: overrides.expires_at ?? 100000,
    certificate_hash: '',
  };
  const full = { ...base, ...overrides };
  const hash = computeCertificateHash(full);
  return Object.freeze({ ...full, certificate_hash: overrides.certificate_hash ?? hash });
}

function makeTrustAnchor(id: string, organization: string): TrustAnchor {
  return Object.freeze({
    trust_anchor_id: id,
    organization,
    root_public_key: 'root-' + id,
    signature: 'sig-' + id,
    issued_at: 1000,
    trust_level: 1,
  });
}

function makeNodeRecord(
  node_id: string,
  cert: GovernanceCertificate,
  trust_anchor_id: string,
  overrides?: Partial<FederatedNodeRecordRegistrationInput>
): FederatedNodeRecordRegistrationInput {
  return Object.freeze({
    node_id,
    node_name: 'node-' + node_id,
    organization_id: 'org1',
    protocol_version: '1.0',
    governance_role: 'participant',
    trust_anchor_id,
    certificate: cert,
    node_status: 'active',
    registration_timestamp: 2000,
    last_update_timestamp: 2000,
    ...overrides,
  });
}

function trustScore(node_id: string, trust_score: number): NodeTrustScore {
  return Object.freeze({ node_id, trust_score, trust_source: 'test' });
}

function trustIndex(
  node_id: string,
  organization_id: string,
  trust_index: number,
  trust_level: NodeTrustIndex['trust_level']
): NodeTrustIndex {
  return Object.freeze({
    node_id,
    organization_id,
    declared_trust: trust_index,
    observed_trust: trust_index,
    verified_trust: trust_index,
    trust_index,
    trust_level,
  });
}

function cert(node_id: string, organization_id: string, level: 'GOLD' | 'SILVER' | 'BRONZE'): FederatedTrustCertificate {
  return Object.freeze({
    node_id,
    organization_id,
    trust_index: 0.9,
    trust_level: 'HIGH',
    certificate_level: level,
    certificate_timestamp: 1000,
    certificate_hash: 'hash-' + node_id,
  });
}

function drift(severity: 'HIGH' | 'MEDIUM' | 'LOW', node_id?: string): DriftSignalWithNode {
  const s: DriftSignalWithNode = Object.freeze({
    tenant_id: 't1',
    service_name: 'svc',
    metric: 'uptime',
    drift_direction: 'degrading',
    drift_severity: severity,
    description: severity,
  });
  return node_id !== undefined ? Object.freeze({ ...s, node_id }) : s;
}

describe('Predictive Governance Engine', () => {
  it('LOW risk node: trust_index 0.9, GOLD cert, no drift → risk_level LOW', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 0.9, 'HIGH')];
    const certs: FederatedTrustCertificate[] = [cert('n1', 'org1', 'GOLD')];
    const forecast = runPredictiveGovernanceEngine(indices, certs, [], 1000);
    assert.strictEqual(forecast.node_risk_forecasts.length, 1);
    assert.strictEqual(forecast.node_risk_forecasts[0].risk_level, 'LOW');
    assert.strictEqual(forecast.node_risk_forecasts[0].certificate_level, 'GOLD');
    assert.strictEqual(forecast.node_risk_forecasts[0].drift_severity_score, 0);
  });

  it('HIGH/CRITICAL risk node: trust_index 0.4, BRONZE cert, HIGH drift', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 0.4, 'LOW')];
    const certs: FederatedTrustCertificate[] = [cert('n1', 'org1', 'BRONZE')];
    const signals: DriftSignalWithNode[] = [drift('HIGH', 'n1')];
    const forecast = runPredictiveGovernanceEngine(indices, certs, signals, 2000);
    assert.strictEqual(forecast.node_risk_forecasts.length, 1);
    assert.ok(['HIGH', 'CRITICAL'].includes(forecast.node_risk_forecasts[0].risk_level));
  });

  it('Drift severity aggregation: multiple signals for node → max severity used', () => {
    const signals: DriftSignalWithNode[] = [
      drift('LOW', 'n1'),
      drift('MEDIUM', 'n1'),
      drift('HIGH', 'n1'),
    ];
    assert.strictEqual(computeDriftSeverityScore('n1', signals), 1.0);
    assert.strictEqual(computeDriftSeverityScore('n2', signals), 0);
  });

  it('Determinism: shuffled inputs produce identical forecast', () => {
    const indices: NodeTrustIndex[] = [
      trustIndex('n2', 'org1', 0.5, 'MEDIUM'),
      trustIndex('n1', 'org1', 0.9, 'HIGH'),
    ];
    const certs: FederatedTrustCertificate[] = [cert('n1', 'org1', 'GOLD'), cert('n2', 'org1', 'SILVER')];
    const signals: SLADriftSignal[] = [];
    const a = runPredictiveGovernanceEngine(indices, certs, signals, 3000);
    const b = runPredictiveGovernanceEngine([indices[1], indices[0]], [certs[1], certs[0]], signals, 3000);
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
  });

  it('Forecast hash integrity: same inputs produce same forecast_hash', () => {
    const indices: NodeTrustIndex[] = [trustIndex('n1', 'org1', 0.7, 'MEDIUM')];
    const forecast1 = generateRiskForecast(indices, [], [], 4000);
    const forecast2 = generateRiskForecast(indices, [], [], 4000);
    assert.strictEqual(forecast1.forecast_hash, forecast2.forecast_hash);
    assert.ok(forecast1.forecast_hash.length > 0);
  });

  it('Integration: full pipeline runInterOrgTrustEngine → evaluateCertificateEligibility → runTrustCertificationEngine → runPredictiveGovernanceEngine', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    registry = registerFederatedNode(registry, makeNodeRecord('n1', makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    registry = registerFederatedNode(registry, makeNodeRecord('n2', makeCertificate({ issued_to_node: 'n2', issuer: 'ta1' }), 'ta1'), 'a', 3000).registry;
    const meta = getNodeMetadataForConsensus(registry);
    const params: InterOrgTrustEngineParams = {
      nodeMetadata: meta,
      trustScores: [trustScore('n1', 0.9), trustScore('n2', 0.7)],
      nodeRecords: registry.nodes,
      trustAnchors: registry.trust_anchors,
      timestamp: 5000,
    };
    const report = runInterOrgTrustEngine(params);
    const eligibilityResults = evaluateCertificateEligibility(report.node_trust_indices, 5000);
    const certificates = runTrustCertificationEngine(report.node_trust_indices, eligibilityResults, 5000);
    const forecast = runPredictiveGovernanceEngine(report.node_trust_indices, certificates, [], 5000);
    assert.ok(forecast.node_risk_forecasts.length > 0);
    const nodeIds = forecast.node_risk_forecasts.map((f) => f.node_id);
    for (let i = 1; i < nodeIds.length; i++) {
      assert.ok(nodeIds[i] >= nodeIds[i - 1]);
    }
    assert.ok(forecast.forecast_hash.length > 0);
    assert.ok(typeof forecast.average_risk_score === 'number');
  });
});
