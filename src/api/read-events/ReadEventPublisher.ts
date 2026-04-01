/**
 * Read Event Publisher — PORTA (write-side)
 * Contratto per la pubblicazione di Read Events dopo il commit.
 * Nessuna implementazione; nessuna conoscenza di projection/read store.
 */

import type { ThreadReadEvent, MessageReadEvent } from '../../core/read-events';

/** Unione di tutti i Read Events pubblicabili */
export type ReadEvent = ThreadReadEvent | MessageReadEvent;

/** Porta: pubblica un Read Event. Non deve mai lanciare verso il chiamante. */
export interface ReadEventPublisher {
  publish(event: ReadEvent): Promise<void>;
}
