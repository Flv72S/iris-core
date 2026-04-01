import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AuditLog } from '../audit_log.js';
import { createAuditSnapshot, verifyAuditSnapshotMatchesLog } from '../audit_snapshot.js';
import { hashInternal } from '../merkle_hash.js';
import { generateMerkleProof, verifyMerkleProof } from '../merkle_proof.js';
import { buildMerkleTree, getMerkleRoot } from '../merkle_tree.js';
import type { MerkleProof } from '../merkle_types.js';
import type { TrustAuditRecord } from '../audit_types.js';

const SEC = 'merkle-test-secret-012345678901234567890';
const SIGNER = 'S';

function baseRecord(eventId: string, ts = 1): TrustAuditRecord {
  return {
    recordId: '',
    eventId,
    nodeId: 'N',
    timestamp: ts,
    eventType: 'NODE_ACTIVATED',
    payloadHash: 'ph',
    issuer: 'I',
    verified: true,
    signerNodeId: SIGNER,
    recordHash: '',
  };
}

describe('Merkle audit (16F.X2)', () => {
  it('deterministic root: same leaves → same root', () => {
    const h = ['aa', 'bb', 'cc', 'dd'];
    const r1 = getMerkleRoot(buildMerkleTree(h));
    const r2 = getMerkleRoot(buildMerkleTree([...h]));
    assert.strictEqual(r1, r2);
  });

  it('root changes when one leaf changes', () => {
    const a = getMerkleRoot(buildMerkleTree(['a', 'b', 'c', 'd']));
    const b = getMerkleRoot(buildMerkleTree(['a', 'b', 'x', 'd']));
    assert.notStrictEqual(a, b);
  });

  it('generated proof verifies', () => {
    const h = ['l0', 'l1', 'l2', 'l3'];
    const root = getMerkleRoot(buildMerkleTree(h));
    const proof = generateMerkleProof(h, 2);
    assert.strictEqual(proof.root, root);
    assert.strictEqual(verifyMerkleProof(proof), true);
  });

  it('tampered proof step fails verification', () => {
    const h = ['a', 'b', 'c', 'd'];
    const proof = generateMerkleProof(h, 1);
    const bad: MerkleProof = {
      ...proof,
      steps: proof.steps.map((s, i) => (i === 0 ? { ...s, hash: s.hash + 'ff' } : s)),
    };
    assert.strictEqual(verifyMerkleProof(bad), false);
  });

  it('partial verification: only leaf + proof + root', () => {
    const h = ['x', 'y', 'z'];
    const proof = generateMerkleProof(h, 1);
    assert.strictEqual(verifyMerkleProof(proof), true);
    assert.strictEqual(verifyMerkleProof({ ...proof, root: 'dead' }), false);
  });

  it('odd leaf count: padding yields consistent root and proofs', () => {
    const h = ['a', 'b', 'c'];
    const root = getMerkleRoot(buildMerkleTree(h));
    const p0 = generateMerkleProof(h, 0);
    const p2 = generateMerkleProof(h, 2);
    assert.strictEqual(p0.root, root);
    assert.strictEqual(p2.root, root);
    assert.strictEqual(verifyMerkleProof(p0), true);
    assert.strictEqual(verifyMerkleProof(p2), true);
    const dup = hashInternal('c', 'c');
    assert.strictEqual(root, getMerkleRoot(buildMerkleTree(['a', 'b', 'c', 'c'])));
    assert.strictEqual(dup, getMerkleRoot(buildMerkleTree(['c', 'c'])));
  });

  it('cross-node: identical append sequences → identical Merkle root', () => {
    const a = new AuditLog({ signingSecret: SEC, signerNodeId: SIGNER });
    const b = new AuditLog({ signingSecret: SEC, signerNodeId: SIGNER });
    a.append(baseRecord('e1', 10));
    a.append(baseRecord('e2', 11));
    b.append(baseRecord('e1', 10));
    b.append(baseRecord('e2', 11));
    assert.strictEqual(a.getMerkleRoot(), b.getMerkleRoot());
  });

  it('snapshot matches log root', () => {
    const log = new AuditLog({ signingSecret: SEC, signerNodeId: SIGNER });
    log.append(baseRecord('snap', 5));
    const snap = createAuditSnapshot(log);
    assert.strictEqual(verifyAuditSnapshotMatchesLog(snap, log), true);
    assert.strictEqual(snap.merkleRoot, log.getMerkleRoot());
  });

  it('AuditLog proof matches getMerkleRoot', () => {
    const log = new AuditLog({ signingSecret: SEC, signerNodeId: SIGNER });
    log.append(baseRecord('a', 1));
    log.append(baseRecord('b', 2));
    const hashes = log.getRecordHashes();
    const p = log.getProofForRecord(0);
    assert.strictEqual(p.root, log.getMerkleRoot());
    assert.strictEqual(p.leafHash, hashes[0]);
    assert.strictEqual(verifyMerkleProof(p), true);
  });
});
