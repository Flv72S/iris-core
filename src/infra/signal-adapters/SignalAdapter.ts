/**
 * SignalAdapter — Lettura read-only di eventi da sorgente esterna.
 * read() idempotente, side-effect free, non muta stato interno.
 * Ritorna eventi già accaduti, non stream.
 */

import type { SignalEvent } from './SignalEvent';

export interface SignalAdapter {
  readonly id: string;
  read(): Promise<readonly SignalEvent[]>;
}
