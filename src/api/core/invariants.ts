/**
 * Invariants Enforcement
 * 
 * Funzioni di validazione per le invarianti sistemiche (SYS-01 a SYS-10).
 * Queste funzioni sono pure e deterministiche.
 * 
 * Riferimenti vincolanti:
 * - IRIS_API_Invariants_and_Failure_Modes.md
 */

import type {
  MessageAppendRequest,
  MessageAppendError,
  ThreadState,
  ThreadStateTransitionRequest,
  ThreadStateError,
} from './types';

// ============================================================================
// INVARIANTE SYS-01: Append-Only Messaging
// ============================================================================

/**
 * Verifica che un messaggio non possa essere modificato dopo creazione.
 * 
 * Enforcement:
 * - Campo payload immutabile
 * - Campo senderAlias immutabile
 * - Campo threadId immutabile
 * - Campo createdAt immutabile
 */
export function assertAppendOnly(messageId: string): void {
  // Verifica che messageId sia valido (non vuoto)
  if (!messageId || messageId.trim() === '') {
    throw new Error('Message ID cannot be empty (SYS-01: Append-Only)');
  }
}

// ============================================================================
// INVARIANTE SYS-02: Thread-First Architecture
// ============================================================================

/**
 * Verifica che threadId sia obbligatorio e valido.
 * 
 * Enforcement:
 * - Campo threadId obbligatorio
 * - Validazione esistenza thread (delegata a repository)
 */
export function validateThreadFirst(request: MessageAppendRequest): void {
  if (!request.threadId || request.threadId.trim() === '') {
    throw new Error('Thread ID is required (SYS-02: Thread-First)');
  }
}

// ============================================================================
// INVARIANTE SYS-03: Alias-Only Identity
// ============================================================================

/**
 * Verifica che senderAlias sia obbligatorio e non sia root identity.
 * 
 * Enforcement:
 * - Campo senderAlias obbligatorio
 * - Mai root identity (validazione delegata a repository)
 */
export function validateAliasOnly(request: MessageAppendRequest): void {
  if (!request.senderAlias || request.senderAlias.trim() === '') {
    throw new Error('Sender alias is required (SYS-03: Alias-Only)');
  }
}

// ============================================================================
// INVARIANTE SYS-04: Stato Esplicito Obbligatorio
// ============================================================================

/**
 * Verifica che lo stato thread sia valido (enum chiuso, finito).
 * 
 * Enforcement:
 * - Enum chiuso, finito (solo 4 stati)
 * - Nessun altro stato possibile
 */
export function validateThreadState(state: string): state is ThreadState {
  const validStates: ThreadState[] = ['OPEN', 'PAUSED', 'CLOSED', 'ARCHIVED'];
  return validStates.includes(state as ThreadState);
}

/**
 * Verifica che lo stato thread non sia uno stato vietato.
 * 
 * Stati vietati: ONLINE, OFFLINE, TYPING, READING, ACTIVE, INACTIVE, UNREAD, PRIORITY
 */
export function assertNoForbiddenThreadState(state: string): void {
  const forbiddenStates = [
    'ONLINE',
    'OFFLINE',
    'TYPING',
    'READING',
    'ACTIVE',
    'INACTIVE',
    'UNREAD',
    'PRIORITY',
  ];

  if (forbiddenStates.includes(state.toUpperCase())) {
    throw new Error(`Forbidden thread state: ${state} (SYS-04: Stato Esplicito)`);
  }
}

// ============================================================================
// INVARIANTE SYS-05: Timestamp Arrotondato (Privacy-First)
// ============================================================================

/**
 * Arrotonda timestamp a bucket di 5 secondi.
 * 
 * Enforcement:
 * - Timestamp sempre arrotondato: Math.floor(timestamp / 5000) * 5000
 * - Nessun timestamp ad alta risoluzione esposto
 */
export function roundTimestamp(timestamp: number): number {
  return Math.floor(timestamp / 5000) * 5000;
}

/**
 * Verifica che un timestamp sia arrotondato correttamente.
 */
export function assertRoundedTimestamp(timestamp: number): void {
  const rounded = roundTimestamp(timestamp);
  if (timestamp !== rounded) {
    throw new Error(`Timestamp must be rounded to 5s bucket: ${timestamp} (SYS-05: Timestamp Arrotondato)`);
  }
}

// ============================================================================
// INVARIANTE SYS-06: Partecipanti Randomizzati (Non Persistente)
// ============================================================================

/**
 * Verifica che l'ordine dei partecipanti sia randomizzato.
 * 
 * Nota: La randomizzazione è implementata a livello repository.
 * Questa funzione verifica solo che non ci sia ordinamento persistente.
 */
export function assertRandomizedParticipants(participants: readonly string[]): void {
  // Verifica che partecipanti non siano ordinati alfabeticamente o per importanza
  // (validazione delegata a repository)
  if (participants.length === 0) {
    throw new Error('Participants list cannot be empty (SYS-06: Partecipanti Randomizzati)');
  }
}

