/**
 * Step 7B — Ed25519 signature of certification hash.
 */

import { sign as cryptoSign, createPrivateKey } from 'node:crypto';

/**
 * Sign the certification hash (hex string) with Ed25519 private key.
 * privateKey: PKCS8 DER (Uint8Array) or 32-byte raw seed where supported.
 * Returns signature as Uint8Array.
 */
export function signCertificationHash(
  hash: string,
  privateKey: Uint8Array
): Uint8Array {
  const keyObj = createPrivateKey({
    key: Buffer.from(privateKey),
    format: 'der',
    type: 'pkcs8',
  });
  const data = Buffer.from(hash, 'hex');
  const sig = cryptoSign(null, data, keyObj);
  return new Uint8Array(sig);
}
