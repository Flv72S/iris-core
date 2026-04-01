/**
 * UX State Projection — C.6
 * Trasformazione read-only da snapshot tecnici a stati UX leggibili.
 */

export type { UxState, UxSeverity } from './UxState';
export { UX_STATE_TYPES, type UxStateType } from './UxStateType';
export type { UxStateSnapshot } from './UxStateSnapshot';
export type { UxProjectionInput } from './UxProjectionInput';
export type { UxStateProjectionProvider } from './UxStateProjectionProvider';
export {
  UX_STATE_COMPONENT_ID,
  isUxStateProjectionEnabled,
  type UxStateRegistry,
} from './UxStateKillSwitch';
export { UxStateProjectionEngine } from './UxStateProjectionEngine';
