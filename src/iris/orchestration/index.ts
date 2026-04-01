/**
 * IRIS 9.1 — Orchestration Layer
 * Coordinamento pipeline; nessuna decisione, nessun output utente finale.
 */

export type { IrisOrchestrationPlan } from './IrisOrchestrationPlan';
export type { IrisOrchestrationResult } from './IrisOrchestrationResult';
export type { IrisOrchestrator } from './IrisOrchestrator';
export {
  IRIS_ORCHESTRATION_COMPONENT_ID,
  isOrchestrationEnabled,
  type OrchestrationRegistry,
} from './IrisOrchestrationKillSwitch';
export { IrisOrchestrationEngine } from './IrisOrchestrationEngine';
