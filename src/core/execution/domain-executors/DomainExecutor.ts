/**
 * DomainExecutor — Fase 7.1
 *
 * Esecutore per dominio. Azione atomica; esito deterministico; idempotenza per idempotencyKey.
 */

import type { ActionIntent } from '../action-intent';
import type { ExecutionResult } from '../ExecutionResult';

export interface DomainExecutor {
  /** Tipo azione gestita (es. SEND_NOTIFICATION). */
  readonly actionType: ActionIntent['actionType'];
  /**
   * Esegue l'intent. Atomico: tutto o niente.
   * Stesso intent (stesso idempotencyKey) → stesso esito (replay).
   */
  execute(intent: ActionIntent, now: number): ExecutionResult;
}
