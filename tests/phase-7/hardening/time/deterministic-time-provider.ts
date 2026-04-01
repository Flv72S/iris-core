/**
 * Deterministic Time Provider — Phase 7.V+
 *
 * Unica fonte temporale replayabile per i test. Nessun accesso a Date.now() reale.
 * Tempo congelabile, seed deterministico, riproducibile nei replay.
 */

/** Fonte temporale per test: now() restituisce stringa ISO deterministica. */
export interface TimeProvider {
  /** Timestamp corrente in formato ISO (es. "2025-01-15T10:00:00.000Z"). */
  now(): string;
}

/** Seed per inizializzare il clock (es. "2025-01-15T10:00:00.000Z" o numero ms). */
export type TimeSeed = string | number;

/**
 * Crea un TimeProvider deterministico da seed.
 */
export function createDeterministicTimeProvider(seed: TimeSeed): TimeProvider {
  const baseMs = typeof seed === 'string' ? new Date(seed).getTime() : seed;
  let offsetMs = 0;

  return {
    now(): string {
      return new Date(baseMs + offsetMs).toISOString();
    },
  };
}

/** TimeProvider con offset modificabile (per FrozenClock). */
export interface MutableTimeProvider extends TimeProvider {
  setOffsetMs(ms: number): void;
  /** Aggiunge ms all'offset corrente. */
  addOffsetMs(ms: number): void;
  nowMs(): number;
}

export function createMutableDeterministicTimeProvider(seed: TimeSeed): MutableTimeProvider {
  const baseMs = typeof seed === 'string' ? new Date(seed).getTime() : seed;
  let offsetMs = 0;

  return {
    now(): string {
      return new Date(baseMs + offsetMs).toISOString();
    },
    setOffsetMs(ms: number): void {
      offsetMs = ms;
    },
    addOffsetMs(ms: number): void {
      offsetMs += ms;
    },
    nowMs(): number {
      return baseMs + offsetMs;
    },
  };
}
