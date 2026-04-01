/**
 * Microstep 16D.X1 — Node ↔ control plane signing utilities.
 */

import { IRIS_MIN_NODE_SECRET_BYTES } from './security_types.js';

export { signPayload, verifySignature } from './hmac.js';
export { signTrustEvent, verifyTrustEvent } from './trust_event_crypto.js';
export { stableStringify } from './stable_json.js';
export { generateNonce, InMemoryNonceStore } from './nonce.js';
export type { NonceStore } from './nonce.js';
export { securityLog, setSecurityLogSink, shutdownSecurityLogger } from './security_logger.js';
export type { SecurityLogSink } from './security_logger.js';
export {
  IRIS_HEADER_NODE_ID,
  IRIS_HEADER_TIMESTAMP,
  IRIS_HEADER_NONCE,
  IRIS_HEADER_SIGNATURE,
  IRIS_AUTH_CLOCK_SKEW_MS,
  IRIS_AUTH_NONCE_TTL_MS,
  IRIS_MIN_NODE_SECRET_BYTES,
} from './security_types.js';

export function validateNodeSecretLength(secret: string): boolean {
  return Buffer.byteLength(secret, 'utf8') >= IRIS_MIN_NODE_SECRET_BYTES;
}