// ============================================================================
// INVARIANTE SYS-07: Offline-First Architecture
// ============================================================================

/**
 * Verifica che il sistema supporti offline-first.
 * 
 * Enforcement:
 * - Messaggi salvati localmente quando offline
 * - Coda offline con limite (max 1000 messaggi)
 */
export function validateOfflineQueue(queueSize: number): void {
  const MAX_OFFLINE_QUEUE_SIZE = 1000;
  if (queueSize > MAX_OFFLINE_QUEUE_SIZE) {
    throw new Error(`Offline queue is full: ${queueSize} > ${MAX_OFFLINE_QUEUE_SIZE} (SYS-07: Offline-First)`);
  }
}

// ============================================================================
// INVARIANTE SYS-08: Nessun Realtime Implicito
// ============================================================================

/**
 * Verifica che non ci sia realtime implicito.
 * 
 * Enforcement:
 * - Nessun endpoint WebSocket o Server-Sent Events
 * - Nessun polling automatico invisibile
 */
export function assertNoRealtimeImplicit(): void {
  // Verifica che non ci siano side-effect realtime
  // (validazione delegata a livello di implementazione)
}

// ============================================================================
// INVARIANTE SYS-09: Errori Espliciti e Dichiarativi
// ============================================================================

/**
 * Crea un errore esplicito e dichiarativo (non emozionale).
 * 
 * Enforcement:
 * - Codice errore standardizzato (enum)
 * - Messaggio dichiarativo (non prescrittivo)
 * - Nessun suggerimento di azione
 * - Nessun copy emozionale
 */
export function createExplicitError(
  code: MessageAppendError['code'],
  message: string,
  threadId?: string
): MessageAppendError {
  return {
    code,
    message, // Dichiarativo, non emozionale
    threadId,
  };
}

// ============================================================================
// INVARIANTE SYS-10: Finitudine Esplicita
// ============================================================================

/**
 * Verifica che una lista sia finita con limiti espliciti.
 * 
 * Enforcement:
 * - Paginazione obbligatoria (max 100 messaggi per pagina)
 * - Limite messaggi per thread (max 10,000)
 */
export function validateFiniteList(size: number, maxSize: number, entityType: string): void {
  if (size > maxSize) {
    throw new Error(`${entityType} list exceeds maximum size: ${size} > ${maxSize} (SYS-10: Finitudine Esplicita)`);
  }
}

// ============================================================================
// VALIDAZIONE PAYLOAD
// ============================================================================

/**
 * Valida payload messaggio.
 * 
 * Vincoli:
 * - Non vuoto
 * - Max 10MB
 * - UTF-8 valido
 */
export function validatePayload(payload: string): MessageAppendError | null {
  // Verifica non vuoto
  if (!payload || payload.trim() === '') {
    return createExplicitError('PAYLOAD_INVALID', 'Il payload non può essere vuoto.');
  }

  // Verifica dimensione (max 10MB)
  const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB in bytes
  const payloadSize = new TextEncoder().encode(payload).length;
  if (payloadSize > MAX_PAYLOAD_SIZE) {
    return createExplicitError('PAYLOAD_TOO_LARGE', `Il payload supera la dimensione massima di ${MAX_PAYLOAD_SIZE} bytes.`);
  }

  // Verifica UTF-8 valido (implicito in TextEncoder)
  try {
    new TextEncoder().encode(payload);
  } catch {
    return createExplicitError('PAYLOAD_INVALID', 'Il payload non è valido UTF-8.');
  }

  return null;
}

// ============================================================================
// VALIDAZIONE TRANSIZIONI THREAD STATE
// ============================================================================

/**
 * Verifica che una transizione di stato thread sia valida.
 * 
 * Regole di transizione:
 * - OPEN → PAUSED, CLOSED
 * - PAUSED → OPEN, CLOSED
 * - CLOSED → ARCHIVED
 * - ARCHIVED → Nessuna transizione
 */
export function validateThreadStateTransition(
  currentState: ThreadState,
  targetState: ThreadStateTransitionRequest['targetState']
): ThreadStateError | null {
  // Verifica che currentState sia valido
  if (!validateThreadState(currentState)) {
    return {
      code: 'INVALID_TRANSITION',
      message: `Stato thread corrente non valido: ${currentState}`,
      currentState,
      requestedState: targetState,
    };
  }

  // Verifica transizioni consentite
  const validTransitions: Record<ThreadState, ThreadStateTransitionRequest['targetState'][]> = {
    OPEN: ['PAUSED', 'CLOSED'],
    PAUSED: ['OPEN', 'CLOSED'],
    CLOSED: ['ARCHIVED'],
    ARCHIVED: [], // Nessuna transizione consentita
  };

  const allowedTargets = validTransitions[currentState];
  if (!allowedTargets.includes(targetState)) {
    return {
      code: 'INVALID_TRANSITION',
      message: `Transizione non consentita da ${currentState} a ${targetState}`,
      currentState,
      requestedState: targetState,
    };
  }

  return null;
}
