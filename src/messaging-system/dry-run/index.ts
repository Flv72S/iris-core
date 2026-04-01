/**
 * Dry-Run / Simulation - C.4.D
 * Simula cosa accadrebbe senza eseguire nulla. Preview, explainability, debug, conferma utente.
 */

export { DRY_RUN_ACTION_TYPES, type DryRunActionType } from './DryRunActionType';
export type { DryRunStep } from './DryRunStep';
export type { DryRunResult } from './DryRunResult';
export type { DryRunSnapshot } from './DryRunSnapshot';
export type { DryRunSimulator } from './DryRunSimulator';
export {
  DRY_RUN_COMPONENT_ID,
  isDryRunEnabled,
  type DryRunRegistry,
} from './DryRunKillSwitch';
export { DryRunEngine } from './DryRunEngine';
