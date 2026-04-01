/**
 * Mock Data — Threads
 * 
 * STEP 5.2 — Mock deterministici per thread
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
 * - Partecipanti già randomizzati
 */

import type { BackendThreadSummary, BackendThread } from '../ui/adapters/threadAdapter';

/**
 * Mock thread summaries
 * 
 * Dati deterministici, finiti, non comportamentali.
 */
export const MOCK_THREAD_SUMMARIES: readonly BackendThreadSummary[] = [
  {
    id: 'thread-1',
    title: 'Thread di esempio 1',
    participants: ['user-alice', 'user-bob'],
    state: 'OPEN',
    lastEventAt: 1706112000000, // Timestamp arrotondato (bucket 5 secondi)
    messageCount: 5,
  },
  {
    id: 'thread-2',
    title: 'Thread di esempio 2',
    participants: ['user-charlie', 'user-diana'],
    state: 'PAUSED',
    lastEventAt: 1706112005000, // Timestamp arrotondato (bucket 5 secondi)
    messageCount: 3,
  },
  {
    id: 'thread-3',
    title: null,
    participants: ['user-eve'],
    state: 'CLOSED',
    lastEventAt: 1706112010000, // Timestamp arrotondato (bucket 5 secondi)
    messageCount: 1,
  },
] as const;

/**
 * Mock thread completo
 * 
 * Dati deterministici, finiti, non comportamentali.
 */
export const MOCK_THREAD: BackendThread = {
  id: 'thread-1',
  title: 'Thread di esempio 1',
  communityId: 'community-1',
  participants: ['user-alice', 'user-bob'],
  state: 'OPEN',
  createdAt: 1706111950000, // Timestamp arrotondato (bucket 5 secondi)
  lastEventAt: 1706112000000, // Timestamp arrotondato (bucket 5 secondi)
} as const;
