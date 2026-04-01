import {
  generateKeyPairSync,
  diffieHellman,
  createPublicKey,
  createPrivateKey,
  type KeyObject,
} from 'node:crypto';

import { secureZero as secureZeroBuf } from './pfs_zero.js';

/** ASN.1 prefix + 32-byte raw X25519 public key (SubjectPublicKeyInfo). */
const X25519_SPKI_PREFIX = Buffer.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x03, 0x21, 0x00]);

/** ASN.1 prefix + 32-byte raw X25519 seed (PKCS#8). */
const X25519_PKCS8_PREFIX = Buffer.from([0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x04, 0x22, 0x04, 0x20]);

export type EphemeralKeyPair = {
  publicKey: Buffer;
  privateKey: Buffer;
};

export function importX25519PublicKeyRaw(raw: Buffer): KeyObject {
  return createPublicKey({ key: Buffer.concat([X25519_SPKI_PREFIX, raw]), format: 'der', type: 'spki' });
}

export function importX25519PrivateKeyRaw(raw: Buffer): KeyObject {
  return createPrivateKey({ key: Buffer.concat([X25519_PKCS8_PREFIX, raw]), format: 'der', type: 'pkcs8' });
}

/**
 * Ephemeral X25519 keypair (raw 32-byte public / private material).
 * Keys MUST NOT be persisted; wipe with {@link zeroBuffer}/{@link secureZeroBuf} after use.
 */
export function generateEphemeralKeyPair(): EphemeralKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('x25519');
  const pubDer = publicKey.export({ format: 'der', type: 'spki' }) as Buffer;
  const privDer = privateKey.export({ format: 'der', type: 'pkcs8' }) as Buffer;
  return {
    publicKey: Buffer.from(pubDer.subarray(-32)),
    privateKey: Buffer.from(privDer.subarray(-32)),
  };
}

export function validateX25519PublicKeyRaw(raw: Buffer): void {
  if (!Buffer.isBuffer(raw) || raw.length !== 32) {
    const e = new Error('PFS_INVALID_PUBLIC_KEY');
    (e as NodeJS.ErrnoException).code = 'PFS_INVALID_PUBLIC_KEY';
    throw e;
  }
  if (raw.equals(Buffer.alloc(32))) {
    const e = new Error('PFS_INVALID_PUBLIC_KEY');
    (e as NodeJS.ErrnoException).code = 'PFS_INVALID_PUBLIC_KEY';
    throw e;
  }
  try {
    importX25519PublicKeyRaw(raw);
  } catch {
    const e = new Error('PFS_INVALID_PUBLIC_KEY');
    (e as NodeJS.ErrnoException).code = 'PFS_INVALID_PUBLIC_KEY';
    throw e;
  }
}

export function deriveSharedSecret(privateKey: Buffer, peerPublicKey: Buffer): Buffer {
  validateX25519PublicKeyRaw(peerPublicKey);
  if (!Buffer.isBuffer(privateKey) || privateKey.length !== 32) {
    const e = new Error('PFS_DERIVATION_FAILED');
    (e as NodeJS.ErrnoException).code = 'PFS_DERIVATION_FAILED';
    throw e;
  }
  const priv = importX25519PrivateKeyRaw(privateKey);
  const pub = importX25519PublicKeyRaw(peerPublicKey);
  try {
    return Buffer.from(diffieHellman({ privateKey: priv, publicKey: pub }));
  } catch {
    const e = new Error('PFS_DERIVATION_FAILED');
    (e as NodeJS.ErrnoException).code = 'PFS_DERIVATION_FAILED';
    throw e;
  }
}

export function zeroBuffer(buf: Buffer): void {
  secureZeroBuf(buf);
}
