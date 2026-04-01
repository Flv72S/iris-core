/**
 * Step 7B — Certification layer tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createHash, generateKeyPairSync } from 'node:crypto';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import {
  canonicalizePayload,
  computeCertificationHash,
  generateGovernanceCertification,
  generateCertificationSnapshot,
  verifyCertificationSignature,
  verifyGovernanceCertification,
  snapshotToPayload,
} from '../index.js';

function makeSnapshot(overrides?: Partial<GovernanceTierSnapshot>): GovernanceTierSnapshot {
  return Object.freeze({
    modelVersion: '7A_v1.0',
    score: 0.85,
    tier: 'TIER_3_STABLE',
    computedAt: 1000000,
    normalizedMetrics: Object.freeze({
      flipStability: 0.9,
      invariantIntegrity: 0.85,
      entropyControl: 0.8,
      violationPressure: 0.9,
    }),
    hardCapApplied: false,
    structuralCapApplied: false,
    ...overrides,
  });
}

/**
 * Get Ed25519 keypair as Uint8Array (PKCS8 DER private, SPKI DER public).
 */
function getTestKeyPair(): { privateKey: Uint8Array; publicKey: Uint8Array } {
  const { privateKey: privObj, publicKey: pubObj } = generateKeyPairSync('ed25519');
  const pkcs8 = Uint8Array.from(privObj.export({ type: 'pkcs8', format: 'der' }) as Buffer);
  const spki = Uint8Array.from(pubObj.export({ type: 'spki', format: 'der' }) as Buffer);
  return { privateKey: pkcs8, publicKey: spki };
}

describe('Step 7B — Certification', () => {
  const keyPair = getTestKeyPair();

  it('1. stessa snapshot → stesso hash', () => {
    const snap = makeSnapshot();
    const payload = snapshotToPayload(snap);
    const can1 = canonicalizePayload(payload);
    const can2 = canonicalizePayload(payload);
    assert.strictEqual(can1, can2);
    const hash1 = computeCertificationHash(can1);
    const hash2 = computeCertificationHash(can2);
    assert.strictEqual(hash1, hash2);
  });

  it('2. modifica score → hash diverso', () => {
    const p1 = snapshotToPayload(makeSnapshot({ score: 0.8 }));
    const p2 = snapshotToPayload(makeSnapshot({ score: 0.81 }));
    const h1 = computeCertificationHash(canonicalizePayload(p1));
    const h2 = computeCertificationHash(canonicalizePayload(p2));
    assert.notStrictEqual(h1, h2);
  });

  it('3. firma valida verificata', () => {
    const snap = makeSnapshot();
    const cert = generateGovernanceCertification(snap, keyPair.privateKey, keyPair.publicKey);
    const ok = verifyCertificationSignature(
      cert.payloadHash,
      cert.signature,
      cert.publicKey
    );
    assert.strictEqual(ok, true);
  });

  it('4. firma alterata → verifica fallisce', () => {
    const snap = makeSnapshot();
    const cert = generateGovernanceCertification(snap, keyPair.privateKey, keyPair.publicKey);
    const tampered = new Uint8Array(cert.signature);
    tampered[0] ^= 0xff;
    const ok = verifyCertificationSignature(
      cert.payloadHash,
      tampered,
      cert.publicKey
    );
    assert.strictEqual(ok, false);
  });

  it('5. payload alterato → verifica fallisce', () => {
    const snap = makeSnapshot();
    const cert = generateGovernanceCertification(snap, keyPair.privateKey, keyPair.publicKey);
    const tamperedHash = createHash('sha256').update('tampered').digest('hex');
    const ok = verifyCertificationSignature(
      tamperedHash,
      cert.signature,
      cert.publicKey
    );
    assert.strictEqual(ok, false);
    const fullOk = verifyGovernanceCertification({
      ...cert,
      payloadHash: tamperedHash,
    });
    assert.strictEqual(fullOk, false);
  });

  it('6. serializzazione canonica deterministica', () => {
    const payload = snapshotToPayload(makeSnapshot());
    const can1 = canonicalizePayload(payload);
    const can2 = canonicalizePayload(payload);
    assert.strictEqual(can1, can2);
    assert.ok(can1.startsWith('{'));
    assert.ok(can1.includes('"computedAt"'));
    assert.ok(can1.includes('"modelVersion"'));
  });

  it('7. replay snapshot → certificato identico', () => {
    const snap = makeSnapshot({ computedAt: 2000000 });
    const cert1 = generateGovernanceCertification(snap, keyPair.privateKey, keyPair.publicKey);
    const cert2 = generateGovernanceCertification(snap, keyPair.privateKey, keyPair.publicKey);
    assert.strictEqual(cert1.payloadHash, cert2.payloadHash);
    assert.strictEqual(cert1.tier, cert2.tier);
    assert.strictEqual(cert1.score, cert2.score);
    assert.deepStrictEqual(Array.from(cert1.signature), Array.from(cert2.signature));
  });

  it('8. chiave diversa → firma diversa', () => {
    const snap = makeSnapshot();
    const pair2 = getTestKeyPair();
    const cert1 = generateGovernanceCertification(snap, keyPair.privateKey, keyPair.publicKey);
    const cert2 = generateGovernanceCertification(snap, pair2.privateKey, pair2.publicKey);
    assert.strictEqual(cert1.payloadHash, cert2.payloadHash);
    assert.notDeepStrictEqual(Array.from(cert1.signature), Array.from(cert2.signature));
  });

  it('verifyGovernanceCertification full flow', () => {
    const snap = makeSnapshot();
    const cert = generateGovernanceCertification(snap, keyPair.privateKey, keyPair.publicKey);
    assert.strictEqual(verifyGovernanceCertification(cert), true);
  });

  it('generateCertificationSnapshot', () => {
    const snap = makeSnapshot();
    const out = generateCertificationSnapshot(snap, keyPair.privateKey, keyPair.publicKey);
    assert.strictEqual(out.canonicalPayload, canonicalizePayload(out.payload));
    assert.strictEqual(out.certification.payloadHash, computeCertificationHash(out.canonicalPayload));
  });
});
