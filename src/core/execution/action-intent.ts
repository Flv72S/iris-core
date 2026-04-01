/**
 * ActionIntent — Fase 7.1
 *
 * Intent formale per esecuzione. Input solo da ResolutionResult (status ALLOWED o FORCED).
 * Nessuna decisione autonoma; idempotenza tramite idempotencyKey; azioni atomiche.
 */

import type { ExecutionActionType } from './ExecutionAction';

/** Status di risoluzione che abilita l'esecuzione (Fase 6.5). */
export type ResolutionStatusAllowed = 'ALLOWED' | 'FORCED';

/**
 * Intent immutabile: cosa eseguire e con quale autorizzazione.
 * Deve essere costruito solo quando ResolutionResult.status è ALLOWED o FORCED.
 */
export type ActionIntent = {
  readonly intentId: string;
  readonly resolutionId: string;
  readonly resolutionStatus: ResolutionStatusAllowed;
  readonly executionRequestId: string | null;
  readonly actionType: ExecutionActionType;
  readonly payload: unknown;
  readonly sourceFeature: string;
  readonly requestedAt: number;
  /** Chiave per idempotenza e replay: stesso key → stesso esito (skip o execute once). */
  readonly idempotencyKey: string | null;
};

/**
 * Verifica se lo status di risoluzione consente l'esecuzione.
 */
export function isResolutionStatusExecutable(status: string): status is ResolutionStatusAllowed {
  return status === 'ALLOWED' || status === 'FORCED';
}
