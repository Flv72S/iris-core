/**
 * Side-Effect Detector — Phase 7.V+
 *
 * Verifica assenza di: scritture globali, mutazioni non audit-loggate, accessi IO non previsti.
 */

export type SideEffectViolation = {
  readonly kind: 'global_write' | 'unlogged_mutation' | 'unexpected_io';
  readonly detail: string;
};

const violations: SideEffectViolation[] = [];

/**
 * Registra una violazione rilevata (da chiamare dai detector o da hook).
 */
export function recordSideEffectViolation(violation: SideEffectViolation): void {
  violations.push(violation);
}

/**
 * Restituisce le violazioni registrate e svuota il buffer (per il prossimo test).
 */
export function consumeSideEffectViolations(): readonly SideEffectViolation[] {
  const out = [...violations];
  violations.length = 0;
  return out;
}

/**
 * Verifica che non siano state registrate violazioni.
 */
export function assertNoSideEffectViolations(): { ok: boolean; violations: readonly SideEffectViolation[] } {
  const v = consumeSideEffectViolations();
  return { ok: v.length === 0, violations: v };
}

/**
 * Snapshot di "stato globale" prima di un'operazione (per confronto dopo).
 * In Phase 7 i test non devono mutare oggetti globali condivisi oltre ai log di audit previsti.
 */
export type GlobalSnapshot = {
  readonly timestamp: number;
  readonly description: string;
};

/**
 * Crea uno snapshot descrittivo (per documentazione; il confronto effettivo
 * è fatto verificando che solo gli store di audit siano stati modificati).
 */
export function createGlobalSnapshot(description: string): GlobalSnapshot {
  return {
    timestamp: Date.now(),
    description,
  };
}

/**
 * Hook placeholder: nei test si può sostituire Date.now per rilevare accessi a tempo reale.
 * Se usato con FrozenClock, nessun test dovrebbe chiamare Date.now() direttamente.
 */
let dateNowOverride: (() => number) | null = null;

export function setDateNowOverride(fn: () => number): void {
  dateNowOverride = fn;
}

export function clearDateNowOverride(): void {
  dateNowOverride = null;
}

export function getDateNowForTest(): number {
  if (dateNowOverride != null) return dateNowOverride();
  return Date.now();
}
