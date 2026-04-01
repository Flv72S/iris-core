/**
 * Hook Passivo — useThreadMessages
 * 
 * STEP 5.2 — Hook per collegare dati messaggi alla UI
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md
 * - IRIS_STEP5.2_Data_Connection_Map_v1.0.md
 * 
 * Vincoli:
 * - Nessun polling
 * - Nessun retry
 * - Nessuna inferenza
 * - Nessuna trasformazione semantica
 * - Solo restituzione dati o errori dichiarati
 */

import type { MessageView } from '../types';
import { adaptMessageList } from '../adapters/messageAdapter';
import { MOCK_MESSAGES_THREAD_1, MOCK_MESSAGES_EMPTY } from '../../mocks/messages.mock';

/**
 * Stato di errore dichiarato
 */
export interface MessagesError {
  readonly type: 'LOAD_ERROR' | 'VALIDATION_ERROR' | 'THREAD_NOT_FOUND';
  readonly message: string;
}

/**
 * Risultato hook useThreadMessages
 */
export interface UseThreadMessagesResult {
  readonly messages: readonly MessageView[];
  readonly isLoading: boolean;
  readonly error: MessagesError | null;
  readonly hasMore: boolean;
}

/**
 * Hook passivo per ottenere messaggi di un thread
 * 
 * Restituisce solo dati o errori dichiarati.
 * Nessuna logica, nessuna inferenza, nessun side effect.
 */
export function useThreadMessages(threadId: string): UseThreadMessagesResult {
  // Restituisce direttamente dati mock basati su threadId (meccanico, non comportamentale)
  // In produzione, questo verrebbe sostituito con dati backend già disponibili
  try {
    // Selezione meccanica basata su threadId, non inferenza
    const backendData = threadId === 'thread-1' ? MOCK_MESSAGES_THREAD_1 : MOCK_MESSAGES_EMPTY;
    const adapted = adaptMessageList(backendData);
    
    return {
      messages: adapted,
      isLoading: false,
      error: null,
      hasMore: false, // Mock finito, nessun altro dato disponibile
    };
  } catch (err) {
    return {
      messages: [],
      isLoading: false,
      error: {
        type: 'LOAD_ERROR',
        message: err instanceof Error ? err.message : 'Errore caricamento messaggi',
      },
      hasMore: false,
    };
  }
}
