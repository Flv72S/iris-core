/**
 * Microstep 16D.X1 — HMAC-SHA256 signing (base64 output).
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export function signPayload(secret: string, payload: string): string {
  const h = createHmac('sha256', secret);
  h.update(payload, 'utf8');
  return h.digest('base64');
}

export function verifySignature(secret: string, payload: string, signatureBase64: string): boolean {
  try {
    const expected = signPayload(secret, payload);
    const a = Buffer.from(expected, 'base64');
    const b = Buffer.from(signatureBase64, 'base64');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
