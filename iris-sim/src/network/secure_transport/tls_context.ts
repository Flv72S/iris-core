import type { KeyObject } from 'node:crypto';

export interface TlsContext {
  privateKeyPem: string;
  publicKeyPem: string;
  certificatePem: string;

  /**
   * Cached public key object for identity binding checks.
   * (Derived from `publicKeyPem`.)
   */
  _publicKeyObject?: KeyObject;
}

export function buildTlsContext(options: {
  privateKeyPem: string;
  publicKeyPem: string;
  certificatePem: string;
}): TlsContext {
  return {
    privateKeyPem: options.privateKeyPem,
    publicKeyPem: options.publicKeyPem,
    certificatePem: options.certificatePem,
  };
}

