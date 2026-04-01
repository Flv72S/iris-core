/**
 * S-4 — Deterministic seed sequence. No randomness.
 */

import { createHash } from 'crypto';

/**
 * Generate seed_i = hash(baseSeed + ":" + i). Order is stable.
 */
export function generateSeeds(baseSeed: string, count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const payload = baseSeed + ':' + String(i);
    out.push(createHash('sha256').update(payload, 'utf8').digest('hex'));
  }
  return out;
}
