/**
 * Phase 11 — Global Architecture Verification Test Suite.
 * End-to-end integration tests for the full governance pipeline.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createEmptyRegistry,
  registerTrustAnchor,
  registerFederatedNode,
  getNodeMetadataForConsensus,
  computeCertificateHash,
  type GovernanceCertificate,
  type TrustAnchor,
  type FederatedNodeRecordRegistrationInput,
} from '../network/federated_node_registry/index.js';
import {
  runInterOrgTrustEngine,
  evaluateCertificateEligibility,
  type InterOrgTrustEngineParams,
} from '../network/inter_org_trust/index.js';
import type { NodeTrustIndex } from '../network/inter_org_trust/types/trust_types.js';
import type { NodeTrustScore } from '../network/cross_tenant_sla/trust/sla_trust_types.js';
import { runTrustCertificationEngine } from '../network/trust_certification/index.js';
import type { FederatedTrustCertificate } from '../network/trust_certification/types/trust_certificate_types.js';
import {
  runPredictiveGovernanceAnalysis,
  type TrustEvolutionPoint,
  type PredictiveGovernanceSignal,
} from '../network/predictive_governance/index.js';
import {
  runGlobalGovernanceAudit,
  type TrustCertificateForAudit,
} from '../network/governance_audit/index.js';
import type { GlobalAuditReport } from '../network/governance_audit/audit_types.js';
import {
  runFederationConsensusOrchestration,
  GOVERNANCE_EXECUTION_ORDER,
  type FederationConsensusSnapshot,
} from '../network/federation_orchestration/index.js';

const VALID_TRUST_LEVELS = ['HIGH', 'MEDIUM', 'LOW', 'UNTRUSTED'] as const;
const VALID_STABILITY = ['STABLE', 'VOLATILE', 'DECLINING', 'CRITICAL'] as const;
const VALID_RISK_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'SYSTEMIC'] as const;

// --- Deterministic mock data: 5 nodes across 2 organizations (sorted by node_id) ---
const FEDERATION_NODES = [
  { node_id: 'A1', organization_id: 'orgA', declared_trust: 0.85 },
  { node_id: 'A2', organization_id: 'orgA', declared_trust: 0.65 },
  { node_id: 'A3', organization_id: 'orgA', declared_trust: 0.45 },
  { node_id: 'B1', organization_id: 'orgB', declared_trust: 0.9 },
  { node_id: 'B2', organization_id: 'orgB', declared_trust: 0.3 },
];

function makeCertificate(
  overrides: Partial<GovernanceCertificate> & { issued_to_node: string; issuer: string }
): GovernanceCertificate {
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
  organization_id: string,
  cert: GovernanceCertificate,
  trust_anchor_id: string
): FederatedNodeRecordRegistrationInput {
  return Object.freeze({
    node_id,
    node_name: 'node-' + node_id,
    organization_id,
    protocol_version: '1.0',
    governance_role: 'participant',
    trust_anchor_id,
    certificate: cert,
    node_status: 'active',
    registration_timestamp: 2000,
    last_update_timestamp: 2000,
  });
}

function trustScore(node_id: string, trust_score: number): NodeTrustScore {
  return Object.freeze({ node_id, trust_score, trust_source: 'test' });
}

/** Build registry and trust params for the 5-node federation. Deterministic order by node_id. */
function buildPhase11Federation(timestamp: number): {
  params: InterOrgTrustEngineParams;
  trustScores: NodeTrustScore[];
} {
  let registry = createEmptyRegistry();
  registry = registerTrustAnchor(registry, makeTrustAnchor('taA', 'orgA'));
  registry = registerTrustAnchor(registry, makeTrustAnchor('taB', 'orgB'));
  const sorted = [...FEDERATION_NODES].sort((a, b) => a.node_id.localeCompare(b.node_id));
  for (const n of sorted) {
    const ta = n.organization_id === 'orgA' ? 'taA' : 'taB';
    registry = registerFederatedNode(
      registry,
      makeNodeRecord(n.node_id, n.organization_id, makeCertificate({ issued_to_node: n.node_id, issuer: ta }), ta),
      'commit-' + n.node_id,
      timestamp
    ).registry;
  }
  const nodeMetadata = getNodeMetadataForConsensus(registry);
  const trustScores: NodeTrustScore[] = sorted.map((n) => trustScore(n.node_id, n.declared_trust));
  const params: InterOrgTrustEngineParams = {
    nodeMetadata,
    trustScores,
    timestamp,
  };
  return { params, trustScores };
}

