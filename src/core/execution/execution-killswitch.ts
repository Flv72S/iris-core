/**
 * Execution Kill-Switch — Fase 7.3
 *
 * Tre livelli: globale → per feature → per azione (tipo e/o id).
 * Un solo livello OFF blocca l'esecuzione. Registry unico, chiavi convenzionali.
 */

import type { ExecutionAction, ExecutionActionType } from './ExecutionAction';
import {
  isExecutionEnabled,
  EXECUTION_ENGINE_COMPONENT_ID,
  SEND_NOTIFICATION_COMPONENT_ID,
  SCHEDULE_EVENT_COMPONENT_ID,
  BLOCK_INPUT_COMPONENT_ID,
  DEFER_MESSAGE_COMPONENT_ID,
} from './kill-switch/ExecutionKillSwitch';
import type { ExecutionKillSwitchRegistry } from './kill-switch/ExecutionKillSwitch';

/** Chiave registry per kill-switch globale (engine). */
export const GLOBAL_KILL_SWITCH_KEY = EXECUTION_ENGINE_COMPONENT_ID;

/** Prefisso chiave per kill-switch per feature. Chiave effettiva: `FEATURE_KILL_SWITCH_PREFIX + sourceFeature`. */
export const FEATURE_KILL_SWITCH_PREFIX = 'feature:';

/** Prefisso chiave per kill-switch per singola azione (id). Chiave effettiva: `ACTION_ID_KILL_SWITCH_PREFIX + actionId`. */
export const ACTION_ID_KILL_SWITCH_PREFIX = 'actionId:';

const ACTION_TYPE_TO_COMPONENT_ID: Record<ExecutionActionType, string> = {
  SEND_NOTIFICATION: SEND_NOTIFICATION_COMPONENT_ID,
  SCHEDULE_EVENT: SCHEDULE_EVENT_COMPONENT_ID,
  BLOCK_INPUT: BLOCK_INPUT_COMPONENT_ID,
  DEFER_MESSAGE: DEFER_MESSAGE_COMPONENT_ID,
};

/**
 * Chiave registry per kill-switch per feature.
 * Impostare registry[getFeatureKillSwitchKey(feature)] = false per disabilitare quella feature.
 */
export function getFeatureKillSwitchKey(sourceFeature: string): string {
  return FEATURE_KILL_SWITCH_PREFIX + sourceFeature;
}

/**
 * Chiave registry per kill-switch per tipo di azione (SEND_NOTIFICATION, …).
 * Corrisponde ai component ID esistenti.
 */
export function getActionTypeKillSwitchKey(actionType: ExecutionActionType): string {
  return ACTION_TYPE_TO_COMPONENT_ID[actionType];
}

/**
 * Chiave registry per kill-switch per singola azione (istanza per id).
 * Impostare registry[getActionIdKillSwitchKey(actionId)] = false per bloccare quell'azione.
 */
export function getActionIdKillSwitchKey(actionId: string): string {
  return ACTION_ID_KILL_SWITCH_PREFIX + actionId;
}

/**
 * Verifica se l'esecuzione è consentita per questa azione.
 * Ordine: 1) globale, 2) feature (sourceFeature), 3) tipo azione, 4) id azione.
 * Il primo livello OFF restituisce false.
 */
export function isExecutionAllowedForAction(
  action: ExecutionAction,
  registry: ExecutionKillSwitchRegistry
): boolean {
  if (!isExecutionEnabled(registry, GLOBAL_KILL_SWITCH_KEY)) {
    return false;
  }
  if (!isExecutionEnabled(registry, getFeatureKillSwitchKey(action.sourceFeature))) {
    return false;
  }
  if (!isExecutionEnabled(registry, getActionTypeKillSwitchKey(action.type))) {
    return false;
  }
  if (!isExecutionEnabled(registry, getActionIdKillSwitchKey(action.id))) {
    return false;
  }
  return true;
}

/**
 * Restituisce il motivo del blocco se l'esecuzione non è consentita, null se consentita.
 * Utile per audit e pre-execution validation.
 */
export function getExecutionBlockReason(
  action: ExecutionAction,
  registry: ExecutionKillSwitchRegistry
): string | null {
  if (!isExecutionEnabled(registry, GLOBAL_KILL_SWITCH_KEY)) {
    return 'Execution engine disabled (global kill-switch)';
  }
  if (!isExecutionEnabled(registry, getFeatureKillSwitchKey(action.sourceFeature))) {
    return `Feature ${action.sourceFeature} disabled (feature kill-switch)`;
  }
  if (!isExecutionEnabled(registry, getActionTypeKillSwitchKey(action.type))) {
    return `Action type ${action.type} disabled (action-type kill-switch)`;
  }
  if (!isExecutionEnabled(registry, getActionIdKillSwitchKey(action.id))) {
    return `Action ${action.id} disabled (action-id kill-switch)`;
  }
  return null;
}

/** Re-export per uso unificato. */
export {
  EXECUTION_ENGINE_COMPONENT_ID,
  SEND_NOTIFICATION_COMPONENT_ID,
  SCHEDULE_EVENT_COMPONENT_ID,
  BLOCK_INPUT_COMPONENT_ID,
  DEFER_MESSAGE_COMPONENT_ID,
  isExecutionEnabled,
  type ExecutionKillSwitchRegistry,
} from './kill-switch/ExecutionKillSwitch';
