/**
 * Thread Props Assertion Guard
 * 
 * STEP 5.3 — Validazione props strict per thread
 * 
 * Riferimenti vincolanti:
 * - IRIS_UI_Semantic_Freeze_STEP5.1.5_v1.0.md
 * - IRIS_STEP5.3_Checklist_Bloccante.md
 * 
 * Vincoli:
 * - Validazione runtime deterministica e sincrona
 * - Nessun fallback automatico
 * - Nessun tentativo di "aggiustare" i dati
 * - Fail-fast su props invalidi
 */

import type { ThreadSummary, Thread, ThreadState } from '../types';

/**
 * Valida ThreadState
 * 
 * Fail-fast se stato non valido.
 */
function assertThreadState(state: unknown): asserts state is ThreadState {
  const validStates: ThreadState[] = ['OPEN', 'PAUSED', 'CLOSED', 'ARCHIVED'];
  if (!validStates.includes(state as ThreadState)) {
    throw new Error(
      `ThreadState invalido: ${state}. ` +
      `Stati validi: ${validStates.join(', ')}`
    );
  }
}

/**
 * Valida ThreadSummary props
 * 
 * Fail-fast su props invalidi.
 * Nessun fallback, nessun aggiustamento.
 */
export function assertThreadSummaryProps(props: unknown): asserts props is ThreadSummary {
  if (!props || typeof props !== 'object') {
    throw new Error('ThreadSummary props deve essere un oggetto');
  }
  
  const p = props as Record<string, unknown>;
  
  if (typeof p.id !== 'string' || p.id.length === 0) {
    throw new Error('ThreadSummary.id deve essere una stringa non vuota');
  }
  
  if (p.title !== null && typeof p.title !== 'string') {
    throw new Error('ThreadSummary.title deve essere string o null');
  }
  
  if (!Array.isArray(p.participants)) {
    throw new Error('ThreadSummary.participants deve essere un array');
  }
  
  for (const participant of p.participants) {
    if (typeof participant !== 'string') {
      throw new Error('ThreadSummary.participants deve contenere solo stringhe');
    }
  }
  
  assertThreadState(p.state);
  
  if (typeof p.lastEventAt !== 'number' || p.lastEventAt <= 0) {
    throw new Error('ThreadSummary.lastEventAt deve essere un numero positivo (timestamp)');
  }
  
  if (typeof p.messageCount !== 'number' || p.messageCount < 0) {
    throw new Error('ThreadSummary.messageCount deve essere un numero non negativo');
  }
}

/**
 * Valida Thread props
 * 
 * Fail-fast su props invalidi.
 * Nessun fallback, nessun aggiustamento.
 */
export function assertThreadProps(props: unknown): asserts props is Thread {
  if (!props || typeof props !== 'object') {
    throw new Error('Thread props deve essere un oggetto');
  }
  
  const p = props as Record<string, unknown>;
  
  if (typeof p.id !== 'string' || p.id.length === 0) {
    throw new Error('Thread.id deve essere una stringa non vuota');
  }
  
  if (p.title !== null && typeof p.title !== 'string') {
    throw new Error('Thread.title deve essere string o null');
  }
  
  if (p.communityId !== null && typeof p.communityId !== 'string') {
    throw new Error('Thread.communityId deve essere string o null');
  }
  
  if (!Array.isArray(p.participants)) {
    throw new Error('Thread.participants deve essere un array');
  }
  
  for (const participant of p.participants) {
    if (typeof participant !== 'string') {
      throw new Error('Thread.participants deve contenere solo stringhe');
    }
  }
  
  assertThreadState(p.state);
  
  if (typeof p.createdAt !== 'number' || p.createdAt <= 0) {
    throw new Error('Thread.createdAt deve essere un numero positivo (timestamp)');
  }
  
  if (typeof p.lastEventAt !== 'number' || p.lastEventAt <= 0) {
    throw new Error('Thread.lastEventAt deve essere un numero positivo (timestamp)');
  }
}

/**
 * Valida array ThreadSummary props
 * 
 * Fail-fast su array o elementi invalidi.
 */
export function assertThreadSummaryListProps(props: unknown): asserts props is readonly ThreadSummary[] {
  if (!Array.isArray(props)) {
    throw new Error('ThreadSummary list props deve essere un array');
  }
  
  for (const item of props) {
    assertThreadSummaryProps(item);
  }
}
