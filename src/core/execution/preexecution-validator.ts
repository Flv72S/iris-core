/**
 * Pre-Execution Validation Pipeline — Fase 7.2a
 *
 * Controlli prima dell'esecuzione, in ordine: kill-switch → guardrail → stato incoerente.
 * Ogni fase può bloccare con una reason; la prima che fallisce vince.
 */

import type { ExecutionAction, ExecutionActionType } from './ExecutionAction';
import type { ExecutionContext } from './ExecutionContext';
import type { ExecutionResult } from './ExecutionResult';
import type { ExecutionGuardrail } from './guardrails/ExecutionGuardrail';
import {
  isExecutionEnabled,
  EXECUTION_ENGINE_COMPONENT_ID,
  SEND_NOTIFICATION_COMPONENT_ID,
  SCHEDULE_EVENT_COMPONENT_ID,
  BLOCK_INPUT_COMPONENT_ID,
  DEFER_MESSAGE_COMPONENT_ID,
} from './kill-switch/ExecutionKillSwitch';

/** Fase della pipeline che ha negato l'esecuzione. */
export type PreExecutionBlockPhase = 'KILL_SWITCH' | 'GUARDRAIL' | 'STATE';

/** Esito della validazione pre-esecuzione. */
export type PreExecutionValidationResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string; readonly phase: PreExecutionBlockPhase };

/** Checker di coerenza stato: null = ok, string = motivo di incoerenza. */
export type PreExecutionStateChecker = (
  action: ExecutionAction,
  context: ExecutionContext
) => string | null;

/** Opzioni per la pipeline di validazione. */
export interface PreExecutionValidatorOptions {
  readonly guardrails: readonly ExecutionGuardrail[];
  readonly stateCheckers?: readonly PreExecutionStateChecker[];
}

const ACTION_TYPE_TO_COMPONENT_ID: Record<ExecutionActionType, string> = {
  SEND_NOTIFICATION: SEND_NOTIFICATION_COMPONENT_ID,
  SCHEDULE_EVENT: SCHEDULE_EVENT_COMPONENT_ID,
  BLOCK_INPUT: BLOCK_INPUT_COMPONENT_ID,
  DEFER_MESSAGE: DEFER_MESSAGE_COMPONENT_ID,
};

/**
 * Verifica kill-switch: engine e componente per il tipo di azione.
 * Restituisce reason se disabilitato, null se ok.
 */
function checkKillSwitch(
  action: ExecutionAction,
  context: ExecutionContext
): string | null {
  const registry = context.registry;
  if (!isExecutionEnabled(registry, EXECUTION_ENGINE_COMPONENT_ID)) {
    return 'Execution engine disabled';
  }
  const componentId = ACTION_TYPE_TO_COMPONENT_ID[action.type];
  if (!isExecutionEnabled(registry, componentId)) {
    return `Action type ${action.type} disabled`;
  }
  return null;
}

/**
 * Esegue la pipeline di validazione pre-esecuzione.
 * Ordine: 1) kill-switch, 2) guardrail, 3) stato incoerente.
 */
export function validatePreExecution(
  action: ExecutionAction,
  context: ExecutionContext,
  options: PreExecutionValidatorOptions
): PreExecutionValidationResult {
  const killReason = checkKillSwitch(action, context);
  if (killReason !== null) {
    return Object.freeze({ allowed: false, reason: killReason, phase: 'KILL_SWITCH' });
  }

  for (const guardrail of options.guardrails) {
    const result: ExecutionResult | null = guardrail.check(action, context);
    if (result !== null) {
      const reason =
        result.status === 'BLOCKED' || result.status === 'SKIPPED'
          ? result.reason
          : 'Guardrail blocked';
      return Object.freeze({ allowed: false, reason, phase: 'GUARDRAIL' });
    }
  }

  const stateCheckers = options.stateCheckers ?? [];
  for (const check of stateCheckers) {
    const reason = check(action, context);
    if (reason !== null) {
      return Object.freeze({ allowed: false, reason, phase: 'STATE' });
    }
  }

  return Object.freeze({ allowed: true });
}

/** State checker di base: action id non vuoto, requestedAt <= now. */
export const defaultStateCheckers: readonly PreExecutionStateChecker[] = Object.freeze([
  (action: ExecutionAction, context: ExecutionContext): string | null => {
    if (action.id === undefined || action.id === '') {
      return 'Action id is missing or empty';
    }
    if (action.requestedAt > context.now) {
      return 'Action requestedAt is in the future';
    }
    return null;
  },
]);
