/**
 * S-6 — Correlated failure windows. Deterministic from seed + tick.
 */

import { createHash } from 'crypto';
import type { DegradationConfig } from '../core/DegradationConfig.js';

export function isInCorrelatedFailureWindow(seed: string, tick: bigint, config: DegradationConfig): boolean {
  if (config.correlatedFailureWindow <= 0) return false;
  const phase = Number(tick / BigInt(config.correlatedFailureWindow));
  const payload = seed + ':' + String(phase);
  const h = createHash('sha256').update(payload, 'utf8').digest('hex');
  return (parseInt(h.slice(0, 4), 16) % 100) < 15;
}

export function correlatedCapacityMultiplier(inWindow: boolean, config: DegradationConfig): number {
  return inWindow ? 1 / config.correlatedFailureMultiplier : 1;
}
