/**
 * Phase 11B — Federated Node Registry tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createEmptyRegistry,
  registerFederatedNode,
  updateFederatedNode,
  revokeFederatedNode,
  getNodeById,
  listNodes,
  listActiveNodes,
  listNodesByOrganization,
  buildRegistrySnapshot,
  calculateRegistryHash,
  verifyRegistrySnapshot,
  registerTrustAnchor,
  listTrustAnchors,
  verifyTrustAnchor,
  verifyGovernanceCertificate,
  createRegistryAuditEntry,
  verifyRegistryAuditEntry,
  getNodeMetadataForConsensus,
  computeCertificateHash,
  verifyNodeIdentityCommitment,
  type FederatedNodeRecordRegistrationInput,
  type GovernanceCertificate,
  type TrustAnchor,
} from '../index.js';

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

describe('Federated Node Registry', () => {
  it('Node registration: register valid node', () => {
    let registry = createEmptyRegistry();
    const ta = makeTrustAnchor('ta1', 'org1');
    registry = registerTrustAnchor(registry, ta);
    const cert = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' });
    const record = makeNodeRecord('n1', cert, 'ta1');
    const result = registerFederatedNode(registry, record, 'actor1', 3000);
    assert.ok(result.registry.nodes.length === 1);
    assert.strictEqual(result.registry.nodes[0].node_id, 'n1');
    assert.strictEqual(result.auditEntry.action, 'register');
  });

  it('Certificate verification: valid certificate', () => {
    const ta = makeTrustAnchor('ta1', 'org1');
    const cert = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1', issued_at: 100, expires_at: 2000 });
    const out = verifyGovernanceCertificate(cert, [ta], 500);
    assert.strictEqual(out.valid, true);
  });

  it('Certificate verification: expired certificate', () => {
    const ta = makeTrustAnchor('ta1', 'org1');
    const cert = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1', issued_at: 100, expires_at: 200 });
    const out = verifyGovernanceCertificate(cert, [ta], 500);
    assert.strictEqual(out.valid, false);
    assert.strictEqual(out.reason, 'certificate_expired');
  });

  it('Certificate verification: issuer not trusted', () => {
    const cert = makeCertificate({ issued_to_node: 'n1', issuer: 'unknown_ta', issued_at: 100, expires_at: 2000 });
    const out = verifyGovernanceCertificate(cert, [], 500);
    assert.strictEqual(out.valid, false);
    assert.strictEqual(out.reason, 'issuer_not_trusted');
  });

  it('Trust anchor: register and list', () => {
    let registry = createEmptyRegistry();
    const ta = makeTrustAnchor('ta1', 'org1');
    registry = registerTrustAnchor(registry, ta);
    const list = listTrustAnchors(registry);
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].trust_anchor_id, 'ta1');
  });

  it('Trust anchor: verifyTrustAnchor', () => {
    const ta = makeTrustAnchor('ta1', 'org1');
    assert.strictEqual(verifyTrustAnchor(ta), true);
  });

  it('Query: getNodeById', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    const cert = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' });
    const r = registerFederatedNode(registry, makeNodeRecord('n1', cert, 'ta1'), 'a', 1000);
    registry = r.registry;
    const node = getNodeById(registry, 'n1');
    assert.ok(node !== null);
    assert.strictEqual(node!.node_id, 'n1');
    assert.ok(getNodeById(registry, 'n2') === null);
  });

  it('Query: listNodes, listActiveNodes, listNodesByOrganization', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    const cert1 = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' });
    const cert2 = makeCertificate({ issued_to_node: 'n2', issuer: 'ta1' });
    let r = registerFederatedNode(registry, makeNodeRecord('n1', cert1, 'ta1', { organization_id: 'org1' }), 'a', 1000);
    registry = r.registry;
    r = registerFederatedNode(registry, makeNodeRecord('n2', cert2, 'ta1', { organization_id: 'org1' }), 'a', 1001);
    registry = r.registry;
    assert.strictEqual(listNodes(registry).length, 2);
    assert.strictEqual(listActiveNodes(registry).length, 2);
    assert.strictEqual(listNodesByOrganization(registry, 'org1').length, 2);
    assert.strictEqual(listNodesByOrganization(registry, 'org2').length, 0);
  });

  it('Update: updateFederatedNode changes allowed fields', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    const cert = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' });
    let r = registerFederatedNode(registry, makeNodeRecord('n1', cert, 'ta1'), 'a', 1000);
    registry = r.registry;
    r = updateFederatedNode(registry, 'n1', { node_name: 'updated-name', governance_role: 'coordinator' }, 'a', 1001);
    registry = r.registry;
    const node = getNodeById(registry, 'n1');
    assert.ok(node !== null);
    assert.strictEqual(node!.node_name, 'updated-name');
    assert.strictEqual(node!.governance_role, 'coordinator');
    assert.strictEqual(node!.last_update_timestamp, 1001);
  });

  it('Revocation: revoked node not in listActiveNodes', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    const cert = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' });
    let r = registerFederatedNode(registry, makeNodeRecord('n1', cert, 'ta1'), 'a', 1000);
    registry = r.registry;
    assert.strictEqual(listActiveNodes(registry).length, 1);
    r = revokeFederatedNode(registry, 'n1', 'a', 1001);
    registry = r.registry;
    assert.strictEqual(listActiveNodes(registry).length, 0);
    assert.ok(getNodeById(registry, 'n1')?.node_status === 'revoked');
  });

  it('Registry hash: calculateRegistryHash and verifyRegistrySnapshot', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    const h1 = calculateRegistryHash(registry);
    assert.ok(h1.length === 64);
    assert.strictEqual(verifyRegistrySnapshot(registry), true);
  });

  it('Determinism: same registry → same hash', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    const cert = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' });
    const r = registerFederatedNode(registry, makeNodeRecord('n1', cert, 'ta1'), 'a', 1000);
    registry = r.registry;
    const h1 = calculateRegistryHash(registry);
    const h2 = calculateRegistryHash(registry);
    assert.strictEqual(h1, h2);
  });

  it('Registry snapshot: buildRegistrySnapshot', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    const snap = buildRegistrySnapshot(registry, 5000);
    assert.strictEqual(snap.node_count, 0);
    assert.strictEqual(snap.trust_anchor_count, 1);
    assert.strictEqual(snap.snapshot_timestamp, 5000);
    assert.strictEqual(snap.registry_hash, registry.registry_hash);
  });

  it('Audit log: entry verification and chain', () => {
    const entry = createRegistryAuditEntry('register', 'n1', 'actor1', 'prevHash', 'newHash', 1000);
    assert.strictEqual(verifyRegistryAuditEntry(entry), true);
    assert.strictEqual(entry.action, 'register');
    assert.strictEqual(entry.previous_hash, 'prevHash');
    assert.strictEqual(entry.new_hash, 'newHash');
  });

  it('getNodeMetadataForConsensus returns NodeMetadata with node_identity_commitment', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    const cert = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' });
    const r = registerFederatedNode(registry, makeNodeRecord('n1', cert, 'ta1'), 'a', 1000);
    registry = r.registry;
    const meta = getNodeMetadataForConsensus(registry);
    assert.strictEqual(meta.length, 1);
    assert.strictEqual(meta[0].node_id, 'n1');
    assert.strictEqual(meta[0].trust_anchor, 'ta1');
    assert.strictEqual(meta[0].reliability_weight, 1);
    assert.ok(typeof meta[0].node_identity_commitment === 'string' && meta[0].node_identity_commitment.length === 64);
  });

  it('11B.1 — Commitment creation: node.node_identity_commitment is defined after register', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    const cert = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' });
    const r = registerFederatedNode(registry, makeNodeRecord('n1', cert, 'ta1'), 'actor1', 3000);
    const node = getNodeById(r.registry, 'n1');
    assert.ok(node !== null);
    assert.ok(node!.node_identity_commitment !== undefined && node!.node_identity_commitment.length === 64);
  });

  it('11B.1 — Deterministic commitment: same input → identical commitment', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    const cert = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' });
    const record = makeNodeRecord('n1', cert, 'ta1');
    const r1 = registerFederatedNode(registry, record, 'a', 1000);
    let registry2 = createEmptyRegistry();
    registry2 = registerTrustAnchor(registry2, makeTrustAnchor('ta1', 'org1'));
    const r2 = registerFederatedNode(registry2, record, 'a', 1000);
    const c1 = getNodeById(r1.registry, 'n1')!.node_identity_commitment;
    const c2 = getNodeById(r2.registry, 'n1')!.node_identity_commitment;
    assert.strictEqual(c1, c2);
  });

  it('11B.1 — Commitment changes with certificate: update certificate → commitment changes', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    const certA = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1', public_key: 'pk-a' });
    const certB = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1', public_key: 'pk-b' });
    let r = registerFederatedNode(registry, makeNodeRecord('n1', certA, 'ta1'), 'a', 1000);
    registry = r.registry;
    const commitmentBefore = getNodeById(registry, 'n1')!.node_identity_commitment;
    r = updateFederatedNode(registry, 'n1', { certificate: certB }, 'a', 1001);
    registry = r.registry;
    const commitmentAfter = getNodeById(registry, 'n1')!.node_identity_commitment;
    assert.notStrictEqual(commitmentBefore, commitmentAfter);
  });

  it('11B.1 — Commitment verification: verifyNodeIdentityCommitment returns true for valid node', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    const cert = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' });
    const r = registerFederatedNode(registry, makeNodeRecord('n1', cert, 'ta1'), 'a', 1000);
    const node = getNodeById(r.registry, 'n1');
    assert.ok(node !== null);
    assert.strictEqual(verifyNodeIdentityCommitment(node!), true);
  });

  it('11B.1 — Tampering detection: modified certificate_hash → verifyNodeIdentityCommitment false', () => {
    let registry = createEmptyRegistry();
    registry = registerTrustAnchor(registry, makeTrustAnchor('ta1', 'org1'));
    const cert = makeCertificate({ issued_to_node: 'n1', issuer: 'ta1' });
    const r = registerFederatedNode(registry, makeNodeRecord('n1', cert, 'ta1'), 'a', 1000);
    const node = getNodeById(r.registry, 'n1')!;
    const tampered = Object.freeze({
      ...node,
      certificate: Object.freeze({ ...node.certificate, certificate_hash: 'tampered_hash' }),
    });
    assert.strictEqual(verifyNodeIdentityCommitment(tampered), false);
  });
});
