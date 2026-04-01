/**
 * Adaptive Read Cache Strategy — implementazione deterministica
 * Deriva decisioni di cache solo dalla ReadSLA. Nessun storage, nessun side-effect.
 */

import type { ReadSLA } from '../../core/read-sla';
import type { ReadCacheDecision, ReadCacheStrategy } from './ReadCacheStrategy';

/** Soglia sotto cui maxStalenessMs riduce il TTL (ms). */
const STALENESS_THRESHOLD_MS = 30_000;

/**
 * Strategia adattiva: cache abilitata se SLA ha cacheTTLms; TTL adattato a maxStalenessMs se più restrittivo.
 */
export class AdaptiveReadCacheStrategy implements ReadCacheStrategy {
  decide(sla?: ReadSLA): ReadCacheDecision {
    if (sla === undefined) {
      return { cache: false };
    }

    const cacheTTLms = sla.cacheTTLms;
    if (cacheTTLms === undefined) {
      return { cache: false };
    }

    const maxStalenessMs = sla.maxStalenessMs;
    let ttlMs = cacheTTLms;
    if (maxStalenessMs !== undefined && maxStalenessMs < STALENESS_THRESHOLD_MS && maxStalenessMs < cacheTTLms) {
      ttlMs = maxStalenessMs;
    }

    const revalidateAfterMs = Math.floor(ttlMs / 2);

    return {
      cache: true,
      ttlMs,
      revalidateAfterMs,
    };
  }
}
