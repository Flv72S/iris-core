/**
 * UI Messaging Types
 * 
 * Tipi per la UI del Messaging Core IRIS.
 * Questi tipi sono proiezioni passive dello stato backend.
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Messaging_Implementation_STEP4E_v1.0.md
 * - IRIS_Messaging_Core_Architecture_Freeze_STEP4A_v1.0.md
 * 
 * Vincoli:
 * - Nessun campo derivato
 * - Nessun timestamp raw ad alta precisione
 * - Tutti i tipi espliciti
 */

/**
 * Thread State
 * Stati possibili di un thread
 */
export type ThreadState = 'OPEN' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';

/**
 * Message State
 * Stati possibili di un messaggio
 */
export type MessageState = 'DRAFT' | 'SENT' | 'DELIVERED' | 'READ' | 'ARCHIVED' | 'EXPIRED';

/**
 * Thread Summary
 * Riepilogo thread per la lista thread
 * 
 * Vincoli:
 * - Partecipanti già randomizzati (non persistente)
 * - Timestamp già arrotondato (bucket 5 secondi)
 * - Nessun campo derivato
 */
export interface ThreadSummary {
  readonly id: string;
  readonly title: string | null;
  readonly participants: readonly string[]; // Ordine randomizzato (non persistente)
  readonly state: ThreadState;
  readonly lastEventAt: number; // Timestamp arrotondato (bucket 5 secondi, millisecondi)
  readonly messageCount: number; // Conteggio esplicito (non derivato)
}

/**
 * Thread
 * Thread completo per la vista dettaglio
 * 
 * Vincoli:
 * - Partecipanti già randomizzati (non persistente)
 * - Timestamp già arrotondato (bucket 5 secondi)
 * - Nessun campo derivato
 */
export interface Thread {
  readonly id: string;
  readonly title: string | null;
  readonly communityId: string | null;
  readonly participants: readonly string[]; // Ordine randomizzato (non persistente)
  readonly state: ThreadState;
  readonly createdAt: number; // Timestamp arrotondato (bucket 5 secondi, millisecondi)
  readonly lastEventAt: number; // Timestamp arrotondato (bucket 5 secondi, millisecondi)
}

/**
 * Message View
 * Vista messaggio per la UI
 * 
 * Vincoli:
 * - ThreadId obbligatorio
 * - Timestamp già arrotondato (bucket 5 secondi)
 * - Stato esplicito
 * - Nessun campo derivato
 */
export interface MessageView {
  readonly id: string;
  readonly threadId: string; // Obbligatorio (thread-first)
  readonly senderAlias: string;
  readonly payload: string;
  readonly state: MessageState;
  readonly createdAt: number; // Timestamp arrotondato (bucket 5 secondi, millisecondi)
}
