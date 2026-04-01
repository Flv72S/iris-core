/**
 * Behavioral Snapshot Level 0 — tipi di lettura (6.2.1)
 *
 * Forme dati whitelist L0: solo numeri, timestamp, tipo chat.
 * Usati dal Livello 1 come input; nessuna dipendenza inversa.
 */

/** Tipo chat ammesso (1-to-1 o gruppo). Nessuna semantica aggiuntiva. */
export type ChatTypeL0 = '1-to-1' | 'gruppo';

/** Snapshot L0 per thread/chat. Solo dati ammessi dalla spec 6.2.1. */
export interface ThreadSnapshotL0 {
  readonly messageCount: number;
  readonly avgMessageLength: number;
  readonly lastMessageTimestamp: number;
  readonly rawFrequency: number;
  readonly chatType: ChatTypeL0;
}

/** Snapshot L0 per utente. Solo dati ammessi dalla spec 6.2.1. */
export interface UserSnapshotL0 {
  readonly messageCount: number;
  readonly lastActivityTimestamp: number;
  readonly bucketCounts: readonly number[];
  readonly activeThreadCount: number;
}
