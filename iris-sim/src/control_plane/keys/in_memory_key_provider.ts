import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';

import type { KeyPair, KeyProvider, KeyPurpose } from './key_types.js';

/**
 * Dev/test: separate Ed25519 keypairs per purpose (audit ≠ protocol ≠ identity).
 */
export class InMemoryEd25519KeyProvider implements KeyProvider {
  private readonly pairs = new Map<KeyPurpose, KeyPair>();
  private readonly privateKeyObjects = new Map<KeyPurpose, ReturnType<typeof createPrivateKey>>();

  constructor() {
    const purposes: KeyPurpose[] = ['audit_signing', 'node_identity', 'protocol_signing'];
    for (const p of purposes) {
      const { publicKey, privateKey } = generateKeyPairSync('ed25519');
      const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
      const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
      this.pairs.set(p, { publicKey: pubPem, privateKey: privPem });
      this.privateKeyObjects.set(p, createPrivateKey(privPem));
    }
  }

  async getKey(purpose: KeyPurpose): Promise<KeyPair | null> {
    return this.pairs.get(purpose) ?? null;
  }

  async sign(purpose: KeyPurpose, payload: string): Promise<string> {
    return Promise.resolve(this.signSync(purpose, payload));
  }

  async verify(publicKeyPem: string, payload: string, signatureBase64: string): Promise<boolean> {
    try {
      const k = createPublicKey(publicKeyPem);
      return verify(null, Buffer.from(payload, 'utf8'), k, Buffer.from(signatureBase64, 'base64'));
    } catch {
      return false;
    }
  }

  signSync(purpose: KeyPurpose, payload: string): string {
    const pk = this.privateKeyObjects.get(purpose);
    if (!pk) throw new Error(`No key for purpose ${purpose}`);
    const sig = sign(null, Buffer.from(payload, 'utf8'), pk);
    return sig.toString('base64');
  }
}
