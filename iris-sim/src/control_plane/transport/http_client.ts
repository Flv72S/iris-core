/**
 * Microstep 16D — Node → control plane HTTP POST with bounded exponential retry (non-blocking).
 * Microstep 16D.X1 — Optional HMAC-signed ingest (headers + canonical payload).
 */

import { signPayload } from '../../security/hmac.js';
import { generateNonce } from '../../security/nonce.js';
import {
  IRIS_HEADER_NODE_ID,
  IRIS_HEADER_NONCE,
  IRIS_HEADER_SIGNATURE,
  IRIS_HEADER_TIMESTAMP,
  validateNodeSecretLength,
} from '../../security/index.js';
import { buildSignedPayloadString } from '../control_plane_ingest_auth.js';

export type PostIngestOptions = {
  /** Base URL, e.g. `http://127.0.0.1:9470` */
  baseUrl: string;
  nodeId: string;
  snapshot: unknown;
  /** Max POST attempts per tick. Default 5. */
  maxAttempts?: number;
  /** Initial backoff ms. Default 400. */
  initialBackoffMs?: number;
  /** Microstep 16D.X1 — when enabled and secret is valid, send HMAC headers. */
  auth?: {
    enabled: boolean;
    nodeSecret?: string;
    nextSecret?: string;
  };
};

function joinIngestUrl(baseUrl: string): string {
  const u = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${u}/ingest`;
}

/**
 * POST `{ nodeId, snapshot }` to `/ingest`. Swallows errors after retries (does not throw).
 */
export async function postObservabilityIngest(opts: PostIngestOptions): Promise<void> {
  const maxAttempts = opts.maxAttempts ?? 5;
  const initialBackoffMs = opts.initialBackoffMs ?? 400;
  const url = joinIngestUrl(opts.baseUrl);
  const bodyObj = { nodeId: opts.nodeId, snapshot: opts.snapshot };
  const body = JSON.stringify(bodyObj);
  let backoff = initialBackoffMs;

  const signingSecret =
    opts.auth?.nodeSecret && validateNodeSecretLength(opts.auth.nodeSecret)
      ? opts.auth.nodeSecret
      : opts.auth?.nextSecret && validateNodeSecretLength(opts.auth.nextSecret)
        ? opts.auth.nextSecret
        : undefined;
  const useAuth = opts.auth?.enabled === true && signingSecret !== undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (useAuth) {
        const timestamp = Date.now();
        const nonce = generateNonce();
        const payload = buildSignedPayloadString({
          nodeId: opts.nodeId,
          timestamp,
          nonce,
          body: bodyObj,
        });
        const signature = signPayload(signingSecret!, payload);
        headers[IRIS_HEADER_NODE_ID] = opts.nodeId;
        headers[IRIS_HEADER_TIMESTAMP] = String(timestamp);
        headers[IRIS_HEADER_NONCE] = nonce;
        headers[IRIS_HEADER_SIGNATURE] = signature;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });
      if (res.ok) return;
    } catch {
      /* network failure — retry */
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, backoff));
      backoff = Math.min(backoff * 2, 16_000);
    }
  }
}
