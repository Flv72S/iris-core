/**
 * Signal Layer Write Detector — Phase 7.V+ Phase Boundary
 *
 * Verifica che durante Phase 7 non vi siano scritture su Signal Layer.
 * Se rilevato → test fallisce (IRIS non deve entrare in Phase 8).
 */

export type SignalLayerWriteViolation = {
  readonly kind: 'signal_layer_write';
  readonly detail: string;
};

const violations: SignalLayerWriteViolation[] = [];

/**
 * Registra una violazione (da chiamare da hook/mock se si intercetta una write al signal layer).
 */
export function recordSignalLayerWrite(detail: string): void {
  violations.push({ kind: 'signal_layer_write', detail });
}

/**
 * Restituisce le violazioni e svuota il buffer.
 */
export function consumeSignalLayerWriteViolations(): readonly SignalLayerWriteViolation[] {
  const out = [...violations];
  violations.length = 0;
  return out;
}

/**
 * Verifica che non siano state registrate scritture al signal layer.
 */
export function assertNoSignalLayerWrites(): {
  ok: boolean;
  violations: readonly SignalLayerWriteViolation[];
} {
  const v = consumeSignalLayerWriteViolations();
  return { ok: v.length === 0, violations: v };
}
