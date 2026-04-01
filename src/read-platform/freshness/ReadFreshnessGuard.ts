/**
 * Read Freshness Guard — VALUTATORE PURO (non enforcement)
 * Valuta se un dato read-side è sufficientemente fresco rispetto a ReadSLA.
 * Nessun side-effect, nessun blocco, nessuna eccezione.
 */

import type { ReadSLA } from '../../core/read-sla';
import type { ReadFreshnessResult } from './ReadFreshness';

export class ReadFreshnessGuard {
  /**
   * Valuta la freshness di un dato.
   * @param lastUpdatedAt - timestamp (ms) dell'ultimo aggiornamento
   * @param sla - ReadSLA con maxStalenessMs
   * @param now - timestamp corrente (default: Date.now())
   * @returns ReadFreshnessResult dichiarativo
   */
  evaluate(
    lastUpdatedAt?: number,
    sla?: ReadSLA,
    now: number = Date.now()
  ): ReadFreshnessResult {
    // Se lastUpdatedAt assente → unknown
    if (lastUpdatedAt === undefined) {
      return { status: 'unknown' };
    }

    // Se sla o maxStalenessMs assente → unknown
    if (sla?.maxStalenessMs === undefined) {
      return { status: 'unknown' };
    }

    // Calcolare ageMs
    const ageMs = now - lastUpdatedAt;
    const maxStalenessMs = sla.maxStalenessMs;

    // Valutare status
    const status = ageMs <= maxStalenessMs ? 'fresh' : 'stale';

    return { status, ageMs, maxStalenessMs };
  }
}
