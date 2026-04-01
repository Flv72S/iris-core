/**
 * Thread Adapter
 * 
 * STEP 5.2 — Adapter meccanico per dati thread
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md
 * - IRIS_STEP5.2_Data_Connection_Map_v1.0.md
 * 
 * Vincoli:
 * - Nessuna logica
 * - Nessuna decisione
 * - Nessuna semantica
 * - Solo conversione meccanica dati → tipi UI
 */

import type { ThreadSummary, Thread, ThreadState } from '../types';

export interface BackendThreadSummary {
  readonly id: string;
  readonly title: string | null;
  readonly participants: readonly string[];
  readonly state: ThreadState;
  readonly lastEventAt: number;
  readonly messageCount: number;
}

export interface BackendThread {
  readonly id: string;
  readonly title: string | null;
  readonly communityId: string | null;
  readonly participants: readonly string[];
  readonly state: ThreadState;
  readonly createdAt: number;
  readonly lastEventAt: number;
}

export function adaptThreadSummary(data: BackendThreadSummary): ThreadSummary {
  return {
    id: data.id,
    title: data.title,
    participants: data.participants,
    state: data.state,
    lastEventAt: data.lastEventAt,
    messageCount: data.messageCount,
  };
}

export function adaptThread(data: BackendThread): Thread {
  return {
    id: data.id,
    title: data.title,
    communityId: data.communityId,
    participants: data.participants,
    state: data.state,
    createdAt: data.createdAt,
    lastEventAt: data.lastEventAt,
  };
}

export function adaptThreadSummaryList(data: readonly BackendThreadSummary[]): readonly ThreadSummary[] {
  return data.map(adaptThreadSummary);
}
