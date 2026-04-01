/**
 * Kill-Switch Propagation Model — Fase 7.3a
 *
 * Garantisce stop atomico cross-executor: un solo registry condiviso (stessa riferimento),
 * check a inizio di ogni esecuzione, trigger che muta il registry → tutti gli executor
 * vedono lo stop al prossimo check.
 */

import { GLOBAL_KILL_SWITCH_KEY } from './execution-killswitch';
import type { ExecutionKillSwitchRegistry } from './kill-switch/ExecutionKillSwitch';
import { isExecutionEnabled } from './kill-switch/ExecutionKillSwitch';

/**
 * Crea un registry mutabile condiviso per tutti gli executor.
 * Per stop atomico cross-executor: passare lo stesso oggetto restituito a ogni
 * ExecutionContext / ExecutionEngine / executeFromResolution.
 * Una volta che triggerGlobalStop(registry) viene chiamato, ogni executor che
 * legge context.registry al successivo check vede lo stop.
 */
export function createSharedRegistry(
  initial?: Readonly<Record<string, boolean>>
): ExecutionKillSwitchRegistry {
  const registry: ExecutionKillSwitchRegistry = { ...initial };
  return registry;
}

/**
 * Attiva lo stop globale: disabilita l'engine per tutti gli executor che usano questo registry.
 * Il registry deve essere mutabile (es. creato con createSharedRegistry).
 * Propagazione: immediata per riferimento condiviso (stesso oggetto); tutti i successivi
 * isExecutionEnabled(registry, GLOBAL_KILL_SWITCH_KEY) restituiranno false.
 */
export function triggerGlobalStop(registry: ExecutionKillSwitchRegistry): void {
  (registry as Record<string, boolean>)[GLOBAL_KILL_SWITCH_KEY] = false;
}

/**
 * Verifica se lo stop globale è attivo su questo registry.
 */
export function isGlobalStopActive(registry: ExecutionKillSwitchRegistry): boolean {
  return !isExecutionEnabled(registry, GLOBAL_KILL_SWITCH_KEY);
}

/**
 * Disattiva lo stop globale (riabilita l'engine). Registry deve essere mutabile.
 */
export function clearGlobalStop(registry: ExecutionKillSwitchRegistry): void {
  (registry as Record<string, boolean>)[GLOBAL_KILL_SWITCH_KEY] = true;
}

/**
 * Contratto di propagazione: per garantire stop atomico cross-executor,
 * ogni percorso di esecuzione deve:
 * 1) ricevere lo stesso riferimento a ExecutionKillSwitchRegistry (createSharedRegistry + pass-through),
 * 2) verificare il registry all'ingresso di ogni execute (ExecutionEngine / executeFromResolution già lo fanno),
 * 3) non trattenere snapshot immutabili del registry tra una chiamata e l'altra.
 * In ambiente single-thread sync, un solo triggerGlobalStop(registry) è sufficiente
 * perché il prossimo check di qualsiasi executor leggerà il valore aggiornato.
 */
export const PROPAGATION_CONTRACT = Object.freeze({
  sharedRegistry: 'Same registry reference for all executors',
  checkAtEntry: 'Check registry at start of every execute',
  noStaleSnapshot: 'Do not hold immutable snapshot across executions',
});
