/**
 * Mock Data — Messages
 * 
 * STEP 5.2 — Mock deterministici per messaggi
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md
 * - IRIS_STEP5.2_Data_Connection_Map_v1.0.md
 * 
 * Regole:
 * - Dati finiti
 * - Nessun random
 * - Nessuna simulazione realtime
 * - Nessun incremento automatico
 * - Timestamp già arrotondati
 * - ThreadId obbligatorio
 */

import type { BackendMessage } from '../ui/adapters/messageAdapter';

/**
 * Mock messages per thread-1
 * 
 * Dati deterministici, finiti, non comportamentali.
 */
export const MOCK_MESSAGES_THREAD_1: readonly BackendMessage[] = [
  {
    id: 'msg-1',
    threadId: 'thread-1',
    senderAlias: 'user-alice',
    payload: 'Primo messaggio di esempio',
    state: 'READ',
    createdAt: 1706111950000, // Timestamp arrotondato (bucket 5 secondi)
  },
  {
    id: 'msg-2',
    threadId: 'thread-1',
    senderAlias: 'user-bob',
    payload: 'Secondo messaggio di esempio',
    state: 'READ',
    createdAt: 1706111960000, // Timestamp arrotondato (bucket 5 secondi)
  },
  {
    id: 'msg-3',
    threadId: 'thread-1',
    senderAlias: 'user-alice',
    payload: 'Terzo messaggio di esempio',
    state: 'DELIVERED',
    createdAt: 1706111970000, // Timestamp arrotondato (bucket 5 secondi)
  },
] as const;

/**
 * Mock messages vuoto (per test)
 * 
 * Dati deterministici, finiti, non comportamentali.
 */
export const MOCK_MESSAGES_EMPTY: readonly BackendMessage[] = [] as const;
