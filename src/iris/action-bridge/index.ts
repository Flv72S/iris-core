/**
 * IRIS 12.0 — Action Bridge
 * Confine dichiarativo tra Decision Selection e Execution. Nessuna esecuzione.
 */

export { IRIS_ACTION_INTENT_TYPES, type IrisActionIntentType } from './IrisActionIntentType';
export type { IrisActionIntent } from './IrisActionIntent';
export type { IrisActionIntentSnapshot } from './IrisActionIntentSnapshot';
export type { IrisActionPlanSnapshot } from './IrisActionPlanSnapshot';
export type { IrisActionIntentProvider } from './IrisActionIntentProvider';
export {
  IRIS_ACTION_BRIDGE_COMPONENT_ID,
  isActionBridgeEnabled,
  type ActionBridgeRegistry,
} from './IrisActionBridgeKillSwitch';
export { IrisActionIntentEngine } from './IrisActionIntentEngine';
