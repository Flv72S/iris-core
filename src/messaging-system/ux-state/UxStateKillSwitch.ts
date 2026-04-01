/**
 * UxStateKillSwitch — C.6
 * Registry e kill-switch per la proiezione UX.
 */

export const UX_STATE_COMPONENT_ID = 'ux-state-projection';

export type UxStateRegistry = Record<string, boolean>;

export function isUxStateProjectionEnabled(registry: UxStateRegistry): boolean {
  return registry[UX_STATE_COMPONENT_ID] === true;
}