/** Build trust evolution history: 3 timestamps per node. Deterministic. */
function buildTrustEvolutionHistory(timestamp: number): Map<string, readonly TrustEvolutionPoint[]> {
  const map = new Map<string, TrustEvolutionPoint[]>();
  const sorted = [...FEDERATION_NODES].sort((a, b) => a.node_id.localeCompare(b.node_id));
  for (const n of sorted) {
    const t0 = timestamp - 200;
    const t1 = timestamp - 100;
    const t2 = timestamp;
    const idx = n.declared_trust;
    const level = idx >= 0.8 ? 'HIGH' : idx >= 0.6 ? 'MEDIUM' : idx >= 0.3 ? 'LOW' : 'UNTRUSTED';
    map.set(n.node_id, [
      Object.freeze({ node_id: n.node_id, organization_id: n.organization_id, trust_index: idx, trust_level: level, timestamp: t0 }),
      Object.freeze({ node_id: n.node_id, organization_id: n.organization_id, trust_index: idx + 0.02, trust_level: level, timestamp: t1 }),
      Object.freeze({ node_id: n.node_id, organization_id: n.organization_id, trust_index: idx, trust_level: level, timestamp: t2 }),
    ]);
  }
  return map as Map<string, readonly TrustEvolutionPoint[]>;
}

/** Run full Phase 11 pipeline. Returns trust report, indices, eligibility, certs, predictive result, audit report, orchestration result. */
function runFullPhase11Pipeline(
  trustParams: InterOrgTrustEngineParams,
  evolutionHistory: Map<string, readonly TrustEvolutionPoint[]>,
  timestamp: number
): {
  report: ReturnType<typeof runInterOrgTrustEngine>;
  trust_indices: readonly NodeTrustIndex[];
  eligibility: ReturnType<typeof evaluateCertificateEligibility>;
  certificates: readonly FederatedTrustCertificate[];
  predictiveSignals: PredictiveGovernanceSignal[];
  auditReport: GlobalAuditReport;
  orchestration: { snapshot: FederationConsensusSnapshot; notifications: readonly unknown[] };
} {
  const report = runInterOrgTrustEngine(trustParams);
  const trust_indices = report.node_trust_indices;
  const eligibility = evaluateCertificateEligibility(trust_indices, timestamp);
  const certificates = runTrustCertificationEngine(trust_indices, eligibility, timestamp);
  const predictive = runPredictiveGovernanceAnalysis(evolutionHistory, timestamp);
  const auditReport = runGlobalGovernanceAudit(
    trust_indices,
    certificates as TrustCertificateForAudit[],
    [report.trust_proof],
    report,
    timestamp
  );
  const orchestration = runFederationConsensusOrchestration(
    trust_indices,
    certificates,
    predictive.signals,
    auditReport,
    timestamp
  );
  return {
    report,
    trust_indices,
    eligibility,
    certificates,
    predictiveSignals: predictive.signals,
    auditReport,
    orchestration,
  };
}

