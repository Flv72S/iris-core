/**
 * Disableable — 8.1.2 §6 Kill-switch contract
 *
 * Ogni elemento semantico MUST implementare disable(): void.
 * Effetto: nessun residuo; nessuna decisione parziale; sistema = Fase 7 pura.
 */

/**
 * Contratto: elemento semantico che può essere disattivato.
 * Dopo disable() non deve restare stato residuo; comportamento MUST degradare a Phase 7 pure.
 */
export interface Disableable {
  /** Disattiva l'elemento semantico. Nessun residuo; sistema = Fase 7 pura. */
  disable(): void;
}

export const DISABLEABLE_CONTRACT =
  'Every semantic element MUST implement disable(); after disable, system MUST equal Phase 7 pure.';
