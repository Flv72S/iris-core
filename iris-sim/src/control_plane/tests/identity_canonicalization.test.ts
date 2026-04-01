import assert from 'node:assert';
import { generateKeyPairSync } from 'node:crypto';
import { describe, it } from 'node:test';

import {
  canonicalizePublicKey,
  deriveNodeIdFromDer,
  publicKeyDerFingerprint,
  tryCanonicalizePublicKey,
} from '../identity/key_canonicalization.js';
import { deriveNodeId } from '../identity/node_identity.js';

function ed25519Pem(): string {
  const { publicKey } = generateKeyPairSync('ed25519');
  return publicKey.export({ type: 'spki', format: 'pem' }) as string;
}

describe('identity canonicalization (16F.X1.X2.HARDENING)', () => {
  it('equivalent PEM variants yield same nodeId and fingerprint', () => {
    const pem = ed25519Pem();
    const id0 = deriveNodeId(pem);
    const id1 = deriveNodeId(`${pem}\n\n`);
    const id2 = deriveNodeId(pem.replace(/\n/g, '\r\n'));
    const id3 = deriveNodeId(`  \n${pem}  `);
    assert.strictEqual(id0, id1);
    assert.strictEqual(id0, id2);
    assert.strictEqual(id0, id3);
    assert.strictEqual(publicKeyDerFingerprint(pem), publicKeyDerFingerprint(pem.replace(/\n/g, '\r\n')));
  });

  it('re-wrapped base64 block yields same nodeId', () => {
    const pem = ed25519Pem();
    const body = pem
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\s/g, '');
    const rewrapped = `-----BEGIN PUBLIC KEY-----\n${body.match(/.{1,18}/g)!.join('\n')}\n-----END PUBLIC KEY-----\n`;
    assert.strictEqual(deriveNodeId(pem), deriveNodeId(rewrapped));
  });

  it('invalid PEM is rejected by tryCanonicalize', () => {
    assert.strictEqual(tryCanonicalizePublicKey('').ok, false);
    assert.strictEqual(tryCanonicalizePublicKey('not pem').ok, false);
    const badBlock = '-----BEGIN PUBLIC KEY-----\n!!!notbase64!!!\n-----END PUBLIC KEY-----';
    assert.strictEqual(tryCanonicalizePublicKey(badBlock).ok, false);
  });

  it('canonicalizePublicKey throws with expected codes', () => {
    assert.throws(() => canonicalizePublicKey(''), { message: 'INVALID_PUBLIC_KEY_FORMAT' });
  });

  it('non-Ed25519 key is rejected', () => {
    const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const rsaPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    const r = tryCanonicalizePublicKey(rsaPem);
    assert.strictEqual(r.ok, false);
    assert.strictEqual(r.ok ? '' : r.code, 'INVALID_PUBLIC_KEY_FORMAT');
  });

  it('different keys yield different nodeIds', () => {
    assert.notStrictEqual(deriveNodeId(ed25519Pem()), deriveNodeId(ed25519Pem()));
  });

  it('deriveNodeId matches deriveNodeIdFromDer(canonical DER)', () => {
    const pem = ed25519Pem();
    const der = canonicalizePublicKey(pem);
    assert.strictEqual(deriveNodeId(pem), deriveNodeIdFromDer(der));
  });

  it('deriveNodeId throws IDENTITY_DERIVATION_FAILED on invalid material', () => {
    assert.throws(() => deriveNodeId('x'), (e: Error) => e.message === 'IDENTITY_DERIVATION_FAILED');
  });
});
