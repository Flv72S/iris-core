/**
 * Projection Write Target — strategia di scrittura per versioni
 * Microstep 5.1.2 — Read Model Versioning
 *
 * La projection decide quali versioni di read model aggiornare.
 * Nessuna logica HTTP. Policy esplicita.
 */

import type { ReadModelVersionId } from './ReadModelVersionResolver';

/**
 * Target di scrittura per la projection.
 * - WRITE_V1_ONLY: aggiorna solo v1
 * - WRITE_ALL: aggiorna v1 e v2
 */
export type ProjectionWriteTarget = 'WRITE_V1_ONLY' | 'WRITE_ALL';

/**
 * Restituisce le versioni da aggiornare per un dato target.
 */
export function getVersionsToWrite(target: ProjectionWriteTarget): ReadModelVersionId[] {
  switch (target) {
    case 'WRITE_V1_ONLY':
      return ['v1'];
    case 'WRITE_ALL':
      return ['v1', 'v2'];
    default:
      return ['v1'];
  }
}
