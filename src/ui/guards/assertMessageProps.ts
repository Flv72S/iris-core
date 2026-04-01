/**
 * Message Props Assertion Guard
 * 
 * STEP 5.3 — Validazione props strict per messaggi
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

import type { MessageView, MessageState } from '../types';

/**
 * Valida MessageState
 * 
 * Fail-fast se stato non valido.
 */
function assertMessageState(state: unknown): asserts state is MessageState {
  const validStates: MessageState[] = ['DRAFT', 'SENT', 'DELIVERED', 'READ', 'ARCHIVED', 'EXPIRED'];
  if (!validStates.includes(state as MessageState)) {
    throw new Error(
      `MessageState invalido: ${state}. ` +
      `Stati validi: ${validStates.join(', ')}`
    );
  }
}

/**
 * Valida MessageView props
 * 
 * Fail-fast su props invalidi.
 * Nessun fallback, nessun aggiustamento.
 */
export function assertMessageViewProps(props: unknown): asserts props is MessageView {
  if (!props || typeof props !== 'object') {
    throw new Error('MessageView props deve essere un oggetto');
  }
  
  const p = props as Record<string, unknown>;
  
  if (typeof p.id !== 'string' || p.id.length === 0) {
    throw new Error('MessageView.id deve essere una stringa non vuota');
  }
  
  // ThreadId obbligatorio (thread-first enforcement)
  if (typeof p.threadId !== 'string' || p.threadId.length === 0) {
    throw new Error('MessageView.threadId deve essere una stringa non vuota (thread-first)');
  }
  
  if (typeof p.senderAlias !== 'string' || p.senderAlias.length === 0) {
    throw new Error('MessageView.senderAlias deve essere una stringa non vuota');
  }
  
  if (typeof p.payload !== 'string') {
    throw new Error('MessageView.payload deve essere una stringa');
  }
  
  assertMessageState(p.state);
  
  if (typeof p.createdAt !== 'number' || p.createdAt <= 0) {
    throw new Error('MessageView.createdAt deve essere un numero positivo (timestamp)');
  }
}

/**
 * Valida array MessageView props
 * 
 * Fail-fast su array o elementi invalidi.
 */
export function assertMessageViewListProps(props: unknown): asserts props is readonly MessageView[] {
  if (!Array.isArray(props)) {
    throw new Error('MessageView list props deve essere un array');
  }
  
  for (const item of props) {
    assertMessageViewProps(item);
  }
}
