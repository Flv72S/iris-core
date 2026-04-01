/**
 * Signal Layer Write Detector — Phase 7.F Boundary Attestation
 *
 * Verifica che nessun componente Phase 7 scriva nel Signal Layer.
 * Deterministico, side-effect free (eccetto registro interno), utilizzabile nei replay.
 */

export type SignalLayerBoundaryResult = {
  readonly writesDetected: number;
  readonly passed: boolean;
};

let writeCount = 0;

/**
 * Chiamato da hook/mock quando si intercetta una scrittura al Signal Layer.
 * Durante Phase 7 nessun codice dovrebbe invocare questa funzione.
 */
export function recordSignalLayerWrite(): void {
  writeCount += 1;
}

/**
 * Restituisce il numero di scritture rilevate e lo azzera (per il prossimo run).
 */
export function consumeSignalLayerWrites(): number {
  const n = writeCount;
  writeCount = 0;
  return n;
}

/**
 * Esegue il check: passed = writesDetected === 0.
 */
export function getSignalLayerBoundaryResult(): SignalLayerBoundaryResult {
  const writesDetected = writeCount;
  return Object.freeze({
    writesDetected,
    passed: writesDetected === 0,
  });
}

/**
 * Reset esplicito prima di un run di attestazione.
 */
export function resetSignalLayerWriteDetector(): void {
  writeCount = 0;
}
