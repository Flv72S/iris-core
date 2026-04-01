/**
 * Microstep 16D.X1 — Control plane request signing (HMAC) header names.
 */

export const IRIS_HEADER_NODE_ID = 'x-iris-node-id';
export const IRIS_HEADER_TIMESTAMP = 'x-iris-timestamp';
export const IRIS_HEADER_NONCE = 'x-iris-nonce';
export const IRIS_HEADER_SIGNATURE = 'x-iris-signature';

/** Clock skew window for signed ingest (ms). */
export const IRIS_AUTH_CLOCK_SKEW_MS = 60_000;

/** Nonce TTL / replay window (ms). */
export const IRIS_AUTH_NONCE_TTL_MS = 60_000;

/** Minimum UTF-8 byte length for shared node secret. */
export const IRIS_MIN_NODE_SECRET_BYTES = 32;
