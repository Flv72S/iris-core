/**
 * Thread State Core Logic
 * 
 * Implementazione contract-driven per Thread State.
 * 
 * Vincoli:
 * - 100% contract-driven
 * - Deterministicamente testabile
 * - Privo di side-effect impliciti
 * - Coerente con invarianti SYS-04, SYS-05
 * 
 * Riferimenti vincolanti:
 * - IRIS_API_Contracts_Freeze_STEP5.3_v1.0.md §2
 * - IRIS_API_Invariants_and_Failure_Modes.md
 */

import type {
  ThreadState,
  ThreadStateResponse,
  ThreadStateTransitionRequest,
  ThreadStateTransitionResponse,
  ThreadStateError,
  InternalThread,
} from './types';
import {
  validateThreadState,
  assertNoForbiddenThreadState,
  roundTimestamp,
  validateThreadStateTransition,
} from './invariants';

// ============================================================================
// TIPI PER REPOSITORY (astrazione per persistenza)
// ============================================================================

/**
 * Repository per thread (astrazione)
 * 
 * Nota: L'implementazione concreta sarà fornita a livello di integrazione.
 */
export interface ThreadRepository {
  exists(threadId: string): Promise<boolean>;
  get(threadId: string): Promise<InternalThread | null>;
  updateState(threadId: string, newState: ThreadState, transitionedAt: number): Promise<void>;
}

// ============================================================================
// FUNZIONI CORE
// ============================================================================

/**
 * Ottiene stato thread.
 * 
 * Vincoli (Invarianti SYS-04, SYS-05):
 * - state enum chiuso, finito
 * - lastStateChangeAt arrotondato
 * - canAcceptMessages derivato esplicito (state === 'OPEN')
 */
export async function getThreadState(
  threadId: string,
  threadRepo: ThreadRepository
): Promise<ThreadStateResponse | ThreadStateError> {
  // Verifica esistenza thread
  const exists = await threadRepo.exists(threadId);
  if (!exists) {
    return {
      code: 'THREAD_NOT_FOUND',
      message: 'Il thread non è stato trovato.',
      threadId,
    };
  }

  // Ottiene thread
  const thread = await threadRepo.get(threadId);
  if (!thread) {
    return {
      code: 'THREAD_NOT_FOUND',
      message: 'Il thread non è stato trovato.',
      threadId,
    };
  }

  // Verifica stato valido
  if (!validateThreadState(thread.state)) {
    return {
      code: 'INVALID_TRANSITION',
      message: `Stato thread non valido: ${thread.state}`,
      threadId,
      currentState: thread.state,
    };
  }

  // Verifica che stato non sia vietato
  try {
    assertNoForbiddenThreadState(thread.state);
  } catch (error) {
    return {
      code: 'INVALID_TRANSITION',
      message: error instanceof Error ? error.message : 'Stato thread non valido.',
      threadId,
      currentState: thread.state,
    };
  }

  // Restituisce response
  return {
    threadId: thread.threadId,
    state: thread.state,
    lastStateChangeAt: thread.lastStateChangeAt,
    canAcceptMessages: thread.state === 'OPEN', // Derivato esplicito
  };
}

/**
 * Esegue transizione stato thread.
 * 
 * Vincoli:
 * - Transizioni solo forward (non retroattive)
 * - Transizioni solo tra stati adiacenti
 * - Transizioni immutabili
 * - Nessun fallback silenzioso
 * 
 * @returns Response o Error (mai null)
 */
export async function transitionThreadState(
  request: ThreadStateTransitionRequest,
  threadRepo: ThreadRepository
): Promise<ThreadStateTransitionResponse | ThreadStateError> {
  // Verifica esistenza thread
  const exists = await threadRepo.exists(request.threadId);
  if (!exists) {
    return {
      code: 'THREAD_NOT_FOUND',
      message: 'Il thread non è stato trovato.',
      threadId: request.threadId,
    };
  }

  // Ottiene thread corrente
  const thread = await threadRepo.get(request.threadId);
  if (!thread) {
    return {
      code: 'THREAD_NOT_FOUND',
      message: 'Il thread non è stato trovato.',
      threadId: request.threadId,
    };
  }

  // Verifica che thread non sia già ARCHIVED
  if (thread.state === 'ARCHIVED') {
    return {
      code: 'THREAD_ALREADY_ARCHIVED',
      message: 'Il thread è già archiviato. Nessuna transizione consentita.',
      threadId: request.threadId,
      currentState: thread.state,
      requestedState: request.targetState,
    };
  }

  // Verifica transizione valida
  const transitionError = validateThreadStateTransition(thread.state, request.targetState);
  if (transitionError) {
    return transitionError;
  }

  // Verifica che reason non superi 500 caratteri (se fornito)
  if (request.reason && request.reason.length > 500) {
    return {
      code: 'INVALID_TRANSITION',
      message: 'Il motivo della transizione non può superare 500 caratteri.',
      threadId: request.threadId,
      currentState: thread.state,
      requestedState: request.targetState,
    };
  }

  // Calcola timestamp transizione (arrotondato)
  const now = Date.now();
  const transitionedAt = roundTimestamp(now); // Invariante SYS-05

  // Aggiorna stato thread
  await threadRepo.updateState(request.threadId, request.targetState, transitionedAt);

  // Restituisce response
  return {
    threadId: request.threadId,
    previousState: thread.state as 'OPEN' | 'PAUSED' | 'CLOSED',
    newState: request.targetState,
    transitionedAt,
  };
}
