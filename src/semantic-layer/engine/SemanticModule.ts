/**
 * SemanticModule — 8.2.0
 * Interfaccia per futuri moduli semantici. Usa SOLO primitive 8.1.2; MUST be Disableable.
 * Skeleton: nessuna logica decisionale; i moduli futuri implementeranno evaluate().
 */

import type { Disableable } from '../vocabulary';
import type { SemanticInput } from './SemanticInput';
import type { SemanticOverlay } from '../contracts';

/**
 * Contratto per un modulo semantico. MUST use only 8.1.2 vocabulary; MUST be Disableable.
 * evaluate() returns overlay or null; in skeleton no module applies semantics.
 */
export interface SemanticModule extends Disableable {
  /**
   * Valuta l'input e restituisce un overlay opzionale o null.
   * Quando il modulo è disattivato o non applica semantica, MUST return null.
   */
  evaluate(input: SemanticInput): SemanticOverlay<unknown, unknown> | null;
}
