/**
 * Hook Passivo — useThreads
 * 
 * STEP 5.2 — Hook per collegare dati thread alla UI
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

import type { ThreadSummary } from '../types';
import { adaptThreadSummaryList } from '../adapters/threadAdapter';
import { MOCK_THREAD_SUMMARIES } from '../../mocks/threads.mock';

/**
 * Stato di errore dichiarato
 */
export interface ThreadsError {
  readonly type: 'LOAD_ERROR' | 'VALIDATION_ERROR';
  readonly message: string;
}

/**
 * Risultato hook useThreads
 */
export interface UseThreadsResult {
  readonly threads: readonly ThreadSummary[];
  readonly isLoading: boolean;
  readonly error: ThreadsError | null;
  readonly hasMore: boolean;
}

/**
 * Hook passivo per ottenere lista thread
 * 
 * Restituisce solo dati o errori dichiarati.
 * Nessuna logica, nessuna inferenza, nessun side effect.
 */
export function useThreads(): UseThreadsResult {
  // Restituisce direttamente dati mock (meccanico, non comportamentale)
  // In produzione, questo verrebbe sostituito con dati backend già disponibili
  try {
    const adapted = adaptThreadSummaryList(MOCK_THREAD_SUMMARIES);
    
    return {
      threads: adapted,
      isLoading: false,
      error: null,
      hasMore: false, // Mock finito, nessun altro dato disponibile
    };
  } catch (err) {
    return {
      threads: [],
      isLoading: false,
      error: {
        type: 'LOAD_ERROR',
        message: err instanceof Error ? err.message : 'Errore caricamento thread',
      },
      hasMore: false,
    };
  }
}
