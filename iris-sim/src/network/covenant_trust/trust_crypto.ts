/**
 * Microstep 14S — Trust & Verification Layer. Cryptographic provider.
 *
 * Default implementation:
 * - SHA-256 hash (hex)
 * - Ed25519 signatures over hash bytes (base64 signatures)
 */

import { createHash, createPrivateKey, createPublicKey, sign as cryptoSign, verify as cryptoVerify } from 'node:crypto';

export interface CryptoProvider {
  sign(data: string, privateKey: string): string;
  verify(data: string, signature: string, publicKey: string): boolean;
  hash(data: string): string;
}

/**
 * Keys are expected to be base64 DER:
 * - privateKey: pkcs8 der
 * - publicKey: spki der
 */
export class DefaultCryptoProvider implements CryptoProvider {
  hash(data: string): string {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }

  sign(data: string, privateKey: string): string {
    const keyObj = createPrivateKey({
      key: Buffer.from(privateKey, 'base64'),
      format: 'der',
      type: 'pkcs8',
    });
    const bytes = Buffer.from(data, 'hex');
    const sig = cryptoSign(null, bytes, keyObj);
    return sig.toString('base64');
  }

  verify(data: string, signature: string, publicKey: string): boolean {
    const keyObj = createPublicKey({
      key: Buffer.from(publicKey, 'base64'),
      format: 'der',
      type: 'spki',
    });
    const bytes = Buffer.from(data, 'hex');
    const sig = Buffer.from(signature, 'base64');
    return cryptoVerify(null, bytes, keyObj, sig);
  }
}

