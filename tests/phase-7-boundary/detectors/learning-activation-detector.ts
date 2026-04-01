/**
 * Learning Activation Detector — Phase 7.F Boundary Attestation
 *
 * Certifica che nessun modulo di Learning venga inizializzato o chiamato durante Phase 7.
 * Deterministico, side-effect free.
 */

export type LearningBoundaryResult = {
  readonly activations: number;
  readonly passed: boolean;
};

let activationCount = 0;

/**
 * Chiamato da hook quando si intercetta import/istanza di moduli learning
 * o emissione di eventi di apprendimento.
 */
export function recordLearningActivation(): void {
  activationCount += 1;
}

/**
 * Restituisce il numero di attivazioni e lo azzera (per il prossimo run).
 */
export function consumeLearningActivations(): number {
  const n = activationCount;
  activationCount = 0;
  return n;
}

/**
 * Esegue il check: passed = activations === 0.
 */
export function getLearningBoundaryResult(): LearningBoundaryResult {
  const activations = activationCount;
  return Object.freeze({
    activations,
    passed: activations === 0,
  });
}

/**
 * Reset esplicito prima di un run di attestazione.
 */
export function resetLearningActivationDetector(): void {
  activationCount = 0;
}
