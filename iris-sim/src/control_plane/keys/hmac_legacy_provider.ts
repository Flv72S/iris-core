import { signPayload, verifySignature } from '../../security/hmac.js';
import type { KeyPair, KeyProvider, KeyPurpose } from './key_types.js';

/**
 * Backward-compatible provider: one shared secret for all purposes (MVP / migration).
 */
export class HmacLegacyKeyProvider implements KeyProvider {
  constructor(private readonly secret: string) {}

  async getKey(_purpose: KeyPurpose): Promise<KeyPair | null> {
    return { publicKey: '', privateKey: this.secret };
  }

  async sign(_purpose: KeyPurpose, payload: string): Promise<string> {
    return signPayload(this.secret, payload);
  }

  async verify(publicKey: string, payload: string, signature: string): Promise<boolean> {
    if (publicKey && publicKey.length > 0) {
      return false;
    }
    return verifySignature(this.secret, payload, signature);
  }

  signSync(_purpose: KeyPurpose, payload: string): string {
    return signPayload(this.secret, payload);
  }
}
