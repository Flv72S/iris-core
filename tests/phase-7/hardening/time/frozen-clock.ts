/**
 * Frozen Clock — Phase 7.V+
 *
 * Clock congelabile: tempo fissato per tutta la durata del test/replay.
 * Riproducibile; nessun accesso a Date reale durante l'esecuzione del test.
 */

import type { TimeProvider } from './deterministic-time-provider';
import { createMutableDeterministicTimeProvider } from './deterministic-time-provider';

const DEFAULT_SEED = '2025-01-15T10:00:00.000Z';

let activeClock: TimeProvider | null = null;

/**
 * Restituisce il TimeProvider attivo per i test. Se non impostato, crea uno default congelato.
 */
export function getFrozenClock(seed?: string): TimeProvider {
  if (activeClock != null) {
    return activeClock;
  }
  const seedToUse = seed ?? DEFAULT_SEED;
  activeClock = createMutableDeterministicTimeProvider(seedToUse);
  return activeClock;
}

/**
 * Imposta il clock attivo (per test che devono usare un provider specifico).
 */
export function setFrozenClock(provider: TimeProvider | null): void {
  activeClock = provider;
}

/**
 * Congela il tempo: il clock restituirà sempre lo stesso now() fino al prossimo unfreeze/advance.
 */
export function freezeClock(seed: string = DEFAULT_SEED): TimeProvider {
  const mutable = createMutableDeterministicTimeProvider(seed);
  mutable.setOffsetMs(0);
  activeClock = mutable;
  return activeClock;
}

/**
 * Avanza il clock di N ms (solo se il provider è MutableTimeProvider).
 */
export function advanceClock(ms: number): void {
  if (activeClock != null && 'addOffsetMs' in activeClock) {
    (activeClock as { addOffsetMs: (n: number) => void }).addOffsetMs(ms);
  }
}

/**
 * Resetta il clock (per tearDown). I test non devono dipendere da Date.now() reale.
 */
export function resetFrozenClock(): void {
  activeClock = null;
}

/**
 * Restituisce now in ms per uso con ExecutionContext/executeFromResolution.
 */
export function frozenNowMs(seed?: string): number {
  const clock = getFrozenClock(seed);
  const iso = clock.now();
  return new Date(iso).getTime();
}
