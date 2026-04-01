/**
 * Microstep 15C — Encryption Layer. Ephemeral key exchange (X25519).
 */

import { createPrivateKey, createPublicKey, diffieHellman, generateKeyPairSync } from 'node:crypto';

export class KeyExchange {
  generateEphemeralKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = generateKeyPairSync('x25519', {
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });

    return {
      publicKey: publicKey.toString('base64'),
      privateKey: privateKey.toString('base64'),
    };
  }

  deriveSharedSecret(privateKey: string, remotePublicKey: string): Buffer {
    const priv = createPrivateKey({
      key: Buffer.from(privateKey, 'base64'),
      format: 'der',
      type: 'pkcs8',
    });
    const pub = createPublicKey({
      key: Buffer.from(remotePublicKey, 'base64'),
      format: 'der',
      type: 'spki',
    });

    return diffieHellman({ privateKey: priv, publicKey: pub });
  }
}

