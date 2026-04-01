/**
 * UI Copy Dichiarativo
 * 
 * STEP 5.1.5 — Copy minimale e dichiarativo
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md
 * - IRIS_UX_Hardening_STEP4G_v1.0.md
 * 
 * Regole:
 * - Solo copy dichiarativo
 * - Nessun nudging
 * - Nessuna persuasione
 * - Nessun linguaggio emotivo
 */

/**
 * Copy per Thread List View
 */
export const THREAD_LIST_COPY = {
  /**
   * Indicatore di fine lista thread
   * Copy dichiarativo: stato del sistema, non suggerimento
   */
  END_OF_LIST: 'Fine lista thread',
  
  /**
   * Pulsante per caricare più thread
   * Copy dichiarativo: azione esplicita, non suggerimento
   */
  LOAD_MORE: 'Carica più thread',
} as const;

/**
 * Copy per Thread Detail View
 */
export const THREAD_DETAIL_COPY = {
  /**
   * Indicatore di nessun messaggio
   * Copy dichiarativo: stato del sistema, non interpretazione sociale
   */
  NO_MESSAGES: 'Nessun messaggio in questo thread',
  
  /**
   * Pulsante per caricare messaggi precedenti
   * Copy dichiarativo: azione esplicita, non suggerimento
   */
  LOAD_PREVIOUS: 'Carica messaggi precedenti',
  
  /**
   * Indicatore di thread senza titolo
   * Copy dichiarativo: stato del sistema, non suggerimento
   */
  NO_TITLE: 'Thread senza titolo',
} as const;

/**
 * Copy per Message Component
 */
export const MESSAGE_COPY = {
  /**
   * Etichetta mittente
   * Copy dichiarativo: informazione tecnica, non sociale
   */
  SENDER_LABEL: 'Da:',
  
  /**
   * Etichetta stato messaggio
   * Copy dichiarativo: stato tecnico, non emotivo
   */
  STATE_LABEL: 'Stato:',
} as const;

/**
 * Copy per Message Composer
 */
export const COMPOSER_COPY = {
  /**
   * Placeholder input
   * Copy dichiarativo: istruzione tecnica, non persuasione
   */
  INPUT_PLACEHOLDER: 'Scrivi un messaggio...',
  
  /**
   * Pulsante invio
   * Copy dichiarativo: azione tecnica, non urgenza
   */
  SEND_BUTTON: 'Invia',
  
  /**
   * Stato invio in corso
   * Copy dichiarativo: stato tecnico, non attesa performativa
   */
  SENDING: 'Invio in corso...',
  
  /**
   * Errore esplicito
   * Copy dichiarativo: stato del sistema, non suggerimento
   */
  ERROR_LABEL: 'Errore:',
  
  /**
   * Messaggio non partecipante
   * Copy dichiarativo: stato del sistema, non interpretazione sociale
   */
  NOT_PARTICIPANT: 'Non sei un partecipante di questo thread',
  
  /**
   * Messaggio thread chiuso
   * Copy dichiarativo: stato tecnico, non urgenza
   */
  THREAD_CLOSED: (state: string): string => `Thread non aperto. Stato: ${state}`,
} as const;

/**
 * Copy per stati thread
 */
export const THREAD_STATE_COPY = {
  OPEN: 'Aperto',
  PAUSED: 'In pausa',
  CLOSED: 'Chiuso',
  ARCHIVED: 'Archiviato',
} as const;

/**
 * Copy per stati messaggio
 */
export const MESSAGE_STATE_COPY = {
  DRAFT: 'Bozza',
  SENT: 'Inviato',
  DELIVERED: 'Consegnato',
  READ: 'Letto',
  ARCHIVED: 'Archiviato',
  EXPIRED: 'Scaduto',
} as const;

/**
 * Copy per partecipanti
 */
export const PARTICIPANTS_COPY = {
  /**
   * Etichetta partecipanti
   * Copy dichiarativo: informazione tecnica, non sociale
   */
  LABEL: 'Partecipanti:',
} as const;

/**
 * Copy per timestamp
 */
export const TIMESTAMP_COPY = {
  /**
   * Etichetta ultimo evento
   * Copy dichiarativo: informazione tecnica, non urgenza
   */
  LAST_EVENT_LABEL: 'Ultimo evento:',
  
  /**
   * Etichetta conteggio messaggi
   * Copy dichiarativo: informazione tecnica, non importanza
   */
  MESSAGE_COUNT_LABEL: 'Messaggi:',
} as const;

/**
 * Verifica che un copy non contenga pattern vietati
 */
export function validateCopy(copy: string): boolean {
  const forbiddenPatterns = [
    /resta aggiornato/i,
    /nuovi messaggi in arrivo/i,
    /ultima attività/i,
    /in attesa/i,
    /non risponde/i,
    /sta scrivendo/i,
    /online/i,
    /offline/i,
    /last seen/i,
    /continua/i,
    /altri disponibili/i,
    /carica automaticamente/i,
    /importante/i,
    /priorità/i,
    /popolare/i,
    /attivo/i,
    /consigliato/i,
    /suggerito/i,
    /persone che potresti conoscere/i,
    /amici/i,
    /seguaci/i,
    /aggiorna/i,
    /ricarica/i,
    /controlla/i,
    /verifica/i,
    /refresh/i,
    /reload/i,
    /potrebbe/i,
    /forse/i,
    /sembra/i,
    /probabilmente/i,
    /magari/i,
  ];
  
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(copy)) {
      return false;
    }
  }
  
  return true;
}
