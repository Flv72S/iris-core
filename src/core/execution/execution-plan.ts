/**
 * Execution Plan — Fase 7.1a
 *
 * Traduce ResolutionResult → lista ordinata di ActionIntent.
 * Ordine deterministico; batching sicuro; priorità esplicite; nessuna logica cognitiva.
 */

import type { ActionIntent, ResolutionStatusAllowed } from './action-intent';
import { isResolutionStatusExecutable } from './action-intent';
import type { ExecutionActionType } from './ExecutionAction';

/** Input minimo per costruire il piano (da ResolutionResult). */
export type ResolutionResultSnapshot = {
  readonly resolutionId: string;
  readonly status: string;
  readonly executionRequestId?: string | null;
};

/** Azione candidata prima della traduzione in ActionIntent. Priorità opzionale (esplicita). */
export type CandidateAction = {
  readonly actionType: ExecutionActionType;
  readonly payload: unknown;
  readonly sourceFeature: string;
  readonly requestedAt: number;
  readonly idempotencyKey?: string | null;
  /** Priorità esplicita: minore = prima in lista. Se assente, usa DEFAULT_ACTION_TYPE_PRIORITY. */
  readonly priority?: number;
};

/** Priorità di default per tipo azione (ordine deterministico). Minore = eseguita prima. */
export const DEFAULT_ACTION_TYPE_PRIORITY: Readonly<Record<ExecutionActionType, number>> =
  Object.freeze({
    SEND_NOTIFICATION: 10,
    SCHEDULE_EVENT: 20,
    BLOCK_INPUT: 30,
    DEFER_MESSAGE: 40,
  });

/** Piano di esecuzione: lista ordinata e immutabile di ActionIntent. */
export type ExecutionPlan = {
  readonly intents: readonly ActionIntent[];
};

/** Opzioni per batching sicuro. */
export type ExecutionPlanOptions = {
  /** Massimo numero di intent nel piano (default 64). Batching sicuro. */
  readonly maxIntents?: number;
};

const DEFAULT_MAX_INTENTS = 64;

/**
 * Costruisce un ExecutionPlan da ResolutionResult (snapshot) e lista di candidati.
 * Deterministico: stesso input → stesso ordine e stessa lista.
 *
 * - Se status non è ALLOWED o FORCED → intents = [].
 * - Ordine: prima per priority (esplicita o DEFAULT_ACTION_TYPE_PRIORITY), poi sourceFeature, poi requestedAt.
 * - Batching: al più maxIntents intent (default 64).
 */
export function buildExecutionPlan(
  resolution: ResolutionResultSnapshot,
  candidates: readonly CandidateAction[],
  options?: ExecutionPlanOptions
): ExecutionPlan {
  if (!isResolutionStatusExecutable(resolution.status)) {
    return Object.freeze({ intents: Object.freeze([]) });
  }

  const resolutionStatus = resolution.status as ResolutionStatusAllowed;
  const executionRequestId = resolution.executionRequestId ?? null;
  const maxIntents = options?.maxIntents ?? DEFAULT_MAX_INTENTS;

  const withPriority = candidates.map((c, index) => ({
    candidate: c,
    index,
    priority: c.priority ?? DEFAULT_ACTION_TYPE_PRIORITY[c.actionType],
  }));

  const sorted = [...withPriority].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const sfA = a.candidate.sourceFeature;
    const sfB = b.candidate.sourceFeature;
    if (sfA !== sfB) return sfA < sfB ? -1 : 1;
    return a.candidate.requestedAt - b.candidate.requestedAt || a.index - b.index;
  });

  const intents: ActionIntent[] = [];
  for (let i = 0; i < Math.min(sorted.length, maxIntents); i++) {
    const { candidate, index } = sorted[i];
    const intentId = `${resolution.resolutionId}:${index}:${candidate.sourceFeature}:${candidate.requestedAt}`;
    intents.push(
      Object.freeze({
        intentId,
        resolutionId: resolution.resolutionId,
        resolutionStatus,
        executionRequestId,
        actionType: candidate.actionType,
        payload: candidate.payload,
        sourceFeature: candidate.sourceFeature,
        requestedAt: candidate.requestedAt,
        idempotencyKey: candidate.idempotencyKey ?? null,
      })
    );
  }

  return Object.freeze({ intents: Object.freeze(intents) });
}
