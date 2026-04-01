/**
 * Microstep 15C-H — Encryption Hardening. HKDF key derivation.
 */

import { createHash, createHmac } from 'node:crypto';

function hkdfSha256(ikm: Buffer, salt: Buffer, info: Buffer, length: number): Buffer {
  // RFC 5869 HKDF-SHA256
  const prk = createHmac('sha256', salt).update(ikm).digest();
  const blocks = Math.ceil(length / 32);
  const okm: Buffer[] = [];
  let t = Buffer.alloc(0);
  for (let i = 1; i <= blocks; i++) {
    const hmac = createHmac('sha256', prk);
    hmac.update(Buffer.concat([t, info, Buffer.from([i])]));
    t = hmac.digest();
    okm.push(t);
  }
  return Buffer.concat(okm).subarray(0, length);
}

export function deriveKeys(
  shared_secret: Buffer,
  session_id: string,
  sender_node_id: string,
  recipient_node_id: string,
): { encryption_key: Buffer } {
  const salt = createHash('sha256').update(session_id, 'utf8').digest(); // 32 bytes
  const info = Buffer.from(`IRIS::ENCRYPTION::${session_id}::${sender_node_id}::${recipient_node_id}`, 'utf8');
  const key = hkdfSha256(shared_secret, salt, info, 32);
  return { encryption_key: key };
}

