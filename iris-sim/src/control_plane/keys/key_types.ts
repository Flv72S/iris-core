export type KeyPurpose = 'audit_signing' | 'node_identity' | 'protocol_signing';

export interface KeyDescriptor {
  keyId: string;
  purpose: KeyPurpose;
  algorithm: 'HMAC_SHA256' | 'ED25519';
  publicKey?: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface KeyProvider {
  getKey(purpose: KeyPurpose): Promise<KeyPair | null>;
  sign(purpose: KeyPurpose, payload: string): Promise<string>;
  verify(publicKey: string, payload: string, signature: string): Promise<boolean>;
  /** Sync signing for audit hot path (HMAC or in-memory Ed25519). */
  signSync?(purpose: KeyPurpose, payload: string): string;
}
