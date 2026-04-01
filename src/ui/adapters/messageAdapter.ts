/**
 * Message Adapter
 * 
 * STEP 5.2 — Adapter meccanico per dati messaggi
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

import type { MessageView, MessageState } from '../types';

/**
 * Dati backend/mock per messaggio
 * 
 * Assumiamo che i dati backend siano già:
 * - validati
 * - con timestamp arrotondati
 * - con threadId obbligatorio
 */
export interface BackendMessage {
  readonly id: string;
  readonly threadId: string;
  readonly senderAlias: string;
  readonly payload: string;
  readonly state: MessageState;
  readonly createdAt: number;
}

/**
 * Adapter: BackendMessage → MessageView
 * 
 * Conversione meccanica, nessuna logica.
 */
export function adaptMessage(data: BackendMessage): MessageView {
  return {
    id: data.id,
    threadId: data.threadId,
    senderAlias: data.senderAlias,
    payload: data.payload,
    state: data.state,
    createdAt: data.createdAt,
  };
}

/**
 * Adapter: array BackendMessage → array MessageView
 * 
 * Conversione meccanica, nessuna logica.
 */
export function adaptMessageList(data: readonly BackendMessage[]): readonly MessageView[] {
  return data.map(adaptMessage);
}
