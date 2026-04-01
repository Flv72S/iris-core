/**
 * Privacy Guard — cancellazione immediata (6.2.3)
 *
 * Esegue cancellazione totale dei dati comportamentali (L0, L1).
 * Effetto immediato. Nessun evento di dominio viene toccato.
 */

import type { ClearableForPrivacy } from './ClearableForPrivacy';

export class PrivacyDataClearer {
  constructor(private readonly clearables: readonly ClearableForPrivacy[]) {}

  clearAll(): void {
    try {
      for (const c of this.clearables) {
        c.clearForPrivacy();
      }
    } catch {
      // degradazione: non propagare
    }
  }
}