describe('Phase 11 — Global Architecture Integration', () => {
  const TIMESTAMP = 10_000;

  it('TEST 1 — Trust Engine Pipeline: correct count, ordering, valid trust levels', () => {
    const { params } = buildPhase11Federation(TIMESTAMP);
    const report = runInterOrgTrustEngine(params);
    const trust_indices = report.node_trust_indices;

    assert.strictEqual(trust_indices.length, 5, 'trust_indices.length === 5');

    const nodeIds = trust_indices.map((t) => t.node_id);
    const sortedIds = [...nodeIds].sort((a, b) => a.localeCompare(b));
    assert.deepStrictEqual(nodeIds, sortedIds, 'ordering by node_id');

    for (const t of trust_indices) {
      assert.ok(VALID_TRUST_LEVELS.includes(t.trust_level), `trust_level in {HIGH,MEDIUM,LOW,UNTRUSTED}: ${t.node_id}`);
    }
  });

  it('TEST 2 — Certificate Eligibility: result per node, HIGH→ELIGIBLE, MEDIUM/LOW→PROBATION, UNTRUSTED→INELIGIBLE', () => {
    const { params } = buildPhase11Federation(TIMESTAMP);
    const report = runInterOrgTrustEngine(params);
    const eligibility = evaluateCertificateEligibility(report.node_trust_indices, TIMESTAMP);

    assert.strictEqual(eligibility.length, 5, 'eligibility result for each node');

    const sorted = [...eligibility].sort((a, b) => a.node_id.localeCompare(b.node_id));
    assert.deepStrictEqual(
      eligibility.map((e) => e.node_id),
      sorted.map((e) => e.node_id),
      'deterministic ordering by node_id'
    );

    for (const e of eligibility) {
      if (e.trust_level === 'HIGH') assert.strictEqual(e.eligibility_status, 'ELIGIBLE');
      else if (e.trust_level === 'MEDIUM' || e.trust_level === 'LOW') assert.strictEqual(e.eligibility_status, 'PROBATION');
      else if (e.trust_level === 'UNTRUSTED') assert.strictEqual(e.eligibility_status, 'INELIGIBLE');
    }
  });

  it('TEST 3 — Certification System: cert count matches eligible nodes, hash exists', () => {
    const { params } = buildPhase11Federation(TIMESTAMP);
    const report = runInterOrgTrustEngine(params);
    const eligibility = evaluateCertificateEligibility(report.node_trust_indices, TIMESTAMP);
    const eligibleCount = eligibility.filter((e) => e.eligibility_status !== 'INELIGIBLE').length;
    const certificates = runTrustCertificationEngine(report.node_trust_indices, eligibility, TIMESTAMP);

    assert.strictEqual(certificates.length, eligibleCount, 'number of certificates matches eligible nodes');

    const sorted = [...certificates].sort((a, b) => a.node_id.localeCompare(b.node_id));
    assert.deepStrictEqual(
      certificates.map((c) => c.node_id),
      sorted.map((c) => c.node_id),
      'deterministic ordering'
    );

    for (const c of certificates) {
      assert.ok(c.certificate_hash != null && c.certificate_hash.length > 0, `certificate_hash exists: ${c.node_id}`);
    }
  });

  it('TEST 4 — Predictive Governance Analysis: signal per node, valid stability_status and risk_level', () => {
    const history = buildTrustEvolutionHistory(TIMESTAMP);
    const { signals } = runPredictiveGovernanceAnalysis(history, TIMESTAMP);

    assert.strictEqual(signals.length, 5, 'predictive signal for each node');

    const sorted = [...signals].sort((a, b) => a.node_id.localeCompare(b.node_id));
    assert.deepStrictEqual(
      signals.map((s) => s.node_id),
      sorted.map((s) => s.node_id),
      'signals sorted by node_id'
    );

    for (const s of signals) {
      assert.ok(VALID_STABILITY.includes(s.stability_status), `stability_status valid: ${s.node_id}`);
      assert.ok(VALID_RISK_LEVELS.includes(s.risk_level), `risk_level valid: ${s.node_id}`);
    }
  });

  it('TEST 5 — Global Audit: results per node, total_nodes === 5, counts consistent', () => {
    const { params } = buildPhase11Federation(TIMESTAMP);
    const report = runInterOrgTrustEngine(params);
    const eligibility = evaluateCertificateEligibility(report.node_trust_indices, TIMESTAMP);
    const certificates = runTrustCertificationEngine(report.node_trust_indices, eligibility, TIMESTAMP);
    const auditReport = runGlobalGovernanceAudit(
      report.node_trust_indices,
      certificates as TrustCertificateForAudit[],
      [report.trust_proof],
      report,
      TIMESTAMP
    );

    assert.strictEqual(auditReport.audit_results.length, 5, 'audit result per node');
    assert.strictEqual(auditReport.total_nodes, 5, 'total_nodes === 5');
    assert.strictEqual(
      auditReport.passed_nodes + auditReport.warning_nodes + auditReport.failed_nodes,
      auditReport.total_nodes,
      'passed + warning + failed === total_nodes'
    );
  });

  it('TEST 6 — Federation Consensus Orchestration: timeline stages, finalized, consensus counts', () => {
    const { params } = buildPhase11Federation(TIMESTAMP);
    const report = runInterOrgTrustEngine(params);
    const eligibility = evaluateCertificateEligibility(report.node_trust_indices, TIMESTAMP);
    const certificates = runTrustCertificationEngine(report.node_trust_indices, eligibility, TIMESTAMP);
    const history = buildTrustEvolutionHistory(TIMESTAMP);
    const { signals } = runPredictiveGovernanceAnalysis(history, TIMESTAMP);
    const auditReport = runGlobalGovernanceAudit(
      report.node_trust_indices,
      certificates as TrustCertificateForAudit[],
      [report.trust_proof],
      report,
      TIMESTAMP
    );
    const { snapshot } = runFederationConsensusOrchestration(
      report.node_trust_indices,
      certificates,
      signals,
      auditReport,
      TIMESTAMP
    );

    assert.strictEqual(snapshot.timeline.length, 5, 'timeline contains 5 stages');
    const stages = snapshot.timeline.map((s) => s.stage);
    assert.deepStrictEqual(stages, [...GOVERNANCE_EXECUTION_ORDER], 'all governance stages present');
    assert.strictEqual(snapshot.finalized, true, 'snapshot.finalized === true');

    assert.strictEqual(snapshot.consensus_state.trust_nodes, 5);
    assert.ok(snapshot.consensus_state.certified_nodes <= 5);
    assert.strictEqual(snapshot.consensus_state.predictive_signals, 5);
    assert.ok(snapshot.consensus_state.audit_passed_nodes <= 5);
  });

  it('TEST 7 — Full Governance Pipeline: Trust → Eligibility → Certification → Predictive → Audit → Orchestration', () => {
    const { params } = buildPhase11Federation(TIMESTAMP);
    const history = buildTrustEvolutionHistory(TIMESTAMP);
    const result = runFullPhase11Pipeline(params, history, TIMESTAMP);

    assert.ok(result.report.node_trust_indices.length === 5);
    assert.ok(result.eligibility.length === 5);
    assert.ok(result.certificates.length >= 1 && result.certificates.length <= 5);
    assert.ok(result.predictiveSignals.length === 5);
    assert.strictEqual(result.auditReport.total_nodes, 5);

    const { snapshot } = result.orchestration;
    assert.ok(Array.isArray(snapshot.timeline) && snapshot.timeline.length === 5);
    assert.ok(snapshot.consensus_state != null);
    assert.strictEqual(snapshot.finalized, true);

    const nodeIds = result.trust_indices.map((t) => t.node_id);
    const sortedIds = [...nodeIds].sort((a, b) => a.localeCompare(b));
    assert.deepStrictEqual(nodeIds, sortedIds, 'deterministic ordering of trust indices');
  });

  it('TEST 8 — Determinism: shuffle inputs, run pipeline twice, identical result', () => {
    const { params: params1 } = buildPhase11Federation(TIMESTAMP);
    const history1 = buildTrustEvolutionHistory(TIMESTAMP);
    const result1 = runFullPhase11Pipeline(params1, history1, TIMESTAMP);

    const shuffledOrder = ['B2', 'B1', 'A3', 'A2', 'A1'];
    let registry2 = createEmptyRegistry();
    registry2 = registerTrustAnchor(registry2, makeTrustAnchor('taA', 'orgA'));
    registry2 = registerTrustAnchor(registry2, makeTrustAnchor('taB', 'orgB'));
    for (const node_id of shuffledOrder) {
      const n = FEDERATION_NODES.find((x) => x.node_id === node_id)!;
      const ta = n.organization_id === 'orgA' ? 'taA' : 'taB';
      registry2 = registerFederatedNode(
        registry2,
        makeNodeRecord(n.node_id, n.organization_id, makeCertificate({ issued_to_node: n.node_id, issuer: ta }), ta),
        'commit-' + n.node_id,
        TIMESTAMP
      ).registry;
    }
    const nodeMetadata2 = getNodeMetadataForConsensus(registry2);
    const trustScores2: NodeTrustScore[] = shuffledOrder.map((id) => {
      const n = FEDERATION_NODES.find((x) => x.node_id === id)!;
      return trustScore(n.node_id, n.declared_trust);
    });
    const params2: InterOrgTrustEngineParams = { nodeMetadata: nodeMetadata2, trustScores: trustScores2, timestamp: TIMESTAMP };
    const history2 = buildTrustEvolutionHistory(TIMESTAMP);
    const result2 = runFullPhase11Pipeline(params2, history2, TIMESTAMP);

    const out1 = {
      trust_node_count: result1.trust_indices.length,
      certified_count: result1.certificates.length,
      predictive_count: result1.predictiveSignals.length,
      audit_total: result1.auditReport.total_nodes,
      audit_passed: result1.auditReport.passed_nodes,
      snapshot_timeline_length: result1.orchestration.snapshot.timeline.length,
      snapshot_finalized: result1.orchestration.snapshot.finalized,
      consensus_state: result1.orchestration.snapshot.consensus_state,
      audit_results_node_ids: result1.auditReport.audit_results.map((r) => r.node_id).sort((a, b) => a.localeCompare(b)),
    };
    const out2 = {
      trust_node_count: result2.trust_indices.length,
      certified_count: result2.certificates.length,
      predictive_count: result2.predictiveSignals.length,
      audit_total: result2.auditReport.total_nodes,
      audit_passed: result2.auditReport.passed_nodes,
      snapshot_timeline_length: result2.orchestration.snapshot.timeline.length,
      snapshot_finalized: result2.orchestration.snapshot.finalized,
      consensus_state: result2.orchestration.snapshot.consensus_state,
      audit_results_node_ids: result2.auditReport.audit_results.map((r) => r.node_id).sort((a, b) => a.localeCompare(b)),
    };
    assert.strictEqual(JSON.stringify(out1), JSON.stringify(out2), 'identical pipeline output (determinism)');
  });

  it('TEST 9 — Governance Invariant Check', () => {
    const { params } = buildPhase11Federation(TIMESTAMP);
    const history = buildTrustEvolutionHistory(TIMESTAMP);
    const result = runFullPhase11Pipeline(params, history, TIMESTAMP);

    const { snapshot } = result.orchestration;
    const trust_nodes = result.trust_indices.length;
    const certified_nodes = result.certificates.length;
    const audit_passed_nodes = result.auditReport.passed_nodes;
    const predictive_signals = result.predictiveSignals.length;

    assert.ok(certified_nodes <= trust_nodes, 'certified_nodes ≤ trust_nodes');
    assert.ok(audit_passed_nodes <= trust_nodes, 'audit_passed_nodes ≤ trust_nodes');
    assert.strictEqual(predictive_signals, trust_nodes, 'predictive_signals === trust_nodes');
    assert.strictEqual(snapshot.timeline.length, 5, 'timeline.length === 5');
  });
});
